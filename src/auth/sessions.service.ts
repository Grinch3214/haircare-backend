import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import type { Env } from '../config/env.validation';
import { DRIZZLE, type Database } from '../database/database.constants';
import { type Session, sessions } from '../database/schema';

export type ClientMeta = { userAgent?: string; ip?: string };

@Injectable()
export class SessionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(userId: string, meta: ClientMeta): Promise<string> {
    const token = generateToken();
    await this.db.insert(sessions).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt: this.newExpiresAt(),
      ...meta,
    });
    return token;
  }

  findValid(token: string) {
    return this.db.query.sessions.findFirst({
      where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
      with: { user: true },
    });
  }

  // Условие на старый хеш: из двух одновременных refresh с одним токеном пройдёт только один
  async rotate(session: Session, meta: ClientMeta): Promise<string | null> {
    const token = generateToken();
    const [updated] = await this.db
      .update(sessions)
      .set({
        tokenHash: hashToken(token),
        expiresAt: this.newExpiresAt(),
        ...meta,
      })
      .where(
        and(
          eq(sessions.id, session.id),
          eq(sessions.tokenHash, session.tokenHash),
        ),
      )
      .returning({ id: sessions.id });
    return updated ? token : null;
  }

  async deleteByToken(token: string) {
    await this.db
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)));
  }

  async deleteAllForUser(userId: string) {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  private newExpiresAt() {
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

function generateToken() {
  return randomBytes(32).toString('base64url');
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
