import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Ip,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { put } from '@vercel/blob';
import { Res } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuditService } from '../../common/audit.module';
import { JobsService } from './jobs.service';
import { ApplicationsService } from './applications.service';
import { ApplyDto, BulkPublishDto, CreateJobDto, ListJobsQuery, UpdateJobDto } from './dto';
import { BulkAddApplicantsDto, VerifyOfferDto } from './application-dto';
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

// No class-level @Roles: this controller mixes officer management routes and
// student feed/apply routes, each guarded with method-level @Roles.
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly applications: ApplicationsService,
    private readonly audit: AuditService,
  ) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  // Upload a Job Description PDF to Vercel Blob; returns its public URL to attach
  // to a job (used by the "quick post" flow). Officer/admin only.
  // NOTE: stored as public because the linked Vercel Blob store is public.
  // Access is gated by the API: the PDF URL is only exposed to authenticated
  // viewers through /jobs/:id/pdf and the job detail responses.
  @Post('upload-pdf')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPdf(@CurrentUser() user: JwtPayload, @UploadedFile() file?: UploadedPdf) {
    this.collegeId(user);
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.mimetype !== 'application/pdf')
      throw new BadRequestException('Only PDF files are allowed');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token)
      throw new BadRequestException('File storage is not configured (BLOB_READ_WRITE_TOKEN)');
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80) || 'job.pdf';
    const blob = await put(`job-storage/${user.collegeId}/${Date.now()}-${safe}`, file.buffer, {
      access: 'public',
      token,
      contentType: 'application/pdf',
    });
    return { data: { url: blob.url, name: file.originalname } };
  }

  // Upload an offer letter to Vercel Blob (PUBLIC, unguessable URL — same trust
  // model as a public résumé link) so the officer and the placed student can open
  // it directly. Officer/admin AND the student themselves (most offer letters
  // land in the student's inbox first, not the officer's) may upload.
  @Post('upload-offer-letter')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadOfferLetter(@CurrentUser() user: JwtPayload, @UploadedFile() file?: UploadedPdf) {
    this.collegeId(user);
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.mimetype !== 'application/pdf')
      throw new BadRequestException('Only PDF files are allowed');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token)
      throw new BadRequestException('File storage is not configured (BLOB_READ_WRITE_TOKEN)');
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80) || 'offer.pdf';
    const blob = await put(
      `job-storage/offer-letters/${user.collegeId}/${Date.now()}-${safe}`,
      file.buffer,
      {
        access: 'public',
        token,
        contentType: 'application/pdf',
      },
    );
    return { data: { url: blob.url, name: file.originalname } };
  }

  // Redirect to the JD PDF. Job PDFs are stored as public Vercel Blobs
  // (unguessable URLs) so the API enforces access control and then sends the
  // caller to the actual file. Any student/officer of the owning college may view.
  @Get(':id/pdf')
  @Roles(
    UserRole.COLLEGE_ADMIN,
    UserRole.PLACEMENT_OFFICER,
    UserRole.PLACEMENT_COORDINATOR,
    UserRole.MANAGEMENT,
    UserRole.STUDENT,
  )
  async pdf(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const ref = await this.jobs.pdfRef(this.collegeId(user), id);
    if (!ref.pdfUrl) throw new NotFoundException('No PDF for this job');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${(ref.pdfName ?? 'job.pdf').replace(/"/g, '')}"`,
    );
    res.redirect(ref.pdfUrl);
  }

  // GET /jobs — officer management list OR student eligible feed, by role.
  @Get()
  @Roles(
    UserRole.COLLEGE_ADMIN,
    UserRole.PLACEMENT_OFFICER,
    UserRole.PLACEMENT_COORDINATOR,
    UserRole.MANAGEMENT,
    UserRole.STUDENT,
  )
  async list(@CurrentUser() user: JwtPayload, @Query() query: ListJobsQuery) {
    if (user.role === UserRole.STUDENT) {
      return { data: await this.jobs.studentFeed(user.sub) };
    }
    const { items, meta } = await this.jobs.list(this.collegeId(user), query, {
      role: user.role,
      userId: user.sub,
    });
    return { data: items, meta };
  }

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateJobDto) {
    return { data: await this.jobs.create(this.collegeId(user), user.sub, dto) };
  }

  @Get(':id')
  @Roles(
    UserRole.COLLEGE_ADMIN,
    UserRole.PLACEMENT_OFFICER,
    UserRole.PLACEMENT_COORDINATOR,
    UserRole.MANAGEMENT,
    UserRole.STUDENT,
  )
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    if (user.role === UserRole.STUDENT) {
      return { data: await this.jobs.studentJobDetail(user.sub, id) };
    }
    return { data: await this.jobs.findOne(this.collegeId(user), id) };
  }

  @Patch(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return {
      data: await this.jobs.update(this.collegeId(user), id, dto, {
        role: user.role,
        userId: user.sub,
      }),
    };
  }

  @Post(':id/publish')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return {
      data: await this.jobs.publish(this.collegeId(user), id, { role: user.role, userId: user.sub }),
    };
  }

  @Post('publish-many')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async publishMany(@CurrentUser() user: JwtPayload, @Body() dto: BulkPublishDto) {
    return { data: await this.jobs.publishMany(this.collegeId(user), dto.ids) };
  }

  @Post(':id/close')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async close(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return {
      data: await this.jobs.close(this.collegeId(user), id, { role: user.role, userId: user.sub }),
    };
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return {
      data: await this.jobs.remove(this.collegeId(user), id, { role: user.role, userId: user.sub }),
    };
  }

  // Raw @Res() bypasses the {data} envelope interceptor — this streams a file
  // attachment, mirroring reports.controller.ts's export pattern.
  @Get(':id/applicants-export')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async applicantsExport(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('format') format: string | undefined,
    @Query('full') full: string | undefined,
    @Ip() ip: string,
    @Res() res: Response,
  ): Promise<void> {
    const fmt = format === 'xlsx' ? 'xlsx' : 'csv';
    const isFull = full === 'true';
    const dataset = await this.applications.exportApplicantsDataset(this.collegeId(user), id, isFull);
    const buffer = fmt === 'xlsx' ? await toXlsx(dataset) : toCsv(dataset);

    await this.audit.record(user, {
      action: 'APPLICANTS_EXPORT',
      targetType: 'job',
      targetId: id,
      metadata: { format: fmt, full: isFull, rows: dataset.rows.length },
      ip,
    });

    res.setHeader('Content-Type', EXPORT_CONTENT_TYPE[fmt]);
    res.setHeader('Content-Disposition', `attachment; filename="${dataset.filename}.${fmt}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get(':id/eligible-students')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async eligibleStudents(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return {
      data: await this.jobs.eligibleStudents(this.collegeId(user), id, {
        role: user.role,
        userId: user.sub,
      }),
    };
  }

  // Who in a programme applied to this job and who didn't. A Placement Coordinator
  // is always restricted to their own assignedProgrammes, regardless of any query
  // param — if they pass one, it must be one of their own programmes; otherwise
  // every programme they cover is included.
  @Get(':id/programme-applicants')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_COORDINATOR)
  async programmeApplicants(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('programme') programme?: string,
  ) {
    let effectiveProgrammes: string[] | undefined = programme ? [programme] : undefined;
    if (user.role === UserRole.PLACEMENT_COORDINATOR) {
      const mine = await this.jobs.resolveAssignedProgrammes(user.sub);
      if (!mine.length) throw new BadRequestException('No programme assigned to this account yet');
      if (programme && !mine.includes(programme)) {
        throw new ForbiddenException('Not one of your assigned programmes');
      }
      effectiveProgrammes = programme ? [programme] : mine;
    }
    return {
      data: await this.jobs.applicantStatusByProgramme(this.collegeId(user), id, effectiveProgrammes, {
        role: user.role,
        userId: user.sub,
      }),
    };
  }

  @Get(':id/applications')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async pipeline(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.applications.pipeline(this.collegeId(user), id) };
  }

  // Manually add applicants by roll number — e.g. a late request after the
  // job has closed, or bulk-importing a company's own applicant tracker.
  // Bypasses the normal apply() eligibility/deadline/status checks by design.
  @Post(':id/applicants')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async bulkAddApplicants(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: BulkAddApplicantsDto,
  ) {
    return {
      data: await this.applications.bulkAddApplicants(
        this.collegeId(user),
        id,
        dto.rollNumbers,
        user.sub,
      ),
    };
  }

  @Post(':id/apply')
  @Roles(UserRole.STUDENT)
  async apply(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ApplyDto) {
    return { data: await this.jobs.apply(user.sub, id, dto.formResponses) };
  }

  // ── Student-uploaded offer letters awaiting officer verification ──
  @Get('offers/awaiting-verification')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_COORDINATOR)
  async offersAwaitingVerification(@CurrentUser() user: JwtPayload) {
    return {
      data: await this.applications.listSelfReportedOffers(this.collegeId(user), {
        role: user.role,
        userId: user.sub,
      }),
    };
  }

  @Post('applications/:id/verify-offer')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_COORDINATOR)
  async verifyOffer(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: VerifyOfferDto,
  ) {
    return {
      data: await this.applications.verifySelfReportedOffer(
        this.collegeId(user),
        id,
        dto.approve,
        user.sub,
      ),
    };
  }
}
