import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { put } from '@vercel/blob';
import type { Response } from 'express';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuditService } from '../../common/audit.module';
import { JobsService } from './jobs.service';
import { RoundsService } from './rounds.service';
import { ApplicationsService } from './applications.service';
import { CreatePlatformJobDto, ListJobsQuery, UpdatePlatformJobDto } from './dto';
import {
  CreateRoundDto,
  DecideRoundDto,
  MarkRoundAttendanceDto,
  PlaceApplicantDto,
  RejectApplicantDto,
  UpdateRoundDto,
} from './rounds-dto';
import { toCsv, toXlsx } from '../reports/report-serializers';

const EXPORT_CONTENT_TYPE: Record<'csv' | 'xlsx', string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// Minimal shape of a multer upload (avoids depending on @types/multer).
interface UploadedPdf {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

// Platform-Admin-only management of cross-college broadcast jobs. These appear
// in the eligible feed of every targeted college's students; each targeted
// college runs its own independent round track via the normal officer
// pipeline, AND the platform admin can run their own round track here,
// spanning every targeted college's applicants (see RoundsService for how the
// two tracks coexist).
@Controller('platform/jobs')
@Roles(UserRole.PLATFORM_ADMIN)
export class PlatformJobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly rounds: RoundsService,
    private readonly applications: ApplicationsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: ListJobsQuery) {
    const { items, meta } = await this.jobs.listPlatform(query);
    return { data: items, meta };
  }

  // Upload a JD PDF for a broadcast job. Mirrors jobs.controller.ts's college-scoped
  // upload-pdf, but broadcast jobs have no collegeId, so this uses its own
  // "platform/" prefix in blob storage instead of job-storage/<collegeId>/.
  @Post('upload-pdf')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPdf(@UploadedFile() file?: UploadedPdf) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.mimetype !== 'application/pdf')
      throw new BadRequestException('Only PDF files are allowed');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token)
      throw new BadRequestException('File storage is not configured (BLOB_READ_WRITE_TOKEN)');
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80) || 'job.pdf';
    const blob = await put(`job-storage/platform/${Date.now()}-${safe}`, file.buffer, {
      access: 'public',
      token,
      contentType: 'application/pdf',
    });
    return { data: { url: blob.url, name: file.originalname } };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePlatformJobDto) {
    return { data: await this.jobs.createPlatform(user.sub, dto) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.jobs.findOnePlatform(id) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlatformJobDto) {
    return { data: await this.jobs.updatePlatform(id, dto) };
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    return { data: await this.jobs.publishPlatform(id) };
  }

  @Post(':id/close')
  async close(@Param('id') id: string) {
    return { data: await this.jobs.closePlatform(id) };
  }

  // Raw @Res() bypasses the {data} envelope interceptor — mirrors
  // jobs.controller.ts's college-scoped applicants-export. Rows span every
  // targeted college, each carrying its own College + Placement Officer
  // contact (see ApplicationsService.exportPlatformApplicantsDataset).
  @Get(':id/applicants-export')
  async applicantsExport(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('format') format: string | undefined,
    @Ip() ip: string,
    @Res() res: Response,
  ): Promise<void> {
    const fmt = format === 'xlsx' ? 'xlsx' : 'csv';
    const dataset = await this.applications.exportPlatformApplicantsDataset(id);
    const buffer = fmt === 'xlsx' ? await toXlsx(dataset) : toCsv(dataset);

    await this.audit.record(user, {
      action: 'APPLICANTS_EXPORT',
      targetType: 'job',
      targetId: id,
      metadata: { format: fmt, rows: dataset.rows.length, scope: 'PLATFORM' },
      ip,
    });

    res.setHeader('Content-Type', EXPORT_CONTENT_TYPE[fmt]);
    res.setHeader('Content-Disposition', `attachment; filename="${dataset.filename}.${fmt}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  // ─────────────── Platform Admin's own round track ───────────────
  // Runs alongside each targeted college's own independent round track on the
  // same job (see RoundsController) — this is a second, parallel pipeline the
  // platform admin drives directly across every targeted college's applicants.
  @Get(':id/funnel')
  async funnel(@Param('id') id: string) {
    return { data: await this.rounds.platformFunnel(id) };
  }

  @Post(':id/rounds')
  async createRound(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateRoundDto,
  ) {
    return { data: await this.rounds.createPlatformRound(id, user.sub, dto) };
  }

  @Patch(':id/rounds/:roundId')
  async updateRound(
    @Param('id') id: string,
    @Param('roundId') roundId: string,
    @Body() dto: UpdateRoundDto,
  ) {
    return { data: await this.rounds.updatePlatformRound(id, roundId, dto) };
  }

  @Delete(':id/rounds/:roundId')
  async removeRound(@Param('id') id: string, @Param('roundId') roundId: string) {
    return { data: await this.rounds.deletePlatformRound(id, roundId) };
  }

  @Post(':id/rounds/:roundId/attendance')
  async markAttendance(
    @Param('id') id: string,
    @Param('roundId') roundId: string,
    @Body() dto: MarkRoundAttendanceDto,
  ) {
    return { data: await this.rounds.markPlatformRoundAttendance(id, roundId, dto.records) };
  }

  @Post(':id/rounds/:roundId/decide')
  async decideRound(
    @Param('id') id: string,
    @Param('roundId') roundId: string,
    @Body() dto: DecideRoundDto,
  ) {
    return { data: await this.rounds.decidePlatformRound(id, roundId, dto.advanceIds) };
  }

  @Post(':id/applications/:appId/place')
  async place(
    @Param('id') id: string,
    @Param('appId') appId: string,
    @Body() dto: PlaceApplicantDto,
  ) {
    return { data: await this.rounds.placePlatform(id, appId, dto) };
  }

  @Post(':id/applications/:appId/reject')
  async reject(
    @Param('id') id: string,
    @Param('appId') appId: string,
    @Body() dto: RejectApplicantDto,
  ) {
    return { data: await this.rounds.rejectPlatform(id, appId, dto.reason) };
  }
}
