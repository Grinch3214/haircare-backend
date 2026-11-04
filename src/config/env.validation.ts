import type { JwtSignOptions } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export class Env {
  @IsIn(['development', 'production', 'test'])
  @IsOptional()
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsUrl({ protocols: ['postgresql', 'postgres'], require_tld: false })
  DATABASE_URL!: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  CLIENT_URL!: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  SERVER_URL!: string;

  @IsString()
  SERVER_DOMAIN!: string;

  @IsUrl()
  APPS_SCRIPT_URL!: string;

  @IsString()
  APPS_SCRIPT_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @Matches(/^\d+(s|m|h|d)$/)
  @IsOptional()
  JWT_ACCESS_TTL: NonNullable<JwtSignOptions['expiresIn']> = '15m';

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  REFRESH_TOKEN_TTL_DAYS: number = 30;
}

export function validateEnv(config: Record<string, unknown>): Env {
  const env = plainToInstance(Env, config, { enableImplicitConversion: true });
  const errors = validateSync(env, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new Error(`Invalid .env:\n- ${messages.join('\n- ')}`);
  }

  return env;
}
