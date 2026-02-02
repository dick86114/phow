import { Controller, Post, Param, Get, Ip, ParseIntPipe } from '@nestjs/common';
import { LikeService } from './like.service';

@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post(':photoId')
  async like(@Param('photoId', ParseIntPipe) photoId: number, @Ip() ip: string) {
    return this.likeService.like(photoId, ip);
  }

  @Get(':photoId/count')
  async getCount(@Param('photoId', ParseIntPipe) photoId: number) {
    return this.likeService.getCount(photoId);
  }
}
