import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
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
