import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { brands } from './brands';
import { categories } from './categories';

// ml — объём в мл, pcs — поштучно (в инвентуре объём = 1), разлива нет
export const productUnit = pgEnum('product_unit', ['ml', 'pcs']);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Из инвентуры
    sku: text('sku').notNull().unique(),
    barcode: text('barcode'),
    name: text('name').notNull(),
    unit: productUnit('unit').notNull(),
    volume: integer('volume'),
    // 894.10 = 894 целых + 10% вскрытой
    stockQuantity: numeric('stock_quantity', {
      precision: 12,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    brandId: uuid('brand_id').references(() => brands.id, {
      onDelete: 'set null',
    }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),

    // Из прайса, за целую единицу. null — цены нет, товар не показываем
    priceRetail: numeric('price_retail', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }),
    priceWholesale: numeric('price_wholesale', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }),

    // Наше
    // Скидка на целую банку, вводит менеджер. null — скидки нет. Синк не трогает
    salePriceRetail: numeric('sale_price_retail', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }),
    salePriceWholesale: numeric('sale_price_wholesale', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    country: text('country'),
    isVisible: boolean('is_visible').notNull().default(true),

    // false — товар пропал из инвентуры при последнем синке
    isActive: boolean('is_active').notNull().default(true),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('products_brand_id_idx').on(t.brandId),
    index('products_category_id_idx').on(t.categoryId),
  ],
);

// Порции разлива из прайса (500/250/100/50 мл). Нет строк — разлива нет
export const productPortions = pgTable(
  'product_portions',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    volumeMl: integer('volume_ml').notNull(),
    priceRetail: numeric('price_retail', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }),
    priceWholesale: numeric('price_wholesale', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.volumeMl] })],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductPortion = typeof productPortions.$inferSelect;
export type NewProductPortion = typeof productPortions.$inferInsert;
export type ProductUnit = (typeof productUnit.enumValues)[number];
