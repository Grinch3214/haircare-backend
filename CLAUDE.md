# haircare-backend-core

Shared backend for many storefront sites (haircare products catalog). One API, one catalog, dozens of frontends.
Business rules and decisions live in `MVP.MD` (local, not in git). Read it before changing catalog, pricing or role logic.

## Stack

- NestJS 11, TypeScript 5.9, Node 24
- PostgreSQL 17 in Docker, Drizzle ORM **1.0.0-rc** (not 0.x!)
- Config: `@nestjs/config` + `class-validator`

Drizzle 1.0 differs from 0.x, which most examples online are written for:
- relations — a single `defineRelations(schema, (r) => ...)` in `src/database/relations.ts` (`r.one`/`r.many`, `from`/`to`, `.through()` for N:M). Do not use the old per-table `relations()`;
- migrations — folders `drizzle/<timestamp>_<name>/migration.sql` + `snapshot.json`.

## Commands

```
npm run start:dev      # API with watch mode
npm run lint           # eslint --fix
npx tsc --noEmit       # type check
npm run db:up          # Postgres in Docker
npm run db:generate    # generate a migration from schema changes
npm run db:migrate     # apply migrations
```

## Structure

```
src/
  main.ts                    # bootstrap, CORS, cookie-parser
  app.module.ts              # root module
  config/env.validation.ts   # Env class — all environment variables
  database/
    schema/<domain>.ts       # tables grouped by domain, all re-exported via schema/index.ts
    relations.ts             # all Drizzle relations
docs/API.md                  # API reference for frontend developers
drizzle/                     # migrations (in git)
scripts/                     # one-off utilities (.mjs)
data/                        # Google Sheets snapshots, NOT in git (contains prices)
```

## Nest architecture

- Module order / dependency direction: `Database → Users → Auth`. Dependencies point one way only: `UsersService` knows nothing about auth (no passwords checks, no tokens) — it only reads/writes the `users` table. Auth imports Users, never the reverse.
- `DatabaseModule` is `@Global()` and provides the Drizzle instance via DI. Don't create DB connections anywhere else. In a service: `constructor(@Inject(DRIZZLE) private readonly db: Database) {}` (both from `database/database.constants.ts`).
- Cross-cutting helpers (`@CurrentUser()`, `@Roles()`, shared guards) live in `src/common/`.
- Shared pure helpers live in `src/common/utils/<topic>.ts` (e.g. `email.ts` → `normalizeEmail`). **Check there before writing a new helper** — never duplicate one.
- Extract a helper there when a second user exists or is already planned; a one-off helper with no known reuse stays in its file. Anything with dependencies (DB, config, other services) is an `@Injectable()` provider, not a util.
- After `nest generate` run `npm run format` — on Windows it creates files with CRLF.

## Auth

- Access token: JWT, short-lived (15 min), returned in the response body; the frontend keeps it in memory and sends `Authorization: Bearer`.
- Refresh token: random 32 bytes (not a JWT), 30 days (`REFRESH_TOKEN_TTL_DAYS`). Cookie `refresh_token`: `httpOnly`, `sameSite: lax`, `path: /auth`, `secure` in production. Never in a response body.
- One `sessions` row per device; only the **SHA-256** of the token is stored (fast hash is fine for random tokens and allows lookup; argon2 is for passwords). Rotated on every refresh with a conditional update on the old hash. Sessions logic lives in `auth/sessions.service.ts` — Users knows nothing about sessions.
- Blocking a user = set `blockedAt` + `deleteAllForUser`. Login and refresh check `blockedAt`.
- Routes are open by default; protect explicitly with `@UseGuards(...)`. Admin controllers put the guard on the **class**, not per method. Frontend checks are UX only — the backend guard is the security.
- Catalog uses an optional-auth guard: valid token → `request.user` is set (masters see wholesale prices); no token → guest, no 401.
- JWT is verified by our own `JwtAuthGuard` (`common/guards/`) with `JwtService` (no `passport-jwt`). Passport is used only for Google OAuth.
- `JwtModule` is registered in `AuthModule` with `global: true`, so the guard works in any module without importing Auth.
- Protected handler: `@UseGuards(JwtAuthGuard)` + `@CurrentUser() user: AuthUser` (`{ id, role }` from the token). Types `JwtPayload`, `AuthUser`, `AuthenticatedRequest` live in `common/types/auth.ts`. The token only proves identity — load the user from the DB when fresh data is needed.
- JWT secrets and TTLs come from `Env`; `JwtModule.registerAsync` reads them via `ConfigService`.
- Never return a `User` row from a controller — map it with `toPublicUser()` (`users/public-user.ts`); the row contains `passwordHash`.
- Login errors are identical for "no such email" and "wrong password" (401). Blocked user → 403, checked after the password.

