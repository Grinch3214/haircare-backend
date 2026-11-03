import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Trim } from '../../common/decorators/transforms';

export class CreateStoreDto {
  @Trim()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'slug must contain only lowercase latin letters, digits and single hyphens',
  })
  @MinLength(2)
  @MaxLength(50)
  slug!: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
