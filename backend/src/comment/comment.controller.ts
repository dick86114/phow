import { Controller, Post, Body, Get, Param, Delete, UseGuards, Request, Ip, ParseIntPipe } from '@nestjs/common';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  async create(@Body() body: any, @Request() req, @Ip() ip: string) {
    const data = {
      ...body,
      userId: req.user?.userId,
    };
    return this.commentService.create(data, ip);
  }

  @Get('photo/:photoId')
  async findByPhoto(@Param('photoId', ParseIntPipe) photoId: number) {
    return this.commentService.findByPhoto(photoId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.commentService.delete(id, req.user.userId, req.user.role);
  }
}
