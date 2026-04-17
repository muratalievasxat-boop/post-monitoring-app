import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_cwGUTQv53jIB@ep-young-thunder-alshcvp2-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});
