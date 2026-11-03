import { Reflector } from '@nestjs/core';
import type { PlatformRole } from '../../database/schema';

export const Roles = Reflector.createDecorator<PlatformRole[]>();
