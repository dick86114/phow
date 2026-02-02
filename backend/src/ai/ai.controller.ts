import { Controller, Post, Param, ParseIntPipe, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('photos/:id/analyze')
  @Roles(Role.ADMIN)
  async analyzePhoto(@Param('id', ParseIntPipe) id: number) {
    return this.aiService.analyzePhoto(id);
  }

  @Post('analyze-upload')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async analyzeUpload(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.analyzeImageUpload(file);
  }
}
