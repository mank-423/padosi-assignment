import { IsString, Matches, MaxLength, MinLength, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(80, { message: 'Name must be at most 80 characters.' })
  name!: string;

  @Matches(/^\+91[6-9]\d{9}$/, {
    message: 'Mobile must be a valid Indian number (+91 followed by 10 digits).',
  })
  mobile!: string;

  @IsString()
  @MinLength(5, { message: 'Address must be at least 5 characters.' })
  @MaxLength(300, { message: 'Address must be at most 300 characters.' })
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  businessName?: string;
}