import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  users: {
    memberships: r.many.storeMembers({
      from: r.users.id,
      to: r.storeMembers.userId,
    }),
    stores: r.many.stores({
      from: r.users.id.through(r.storeMembers.userId),
      to: r.stores.id.through(r.storeMembers.storeId),
    }),
  },
  stores: {
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
}));
