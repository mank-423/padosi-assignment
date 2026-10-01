import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { SelectTasksDto } from './dto/select-tasks.dto';
import { JwtAuthGuard } from '../auth/gaurds/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('categories')
  listCategories() {
    return this.tasks.listCategories();
  }

  @Get('tasks')
  listTasks(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.tasks.listTasks(search, categoryId);
  }

  @Post('tasks/select')
  selectTasks(@Req() req: any, @Body() dto: SelectTasksDto) {
    return this.tasks.selectTasks(req.user.userId, dto.taskIds);
  }

  @Get('tasks/selected')
  selected(@Req() req: any) {
    return this.tasks.getSelectedTasks(req.user.userId);
  }
}