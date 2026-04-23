import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const TD_LIST = [
  'город Астана',
  'город Алматы',
  'Акмолинская область',
  'Актюбинская область',
  'Алматинская область',
  'Атырауская область',
  'Западно-Казахстанская область',
  'Жамбылская область',
  'Карагандинская область',
  'Костанайская область',
  'Кызылординская область',
  'Мангистауская область',
  'Туркестанская область',
  'Павлодарская область',
  'Северо-Казахстанская область',
  'Восточно-Казахстанская область',
  'город Шымкент',
  'Область Абай',
  'Область Жетісу',
  'Область Ұлытау',
];

const PASSWORD = 'Test123';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const created = [];

  for (let i = 0; i < TD_LIST.length; i++) {
    const td_name = TD_LIST[i];
    const email = `td-${i + 1}@test.kz`;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      console.log(`SKIP  ${email} (already exists)`);
      continue;
    }

    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, td_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, hash, td_name, 'td', td_name],
    );

    created.push({ email, password: PASSWORD, td_name });
    console.log(`OK    ${email}  /  ${PASSWORD}  →  ${td_name}`);
  }

  console.log(`\nДобавлено: ${created.length} из ${TD_LIST.length}`);
  await pool.end();
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
