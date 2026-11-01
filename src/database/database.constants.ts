import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { relations } from './relations';

export const PG_POOL = Symbol('PG_POOL');
export const DRIZZLE = Symbol('DRIZZLE');

export type Database = NodePgDatabase<typeof relations>;
