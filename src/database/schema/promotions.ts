import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Баннеры акций, общие для всех сайтов. Цены не меняют — скидки в products
export const promotions = pgTable('promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Необязательны: текст часто нарисован прямо на картинке
  title: text('title'),
  description: text('description'),
  imageDesktopUrl: text('image_desktop_url').notNull(),
  imageMobileUrl: text('image_mobile_url'),
  imageAlt: text('image_alt'),
  linkUrl: text('link_url'),
  // Видна, если включена и сейчас между startsAt и endsAt (null — без ограничения)
  isActive: boolean('is_active').notNull().default(false),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Promotion = typeof promotions.$inferSelect;
export type NewPromotion = typeof promotions.$inferInsert;
