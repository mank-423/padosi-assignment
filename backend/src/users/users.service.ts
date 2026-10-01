import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    return { profile };
  }

  async upsertProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        name: dto.name,
        mobile: dto.mobile,
        address: dto.address,
        businessName: dto.businessName ?? null,
      },
      update: {
        name: dto.name,
        mobile: dto.mobile,
        address: dto.address,
        businessName: dto.businessName ?? null,
      },
    });
    return { profile };
  }
}