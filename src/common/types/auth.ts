import type { Request } from 'express';
import type { PlatformRole } from '../../database/schema';

export type JwtPayload = { sub: string; role: PlatformRole };

export type AuthUser = { id: string; role: PlatformRole };

export type AuthenticatedRequest = Request & { user?: AuthUser };
