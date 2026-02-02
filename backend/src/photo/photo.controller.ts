import { 
  Controller, Get, Post, Body, Param, Delete, UseInterceptors, 
  UploadedFile, UseGuards, Request, Query, ParseIntPipe, Patch 
} from '@nestjs/common';
import { PhotoService } from './photo.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Visibility } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('photos')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req
  ) {
    return this.photoService.processAndCreate(file, body, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('extract-metadata')
  @UseInterceptors(FileInterceptor('file'))
  async extractMetadata(@UploadedFile() file: Express.Multer.File) {
    return this.photoService.parseExif(file.buffer);
  }

  @Get()
  async findAll(@Query('visibility') visibility?: Visibility) {
    return this.photoService.findAll(visibility);
  }

  @Get('activity')
  async getUploadActivity() {
    return this.photoService.getUploadActivity();
  }

  @Get('fix-thumbs')
  async fixThumbs() {
    return this.photoService.regenerateAllThumbnails();
  }

  @Get('fix-metadata')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async fixMetadata() {
    return this.photoService.fixMetadata();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.photoService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.photoService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.photoService.delete(id);
  }
}
