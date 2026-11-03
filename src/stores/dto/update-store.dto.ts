import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateStoreDto } from './create-store.dto';

// slug не меняем: на нём держится X-Store во фронтах магазина
export class UpdateStoreDto extends PartialType(
  OmitType(CreateStoreDto, ['slug'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
