import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikeService {
  constructor(private prisma: PrismaService) {}

  async like(photoId: number, ip: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingLike = await this.prisma.like.findFirst({
      where: {
        photoId,
        ip,
        createdAt: {
          gte: today,
        },
      },
    });

    if (existingLike) {
      throw new BadRequestException('每天只能点赞一次哦');
    }

    return this.prisma.like.create({
      data: {
        photoId,
        ip,
      },
    });
  }

  async getCount(photoId: number) {
    return this.prisma.like.count({
      where: { photoId },
    });
  }
}
