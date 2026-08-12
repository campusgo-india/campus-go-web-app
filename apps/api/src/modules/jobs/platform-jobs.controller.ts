import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { put } from '@vercel/blob';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { JobsService } from './jobs.service';
import { CreatePlatformJobDto, ListJobsQuery, UpdatePlatformJobDto } from './dto';

// Minimal shape of a multer upload (avoids depending on @types/multer).
interface UploadedPdf {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

// Platform-Admin-only management of cross-college broadcast jobs. These appear in
// the eligible feed of every targeted college's students; each college manages
// its own applicants via the normal officer pipeline (tenant-scoped).
@Controller('platform/jobs')
@Roles(UserRole.PLATFORM_ADMIN)
export class PlatformJobsController {
  constructor(private readonly jobs: JobsService) {}

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
}
