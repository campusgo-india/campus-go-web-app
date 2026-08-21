import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuditService } from '../../common/audit.module';
import { toMultiSheetXlsx } from '../reports/report-serializers';
import { StudentsService } from './students.service';
import {
  CreateStudentDto,
  GraduateBatchDto,
  ImportStudentsDto,
  ListStudentsQuery,
  SetStudentStatusDto,
  UpdateStudentDto,
  VerifyStudentDto,
} from './dto';

/**
 * Reads are open to the Placement Officer and College Admin; all mutations are
 * Placement-Officer-only (method-level @Roles overrides the class default).
 */
@Controller('students')
@Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly audit: AuditService,
  ) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  // Placement Coordinators can view too — the service forces programme-scoping
  // so they only ever see their own assigned programmes, regardless of query params.
  @Get()
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_COORDINATOR)
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListStudentsQuery) {
    const { items, meta } = await this.students.list(this.collegeId(user), query, {
      role: user.role,
      userId: user.sub,
    });
    return { data: items, meta };
  }

  // Declared before :id so "batches" isn't captured as an id param.
  @Get('batches')
  async batches(@CurrentUser() user: JwtPayload) {
    return { data: await this.students.batches(this.collegeId(user)) };
  }

  // Declared before :id for the same reason. Streams an XLSX with one sheet per
  // programme, each row including a résumé link — bypasses the {data} envelope
  // like the Reports module's exports.
  @Get('export/by-programme')
  async exportByProgramme(
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    const collegeId = this.collegeId(user);
    const datasets = await this.students.exportByProgramme(collegeId);
    const buffer = await toMultiSheetXlsx(datasets);

    await this.audit.record(user, {
      action: 'STUDENTS_EXPORT_BY_PROGRAMME',
      targetType: 'student',
      metadata: { programmes: datasets.length, rows: datasets.reduce((n, d) => n + d.rows.length, 0) },
      ip,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="students-by-programme-${stamp}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get(':id')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_COORDINATOR)
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return {
      data: await this.students.findOne(this.collegeId(user), id, {
        role: user.role,
        userId: user.sub,
      }),
    };
  }

  @Post()
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStudentDto) {
    return { data: await this.students.create(this.collegeId(user), dto) };
  }

  @Post('import')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async importCsv(@CurrentUser() user: JwtPayload, @Body() dto: ImportStudentsDto) {
    return { data: await this.students.importCsv(this.collegeId(user), dto) };
  }

  @Patch(':id')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return { data: await this.students.update(this.collegeId(user), id, dto) };
  }

  @Post('graduate')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async graduate(@CurrentUser() user: JwtPayload, @Body() dto: GraduateBatchDto, @Ip() ip: string) {
    const result = await this.students.graduateBatch(this.collegeId(user), dto.graduationYear);
    await this.audit.record(user, {
      action: 'STUDENT_BATCH_GRADUATE',
      targetType: 'student',
      metadata: result,
      ip,
    });
    return { data: result };
  }

  // No delete endpoint, by design: a college can create/edit/deactivate a
  // student login, but never permanently delete one — see setActive below.

  @Patch(':id/status')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async setStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetStudentStatusDto,
  ) {
    return { data: await this.students.setActive(this.collegeId(user), id, dto.isActive) };
  }

  @Post(':id/verify')
  @Roles(UserRole.PLACEMENT_OFFICER, UserRole.COLLEGE_ADMIN)
  async verify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VerifyStudentDto,
    @Ip() ip: string,
  ) {
    const result = await this.students.verify(this.collegeId(user), id, user.sub, dto);
    await this.audit.record(user, {
      action: dto.action === 'verify' ? 'STUDENT_VERIFY' : 'STUDENT_REJECT',
      targetType: 'student',
      targetId: id,
      metadata: dto.reason ? { reason: dto.reason } : undefined,
      ip,
    });
    return { data: result };
  }
}
