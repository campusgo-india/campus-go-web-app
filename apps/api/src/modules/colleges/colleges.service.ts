import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserRole } from '@campusgo/shared';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import { decryptSecret } from '../../common/crypto';
import { EmailService } from '../email/email.service';
import { CreateCollegeDto, UpdateCollegeDto, UpdateEmailSettingsDto } from './dto';

@Injectable()
export class CollegesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateCollegeDto) {
    const existing = await this.prisma.college.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Slug already in use');

    // Use the password the platform admin typed, or generate a temp one.
    const passwordGenerated = !dto.adminPassword;
    const adminPassword = dto.adminPassword ?? randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const college = await this.prisma.$transaction(async (tx) => {
      const c = await tx.college.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          city: dto.city,
          state: dto.state,
        },
      });
      await tx.user.create({
        data: {
          collegeId: c.id,
          email: dto.adminEmail,
          passwordHash,
          fullName: dto.adminFullName,
          role: UserRole.COLLEGE_ADMIN,
          // The founding admin is the College Head by default (sees all POCs +
          // per-teammate recruiter tracking). Platform Admin can reassign later.
          isCollegeHead: true,
        },
      });
      // Optional initial school catalog.
      const schools = (dto.schools ?? [])
        .map((sc) => ({
          collegeId: c.id,
          name: sc.name.trim(),
          programmes: [...new Set((sc.programmes ?? []).map((p) => p.trim()).filter(Boolean))],
        }))
        .filter((sc) => sc.name);
      if (schools.length) await tx.collegeSchool.createMany({ data: schools });
      return c;
    });

    // Phase 4: email the admin a set-password link instead of returning a temp password.
    // adminTempPassword is only returned when WE generated it — if the platform
    // admin set their own, they already know it and we don't echo it back.
    return {
      college,
      passwordGenerated,
      adminTempPassword: passwordGenerated ? adminPassword : null,
    };
  }

  async list(page = 1, limit = 20, search?: string) {
    const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};
    const [items, total] = await Promise.all([
      this.prisma.college.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.college.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const college = await this.prisma.college.findUnique({ where: { id } });
    if (!college) throw new NotFoundException('College not found');
    return college;
  }

  async update(id: string, dto: UpdateCollegeDto) {
    await this.findOne(id);
    return this.prisma.college.update({ where: { id }, data: dto as never });
  }

  async setLogo(id: string, logoUrl: string | null) {
    await this.findOne(id);
    return this.prisma.college.update({ where: { id }, data: { logoUrl } });
  }

  /**
   * Resets the college's super-admin password (the earliest-created COLLEGE_ADMIN).
   * We never store/return the original password (it's a one-way bcrypt hash), so
   * "recover access" means issuing a NEW temp password, forcing a change on next
   * login, and revoking existing sessions.
   */
  async resetAdminPassword(id: string, newPassword?: string) {
    await this.findOne(id);
    const admin = await this.prisma.user.findFirst({
      where: { collegeId: id, role: UserRole.COLLEGE_ADMIN },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) throw new NotFoundException('This college has no admin account');

    const passwordGenerated = !newPassword;
    const password = newPassword ?? randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash, mustChangePassword: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: admin.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      adminId: admin.id,
      adminEmail: admin.email,
      passwordGenerated,
      // Only returned when WE generated it — if the admin typed one they know it.
      tempPassword: passwordGenerated ? password : null,
    };
  }

  async setStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    const college = await this.prisma.college.update({
      where: { id },
      data: { isActive },
    });
    if (!isActive) {
      // Revoke all sessions for users of a suspended college.
      const users = await this.prisma.user.findMany({
        where: { collegeId: id },
        select: { id: true },
      });
      await this.prisma.refreshToken.updateMany({
        where: { userId: { in: users.map((u) => u.id) }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return college;
  }

  // ─────────────── Per-college email settings ───────────────

  async getEmailSettings(id: string) {
    await this.findOne(id);
    const settings = await this.prisma.collegeEmailSettings.findUnique({ where: { collegeId: id } });
    if (!settings) {
      return {
        collegeId: id,
        enabled: false,
        smtpHost: null,
        smtpPort: null,
        smtpSecure: true,
        smtpUser: null,
        hasPassword: false,
        fromEmail: null,
        fromName: null,
        replyTo: null,
        verifiedAt: null,
        lastTestError: null,
      };
    }
    const { smtpPasswordEnc, ...rest } = settings;
    return { ...rest, hasPassword: !!smtpPasswordEnc };
  }

  // Any SMTP-affecting change invalidates the previous test — verifiedAt/
  // lastTestError reset to null so the switch (which requires verifiedAt) locks
  // again until a fresh test passes.
  async upsertEmailSettings(id: string, dto: UpdateEmailSettingsDto) {
    await this.findOne(id);
    const existing = await this.prisma.collegeEmailSettings.findUnique({ where: { collegeId: id } });
    const passwordEnc = dto.smtpPassword
      ? this.emailService.encryptPassword(dto.smtpPassword)
      : (existing?.smtpPasswordEnc ?? null);

    const shared = {
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpSecure: dto.smtpSecure,
      smtpUser: dto.smtpUser,
      smtpPasswordEnc: passwordEnc,
      fromEmail: dto.fromEmail,
      fromName: dto.fromName ?? null,
      replyTo: dto.replyTo ?? null,
    };
    const updated = await this.prisma.collegeEmailSettings.upsert({
      where: { collegeId: id },
      create: { collegeId: id, ...shared },
      update: { ...shared, verifiedAt: null, lastTestError: null },
    });
    const { smtpPasswordEnc: _enc, ...rest } = updated;
    return { ...rest, hasPassword: !!passwordEnc };
  }

  async sendTestEmail(id: string, to?: string) {
    const college = await this.findOne(id);
    const settings = await this.prisma.collegeEmailSettings.findUnique({ where: { collegeId: id } });
    if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPasswordEnc) {
      throw new BadRequestException('Save SMTP settings (including a password) before sending a test.');
    }

    const result = await this.emailService.sendTest(
      {
        host: settings.smtpHost,
        port: settings.smtpPort ?? 587,
        secure: settings.smtpSecure,
        user: settings.smtpUser,
        pass: decryptSecret(settings.smtpPasswordEnc),
        fromEmail: settings.fromEmail ?? settings.smtpUser,
        fromName: settings.fromName,
        replyTo: settings.replyTo,
      },
      to ?? college.contactEmail,
    );

    await this.prisma.collegeEmailSettings.update({
      where: { collegeId: id },
      data: result.success
        ? { verifiedAt: new Date(), lastTestError: null }
        : { lastTestError: result.error ?? 'Send failed' },
    });

    return result;
  }

  async setEmailEnabled(id: string, enabled: boolean) {
    await this.findOne(id);
    const settings = await this.prisma.collegeEmailSettings.findUnique({ where: { collegeId: id } });
    if (!settings) {
      throw new BadRequestException('Configure SMTP settings before enabling college email.');
    }
    if (enabled && !settings.verifiedAt) {
      throw new BadRequestException('Send a successful test email before enabling college email.');
    }
    const updated = await this.prisma.collegeEmailSettings.update({
      where: { collegeId: id },
      data: { enabled },
    });
    const { smtpPasswordEnc, ...rest } = updated;
    return { ...rest, hasPassword: !!smtpPasswordEnc };
  }
}
