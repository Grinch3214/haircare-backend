import { Inject, Injectable } from '@nestjs/common';
import { normalizeEmail } from '../common/utils/email';
import { DRIZZLE, type Database } from '../database/database.constants';
import { type NewUser, type User, users } from '../database/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findById(id: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({ where: { id } });
  }

  findByEmail(email: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: { email: normalizeEmail(email) },
    });
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({ ...data, email: normalizeEmail(data.email) })
      .returning();
    return user;
  }
}