## API docs

- `docs/API.md` is the contract for frontend developers. Any change to an endpoint (route, body, response, status codes, error messages) updates it **in the same change**.

## Request validation

- Every request body is a DTO class in `<module>/dto/` validated by the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) — unknown fields are rejected with 400.
- String normalization via `@Trim()` / `@NormalizeEmail()` from `common/decorators/transforms.ts`, not inline `@Transform` (it's typed `any`, eslint fails).

## Database and schemas

- Naming: `camelCase` in TS, `snake_case` in the DB, column name always explicit: `createdAt: timestamp('created_at', ...)`.
- PK: `uuid('id').primaryKey().defaultRandom()`. Join tables use a composite `primaryKey({ columns: [...] })`.
- Every table has `createdAt` + `updatedAt` (`timestamptz`, `notNull`, `defaultNow`; `updatedAt` also gets `$onUpdate(() => new Date())`).
- Money: `numeric(10, 2)` with `mode: 'number'`. Never `real`/`double`.
- Fixed value sets — `pgEnum`.
- Foreign keys always have an explicit `onDelete` (`cascade` / `set null`). Every FK column gets an index named `<table>_<column>_idx` (Postgres does not create them automatically).
- New table: file in `schema/`, export from `schema/index.ts`, relations in `relations.ts`, types `X = $inferSelect`, `NewX = $inferInsert`.
- The catalog is global: `products`, `brands`, `categories`, `promotions` have **no** `store_id`.
- Fields coming from Google Sheets (stock, prices, name…) are overwritten by sync. Our own fields (`slug`, `description`, `salePrice*`, `isVisible`…) are **never** touched by sync. When adding a field, decide whose it is and put it in the matching group (`// Из инвентуры`, `// Из прайса`, `// Наше` in `products.ts`).
- Never edit applied migrations — only add a new one.
- `db:generate` and `db:migrate` are run by the user. The agent may only show the expected SQL (generate into a temp folder).

## Config

- New environment variable: a field in `Env` (`!:` for required ones) + a line in `.env.example`.
- In code use only `ConfigService<Env, true>` and `config.get('X', { infer: true })`. No `process.env` (exception: `drizzle.config.ts`, it runs outside Nest).

## Style

- Prettier: single quotes, trailing commas, **LF**.
- No comments by default. Only for a non-obvious edge case or data format the code can't express (e.g. stock `894.10` = 894 full bottles + 10% of an opened one). In Russian.
- Before saying "done": `npx tsc --noEmit` and `npm run lint` pass with no errors.

## Security

- Do not read or print `.env` (contains Apps Script secrets). For its structure, see `.env.example`.
- Wholesale prices (`priceWholesale`, `salePriceWholesale`) are returned by the API only to masters and admins. Filtering happens on the backend.

## Gotchas

- VS Code must use the TS from `node_modules` (5.9), not the bundled 6.x — otherwise editor errors don't match `tsc`.
- The build cache lives in `dist/` (`tsBuildInfoFile` in `tsconfig.build.json`). Don't move it out — otherwise `nest build` leaves `dist` empty.
