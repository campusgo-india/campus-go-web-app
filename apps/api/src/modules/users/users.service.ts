import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import { EmailService } from '../email/email.service';
import { renderFormalEmail } from '../notifications/email-templates';
import { CreateUserDto, UpdateUserDto } from './dto';

function formatRole(role: string): string {
  return role
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * All methods are tenant-scoped: collegeId comes from the authenticated
 * College Admin's JWT (never from the request body).
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private webOrigin(): string {
    return this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
  }

  /** Best-effort, fire-and-forget — a failed send must never block the caller. */
  private sendCredentialsEmail(
    to: string,
    subject: string,
    intro: string,
    fields: { label: string; value: string }[],
    collegeName: string,
  ): void {
    void this.email
      .sendForCollege(null, {
        to,
        subject,
        html: renderFormalEmail({
          collegeName,
          greeting: 'Hi,',
          intro,
          fields,
          note: "You'll be asked to set a new password after logging in.",
          ctaLabel: 'Log in to CampusGo',
          ctaUrl: `${this.webOrigin()}/login`,
        }),
      })
      .catch((err) => this.logger.error(`Failed to email credentials to ${to}`, err));
  }

  async create(collegeId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already in use');

    // Use the password the admin typed, or generate a temp one.
    const passwordGenerated = !dto.password;
    const password = dto.password ?? randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        collegeId,
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        phone: dto.phone,
        assignedProgrammes: dto.assignedProgrammes ?? [],
        passwordHash,
      },
    });
    // tempPassword is only returned (and emailed) when WE generated it — if
    // the admin typed their own password, they already know it and it isn't
    // ours to send over email.
    if (passwordGenerated) {
      const college = await this.prisma.college.findUnique({
        where: { id: collegeId },
        select: { name: true },
      });
      const collegeName = college?.name ?? 'your college';
      this.sendCredentialsEmail(
        dto.email,
        `Your CampusGo account — ${collegeName}`,
        `An account has been created for you on CampusGo, ${collegeName}'s placement platform, as ${formatRole(dto.role)}.`,
        [
          { label: 'Login email', value: dto.email },
          { label: 'Temporary password', value: password },
        ],
        collegeName,
      );
    }
    return {
      user: this.publicUser(user),
      passwordGenerated,
      tempPassword: passwordGenerated ? password : null,
    };
  }

  async list(collegeId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        collegeId,
        role: {
          in: [
            'COLLEGE_ADMIN',
            'PLACEMENT_OFFICER',
            'PLACEMENT_COORDINATOR',
            'MANAGEMENT',
            'TRAINING',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.publicUser(u));
  }

  async findOne(collegeId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, collegeId } });
    if (!user) throw new NotFoundException('User not found');
    return this.publicUser(user);
  }

  async update(collegeId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(collegeId, id);
    const user = await this.prisma.user.update({ where: { id }, data: dto as never });
    return this.publicUser(user);
  }

  async deactivate(collegeId: string, id: string) {
    await this.findOne(collegeId, id);
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  /**
   * Generates a brand-new temp password for a teammate who lost the one shown
   * at creation — there's no way to recover the original (it's only ever
   * stored as a bcrypt hash). Shown once, same as on create; forces
   * mustChangePassword and revokes existing sessions so the old password
   * (if the teammate still had it) stops working immediately.
   */
  async resetPassword(collegeId: string, id: string) {
    const user = await this.findOne(collegeId, id);
    const tempPassword = randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
      select: { name: true },
    });
    const collegeName = college?.name ?? 'your college';
    this.sendCredentialsEmail(
      user.email,
      `Your CampusGo password has been reset — ${collegeName}`,
      'Your CampusGo password was just reset by your college admin. Use the temporary password below to log in.',
      [
        { label: 'Login email', value: user.email },
        { label: 'New temporary password', value: tempPassword },
      ],
      collegeName,
    );

    return { tempPassword };
  }

  private publicUser(u: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    phone: string | null;
    assignedProgrammes: string[];
    isActive: boolean;
    lastLoginAt: Date | null;
  }) {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      phone: u.phone,
      assignedProgrammes: u.assignedProgrammes,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
    };
  }
}
