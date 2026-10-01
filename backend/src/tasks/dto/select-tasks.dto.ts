import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

export class SelectTasksDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Pick at least one task.' })
  @IsUUID('4', { each: true, message: 'Each task ID must be a valid UUID.' })
  taskIds!: string[];
}