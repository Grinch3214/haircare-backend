import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Стабильный ключ, не зависит от языка: 'formulas', 'accessories'
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isHidden: boolean('is_hidden').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Значение «Сегмент» из инвентуры → категория: '4. Аксессуары' и '4. Аксесуари' → accessories
export const categoryAliases = pgTable('category_aliases', {
  value: text('value').primaryKey(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryAlias = typeof categoryAliases.$inferSelect;
export type NewCategoryAlias = typeof categoryAliases.$inferInsert;
