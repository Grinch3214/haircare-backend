import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import type { JwtPayload } from '../common/types/auth';
import type { User } from '../database/schema';
import { type PublicUser, toPublicUser } from '../users/public-user';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { type ClientMeta, SessionsService } from './sessions.service';

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto, meta: ClientMeta): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash: await argon2.hash(dto.password),
      name: dto.name,
    });

    return this.startSession(user, meta);
  }

  async login(dto: LoginDto, meta: ClientMeta): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    const valid =
      user?.passwordHash &&
      (await argon2.verify(user.passwordHash, dto.password));
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.blockedAt) {
      throw new ForbiddenException('User is blocked');
    }

    return this.startSession(user, meta);
  }

  async refresh(refreshToken: string, meta: ClientMeta): Promise<AuthResult> {
    const session = await this.sessionsService.findValid(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.user.blockedAt) {
      await this.sessionsService.deleteAllForUser(session.userId);
      throw new ForbiddenException('User is blocked');
    }

    const newRefreshToken = await this.sessionsService.rotate(session, meta);
    if (!newRefreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      accessToken: await this.signAccessToken(session.user),
      refreshToken: newRefreshToken,
      user: toPublicUser(session.user),
    };
  }

  logout(refreshToken: string) {
    return this.sessionsService.deleteByToken(refreshToken);
  }

  logoutAll(userId: string) {
    return this.sessionsService.deleteAllForUser(userId);
  }

  private async startSession(
    user: User,
    meta: ClientMeta,
  ): Promise<AuthResult> {
    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: await this.sessionsService.create(user.id, meta),
      user: toPublicUser(user),
    };
  }

  private signAccessToken(user: User) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwtService.signAsync(payload);
  }
}
