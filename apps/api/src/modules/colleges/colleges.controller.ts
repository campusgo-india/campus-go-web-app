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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { del, put } from '@vercel/blob';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuditService } from '../../common/audit.module';
import { CollegesService } from './colleges.service';
import { CreateCollegeDto, ResetAdminPasswordDto, UpdateCollegeDto } from './dto';

// Minimal shape of a multer upload (avoids depending on @types/multer).
interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

// SVG is intentionally excluded: it can carry script-bearing markup.
const LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

@Controller('colleges')
@Roles(UserRole.PLATFORM_ADMIN)
export class CollegesController {
  constructor(
    private readonly colleges: CollegesService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateCollegeDto, @Ip() ip: string) {
    const result = await this.colleges.create(dto);
    await this.audit.record(actor, {
      action: 'COLLEGE_CREATE',
      targetType: 'college',
      targetId: result.college.id,
      collegeId: result.college.id,
      metadata: { name: dto.name, slug: dto.slug, adminEmail: dto.adminEmail },
      ip,
    });
    return { data: result };
  }

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.colleges.list(Number(page) || 1, Number(limit) || 20, search);
    return {
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.colleges.findOne(id) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCollegeDto) {
    return { data: await this.colleges.update(id, dto) };
  }

  // Upload/replace the college's logo. The blob is public with an unguessable URL
  // (same trust model as job PDFs and public résumé links); /auth/me hands the URL
  // to every shell of that tenant, which fall back to the CampusGO wordmark when null.
  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async uploadLogo(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Ip() ip: string,
    @UploadedFile() file?: UploadedImage,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!LOGO_MIME_TYPES.has(file.mimetype))
      throw new BadRequestException('Logo must be a PNG, JPEG, or WebP image');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token)
      throw new BadRequestException('File storage is not configured (BLOB_READ_WRITE_TOKEN)');
    const college = await this.colleges.findOne(id);
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80) || 'logo.png';
    const blob = await put(`college-logos/${id}/${Date.now()}-${safe}`, file.buffer, {
      access: 'public',
      token,
      contentType: file.mimetype,
    });
    const updated = await this.colleges.setLogo(id, blob.url);
    // Best-effort cleanup of the replaced blob; a failed delete must not fail the upload.
    if (college.logoUrl) {
      try {
        await del(college.logoUrl, { token });
      } catch {
        /* orphaned blob is harmless */
      }
    }
    await this.audit.record(actor, {
      action: 'COLLEGE_LOGO_UPDATE',
      targetType: 'college',
      targetId: id,
      collegeId: id,
      ip,
    });
    return { data: updated };
  }

  // Remove the college's logo; shells fall back to the CampusGO wordmark.
  @Delete(':id/logo')
  async removeLogo(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Ip() ip: string) {
    const college = await this.colleges.findOne(id);
    const updated = await this.colleges.setLogo(id, null);
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (college.logoUrl && token) {
      try {
        await del(college.logoUrl, { token });
      } catch {
        /* orphaned blob is harmless */
      }
    }
    await this.audit.record(actor, {
      action: 'COLLEGE_LOGO_REMOVE',
      targetType: 'college',
      targetId: id,
      collegeId: id,
      ip,
    });
    return { data: updated };
  }

  @Post(':id/reset-admin-password')
  async resetAdminPassword(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ResetAdminPasswordDto,
    @Ip() ip: string,
  ) {
    const result = await this.colleges.resetAdminPassword(id, dto.password);
    await this.audit.record(actor, {
      action: 'ADMIN_PASSWORD_RESET',
      targetType: 'user',
      targetId: result.adminId,
      collegeId: id,
      metadata: { adminEmail: result.adminEmail, passwordGenerated: result.passwordGenerated },
      ip,
    });
    return { data: result };
  }

  @Patch(':id/status')
  async setStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Ip() ip: string,
  ) {
    const result = await this.colleges.setStatus(id, isActive);
    await this.audit.record(actor, {
      action: isActive ? 'COLLEGE_REACTIVATE' : 'COLLEGE_SUSPEND',
      targetType: 'college',
      targetId: id,
      collegeId: id,
      ip,
    });
    return { data: result };
  }
}
