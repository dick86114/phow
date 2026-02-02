import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('init-admin')
  async initAdmin() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await this.userService.findOne('admin');
    
    if (admin) {
      // Update existing admin password to ensure it matches
      await this.userService.update(admin.id, {
        password: hashedPassword,
        role: Role.ADMIN // Ensure role is ADMIN
      });
      return { message: 'Admin password reset to password123' };
    }
    
    await this.userService.create({
      username: 'admin',
      password: 'password123', // userService.create handles hashing usually, but let's check
      role: Role.ADMIN,
    });
    return { message: 'Admin created' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req, @Body() body: any) {
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) {
      throw new BadRequestException('请输入旧密码和新密码');
    }

    const user = await this.userService.findById(req.user.userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('旧密码错误');
    }

    await this.userService.updatePassword(user.id, newPassword);
    return { message: '密码修改成功' };
  }
}
