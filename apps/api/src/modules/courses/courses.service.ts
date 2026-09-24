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
      data: {
        collegeId,
        name,
        programmes: cleanList(dto.programmes),
        ...(dto.degreeLevel ? { degreeLevel: dto.degreeLevel } : {}),
      },
    });
  }

  async update(collegeId: string, id: string, dto: UpdateSchoolDto) {
    const school = await this.prisma.collegeSchool.findFirst({ where: { id, collegeId } });
    if (!school) throw new NotFoundException('School not found');
    const name = dto.name?.trim();
    const renamingSchool = !!name && name !== school.name;
    if (renamingSchool) {
      const dup = await this.prisma.collegeSchool.findFirst({
        where: { collegeId, name, id: { not: id } },
      });
      if (dup) throw new BadRequestException(`School already exists: ${name}`);
    }
    const finalSchoolName = name ?? school.name;

    // { oldProgramme: newProgramme } for entries the caller actually edited in
    // place — a comma-separated re-type of `programmes` can't tell a rename
    // apart from removing one and adding another, so the caller must say so
    // explicitly. No-ops and blanks are dropped defensively.
    const programmeRenames = Object.entries(dto.programmeRenames ?? {})
      .map(([from, to]) => [from.trim(), (to ?? '').trim()] as const)
      .filter(([from, to]) => from && to && from !== to);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.collegeSchool.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(dto.programmes ? { programmes: cleanList(dto.programmes) } : {}),
          ...(dto.degreeLevel ? { degreeLevel: dto.degreeLevel } : {}),
        },
      });

      // Student.school, Student.programme and Job.eligible{Schools,Programmes}
      // all store these names as plain strings (not foreign keys), matched
      // against the catalog by name. Without cascading, a rename silently
      // orphans every *current* student/job that referenced the old name —
      // they fall back to defaults (e.g. UG on the placement dashboard) or
      // drop out of eligibility matching.
      //
      // Alumni is deliberately NOT touched anywhere below — it's a historical
      // snapshot of what the school/programme was called when that person
      // graduated (names change year to year), not a live catalog reference.
      if (renamingSchool) {
        await tx.student.updateMany({
          where: { collegeId, school: school.name },
          data: { school: name! },
        });
        await tx.$executeRaw`
          UPDATE jobs
          SET eligible_schools = array_replace(eligible_schools, ${school.name}, ${name})
          WHERE college_id = ${collegeId} AND ${school.name} = ANY(eligible_schools)
        `;

        // A school with zero configured sub-programmes uses its own name as
        // the implicit programme (see the student form's "this school has no
        // sub-programmes, so it is the programme" convention) — renaming the
        // school must carry that value along too, or Student.programme goes
        // stale right alongside the name it used to mirror.
        if (school.programmes.length === 0) {
          await tx.student.updateMany({
            where: { collegeId, school: name!, programme: school.name },
            data: { programme: name! },
          });
          await tx.$executeRaw`
            UPDATE jobs
            SET eligible_programmes = array_replace(eligible_programmes, ${school.name}, ${name})
            WHERE college_id = ${collegeId} AND ${school.name} = ANY(eligible_programmes)
          `;
        }
      }

      for (const [from, to] of programmeRenames) {
        await tx.student.updateMany({
          where: { collegeId, school: finalSchoolName, programme: from },
          data: { programme: to },
        });
        await tx.$executeRaw`
          UPDATE jobs
          SET eligible_programmes = array_replace(eligible_programmes, ${from}, ${to})
          WHERE college_id = ${collegeId} AND ${from} = ANY(eligible_programmes)
        `;
      }

      return updated;
    });
  }

  async remove(collegeId: string, id: string) {
    const school = await this.prisma.collegeSchool.findFirst({ where: { id, collegeId } });
    if (!school) throw new NotFoundException('School not found');
    await this.prisma.collegeSchool.delete({ where: { id } });
    return { success: true };
  }
}
