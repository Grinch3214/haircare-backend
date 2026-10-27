// Скачивает обе Google-таблицы через Apps Script и сохраняет в data/snapshots/.
// Запуск: npm run snapshot:sheets
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const { APPS_SCRIPT_URL, APPS_SCRIPT_SECRET } = process.env;
if (!APPS_SCRIPT_URL || !APPS_SCRIPT_SECRET) {
  console.error('В .env нужны APPS_SCRIPT_URL и APPS_SCRIPT_SECRET');
  process.exit(1);
}

const url = new URL(APPS_SCRIPT_URL);
url.searchParams.set('key', APPS_SCRIPT_SECRET);

const res = await fetch(url);
const text = await res.text();

let body;
try {
  body = JSON.parse(text);
} catch {
  console.error(`Apps Script вернул не JSON (HTTP ${res.status}). Проверь APPS_SCRIPT_URL.`);
  process.exit(1);
}
if (body.error) {
  console.error(`Apps Script ответил ошибкой: ${body.error}`);
  process.exit(1);
}

const dir = join('data', 'snapshots');
await mkdir(dir, { recursive: true });

const stamp = body.fetchedAt.replace(/[:.]/g, '-');
const json = JSON.stringify(body, null, 2);
await writeFile(join(dir, `sheets-${stamp}.json`), json);
await writeFile(join(dir, 'latest.json'), json);

for (const [name, source] of Object.entries(body.sources)) {
  if (source.error) {
    console.warn(`${name}: ОШИБКА ${source.error}`);
    continue;
  }
  const sheets = source.sheets.map((s) => `${s.name} (${s.rows.length} строк)`).join(', ');
  console.log(`${name}: ${source.title} — ${sheets}`);
}
console.log(`Сохранено в ${dir}/latest.json и ${dir}/sheets-${stamp}.json`);
