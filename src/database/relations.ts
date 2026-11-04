import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  users: {
    sessions: r.many.sessions({
      from: r.users.id,
      to: r.sessions.userId,
    }),
    memberships: r.many.storeMembers({
      from: r.users.id,
      to: r.storeMembers.userId,
    }),
    stores: r.many.stores({
      from: r.users.id.through(r.storeMembers.userId),
      to: r.stores.id.through(r.storeMembers.storeId),
    }),
  },
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  stores: {
    promotions: r.many.promotions({
      from: r.stores.id,
      to: r.promotions.storeId,
    }),
    members: r.many.storeMembers({
      from: r.stores.id,
      to: r.storeMembers.storeId,
    }),
  },
  storeMembers: {
    store: r.one.stores({
      from: r.storeMembers.storeId,
      to: r.stores.id,
      optional: false,
    }),
    user: r.one.users({
      from: r.storeMembers.userId,
      to: r.users.id,
      optional: false,
    }),
    grantedBy: r.one.users({
      from: r.storeMembers.grantedById,
      to: r.users.id,
    }),
  },
  brands: {
    products: r.many.products({
      from: r.brands.id,
      to: r.products.brandId,
    }),
  },
  categories: {
    products: r.many.products({
      from: r.categories.id,
      to: r.products.categoryId,
    }),
    aliases: r.many.categoryAliases({
      from: r.categories.id,
      to: r.categoryAliases.categoryId,
    }),
  },
  categoryAliases: {
    category: r.one.categories({
      from: r.categoryAliases.categoryId,
      to: r.categories.id,
      optional: false,
    }),
  },
  products: {
    brand: r.one.brands({
      from: r.products.brandId,
      to: r.brands.id,
    }),
    category: r.one.categories({
      from: r.products.categoryId,
      to: r.categories.id,
    }),
    portions: r.many.productPortions({
      from: r.products.id,
      to: r.productPortions.productId,
    }),
  },
  promotions: {
    store: r.one.stores({
      from: r.promotions.storeId,
      to: r.stores.id,
    }),
  },
  productPortions: {
    product: r.one.products({
      from: r.productPortions.productId,
      to: r.products.id,
      optional: false,
    }),
  },
}));
