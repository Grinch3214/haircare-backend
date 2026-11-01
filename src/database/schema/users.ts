import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Роль на уровне всей платформы. Роли внутри магазина (admin, master) — в store_members
export const platformRole = pgEnum('platform_role', ['user', 'superadmin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  name: text('name'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  role: platformRole('role').notNull().default('user'),
  blockedAt: timestamp('blocked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PlatformRole = (typeof platformRole.enumValues)[number];
