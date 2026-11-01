import argon2 from 'argon2';
import pg from 'pg';

const { DATABASE_URL, SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD } =
  process.env;
if (!DATABASE_URL || !SEED_SUPERADMIN_EMAIL || !SEED_SUPERADMIN_PASSWORD) {
  console.error(
    'В .env нужны DATABASE_URL, SEED_SUPERADMIN_EMAIL и SEED_SUPERADMIN_PASSWORD',
  );
  process.exit(1);
}

const email = SEED_SUPERADMIN_EMAIL.trim().toLowerCase();
const passwordHash = await argon2.hash(SEED_SUPERADMIN_PASSWORD);

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  // xmax = 0 — строка только что вставлена, иначе — обновлена
  const { rows } = await client.query(
    `INSERT INTO users (email, password_hash, role, email_verified_at)
     VALUES ($1, $2, 'superadmin', now())
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = 'superadmin',
           updated_at = now()
     RETURNING id, email, (xmax = 0) AS created`,
    [email, passwordHash],
  );
  const [user] = rows;
  console.log(
    `${user.created ? 'Создан' : 'Обновлён'} суперадмин ${user.email} (${user.id})`,
  );
} finally {
  await client.end();
}
