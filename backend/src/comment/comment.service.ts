import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, ip: string) {
    return this.prisma.comment.create({
      data: {
        content: data.content,
        photoId: data.photoId,
        userId: data.userId,
        nickname: data.nickname,
        email: data.email,
        parentId: data.parentId,
        ip,
      },
    });
  }

  async findByPhoto(photoId: number) {
    return this.prisma.comment.findMany({
      where: { photoId, parentId: null },
      include: {
        replies: {
          include: { user: { select: { username: true } } }
        },
        user: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: number, userId: number, userRole: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new Error('Comment not found');
    if (userRole === 'ADMIN' || comment.userId === userId) {
      return this.prisma.comment.delete({ where: { id } });
    }
    throw new Error('Unauthorized');
  }
}
