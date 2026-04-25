const { Client } = require('pg');

const client = new Client({ 
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.ooazwrhddsxibfxssdzc',
  password: 'Support@2025!!',
  ssl: { rejectUnauthorized: false } 
});

async function run() {
  await client.connect();
  console.log('Connected!');
  const result = await client.query('ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS salesforce_enabled BOOLEAN DEFAULT FALSE;');
  console.log('Migration successful!', result.command);
  await client.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
