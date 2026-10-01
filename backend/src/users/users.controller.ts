import { Body, Controller, Get, Put, UseGuards, Req } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/gaurds/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getProfile(@Req() req: any) {
    return this.users.getProfile(req.user.userId);
  }

  @Put()
  upsertProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.users.upsertProfile(req.user.userId, dto);
  }
}