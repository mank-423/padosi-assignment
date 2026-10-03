import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) { }

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async listTasks(search?: string, categoryId?: string) {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (search && search.trim().length > 0) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    return this.prisma.task.findMany({
      where,
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async selectTasks(userId: string, taskIds: string[]) {
    // Verify all IDs exist
    const found = await this.prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true },
    });
    if (found.length !== taskIds.length) {
      throw new BadRequestException({
        error: 'INVALID_TASK_ID',
        message: 'One or more selected tasks do not exist.',
      });
    }

    // Replace selection atomically
    await this.prisma.$transaction([
      this.prisma.userTask.deleteMany({ where: { userId } }),
      this.prisma.userTask.createMany({
        data: taskIds.map((taskId) => ({ userId, taskId })),
        skipDuplicates: true,
      }),
    ]);

    return this.getSelectedTasks(userId);
  }

  async addOrUpdateSelection(userId: string, taskId: string, description?: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new BadRequestException({
        error: 'INVALID_TASK_ID',
        message: 'That task does not exist.',
      });
    }

    await this.prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: { userId, taskId, description: description ?? null },
      update: { description: description ?? null },
    });

    return this.getSelectedTasks(userId);
  }

  async removeSelection(userId: string, taskId: string) {
    await this.prisma.userTask.deleteMany({ where: { userId, taskId } });
    return this.getSelectedTasks(userId);
  }

  async getSelectedTasks(userId: string) {
    const rows = await this.prisma.userTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        task: { include: { category: { select: { id: true, name: true } } } },
      },
    });

    return rows.map((r) => ({
      id: r.task.id,
      name: r.task.name,
      description: r.task.description,          // catalogue description
      customDescription: r.description,          // user's note (was null before)
      category: r.task.category,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}