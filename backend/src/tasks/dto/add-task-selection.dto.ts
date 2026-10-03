import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddTaskSelectionDto {
  @IsUUID('4', { message: 'taskId must be a valid UUID.' })
  taskId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Description must be at most 300 characters.' })
  description?: string;
}