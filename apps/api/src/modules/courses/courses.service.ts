import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import { CreateSchoolDto, UpdateSchoolDto } from './dto';

const cleanList = (xs: string[] = []): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of xs) {
    const v = raw.trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out;
};

/**
 * Per-college school/department catalog. Read access is tenant-scoped (own
 * college) for officers/admins to populate forms; mutations are College-Admin
 * (self-serve) or Platform-Admin (managing any college).
 */
@Injectable()
export class SchoolsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  listForCollege(collegeId: string) {
    return this.prisma.collegeSchool.findMany({ where: { collegeId }, orderBy: { name: 'asc' } });
  }

  async create(collegeId: string, dto: CreateSchoolDto) {
    const college = await this.prisma.college.findUnique({ where: { id: collegeId } });
    if (!college) throw new NotFoundException('College not found');
    const name = dto.name.trim();
    const dup = await this.prisma.collegeSchool.findFirst({ where: { collegeId, name } });
    if (dup) throw new BadRequestException(`School already exists: ${name}`);
    return this.prisma.collegeSchool.create({
      data: { collegeId, name, programmes: cleanList(dto.programmes) },
    });
  }

  async update(collegeId: string, id: string, dto: UpdateSchoolDto) {
    const school = await this.prisma.collegeSchool.findFirst({ where: { id, collegeId } });
    if (!school) throw new NotFoundException('School not found');
    const name = dto.name?.trim();
    if (name && name !== school.name) {
      const dup = await this.prisma.collegeSchool.findFirst({
        where: { collegeId, name, id: { not: id } },
      });
      if (dup) throw new BadRequestException(`School already exists: ${name}`);
    }
    return this.prisma.collegeSchool.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(dto.programmes ? { programmes: cleanList(dto.programmes) } : {}),
      },
    });
  }

  async remove(collegeId: string, id: string) {
    const school = await this.prisma.collegeSchool.findFirst({ where: { id, collegeId } });
    if (!school) throw new NotFoundException('School not found');
    await this.prisma.collegeSchool.delete({ where: { id } });
    return { success: true };
  }
}
