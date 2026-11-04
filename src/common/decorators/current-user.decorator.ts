import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthUser } from '../types/auth';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      // Ошибка разработчика, а не клиента: забыли @UseGuards(JwtAuthGuard)
      throw new Error('@CurrentUser() used on a route without JwtAuthGuard');
    }
    return request.user;
  },
);
