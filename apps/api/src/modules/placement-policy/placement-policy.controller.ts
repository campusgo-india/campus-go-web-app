import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { PlacementPolicyService } from './placement-policy.service';
import { SetOfferLimitDto } from './dto';

interface UploadedPdf {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

// Class-level: read access for the whole placement team, Coordinator
// included (same "full visibility, read-only" remit as the rest of their
// nav). Write endpoints narrow this per-method to Admin/Officer.
@Controller('placement-policy')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_COORDINATOR)
export class PlacementPolicyController {
  constructor(private readonly policy: PlacementPolicyService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async get(@CurrentUser() user: JwtPayload) {
    return { data: await this.policy.get(this.collegeId(user)) };
  }

  @Get('restricted-students')
  async restrictedStudents(@CurrentUser() user: JwtPayload) {
    return { data: await this.policy.restrictedStudents(this.collegeId(user)) };
  }

  @Post('document')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(@CurrentUser() user: JwtPayload, @UploadedFile() file?: UploadedPdf) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { data: await this.policy.upload(this.collegeId(user), user.sub, file) };
  }

  @Delete('document')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async remove(@CurrentUser() user: JwtPayload) {
    return { data: await this.policy.remove(this.collegeId(user)) };
  }

  @Patch('offer-limit')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async setOfferLimit(@CurrentUser() user: JwtPayload, @Body() dto: SetOfferLimitDto) {
    return { data: await this.policy.setOfferLimit(this.collegeId(user), dto) };
  }
}

/** Student: read-only view of their college's policy document. */
@Controller('me/placement-policy')
@Roles(UserRole.STUDENT)
export class MePlacementPolicyController {
  constructor(private readonly policy: PlacementPolicyService) {}

  @Get()
  async get(@CurrentUser() user: JwtPayload) {
    return { data: await this.policy.getForStudent(user.sub) };
  }
}
