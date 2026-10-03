import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { SelectTasksDto } from './dto/select-tasks.dto';
import { JwtAuthGuard } from '../auth/gaurds/jwt-auth.guard';
import { AddTaskSelectionDto } from './dto/add-task-selection.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) { }

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

  @Get('tasks/selected')
  selected(@Req() req: any) {
    return this.tasks.getSelectedTasks(req.user.userId);
  }

  @Post('tasks/selected')
  addOrUpdate(
    @Req() req: any,
    @Body() dto: AddTaskSelectionDto,
  ) {
    return this.tasks.addOrUpdateSelection(req.user.userId, dto.taskId, dto.description);
  }

  @Delete('tasks/selected/:taskId')
  remove(@Req() req: any, @Param('taskId') taskId: string) {
    return this.tasks.removeSelection(req.user.userId, taskId);
  }
}