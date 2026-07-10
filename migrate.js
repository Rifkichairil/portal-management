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
  
  // Add agent_force_client_id column
  await client.query('ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS agent_force_client_id TEXT;');
  console.log('Added agent_force_client_id column');
  
  // Add agent_force_client_secret column
  await client.query('ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS agent_force_client_secret TEXT;');
  console.log('Added agent_force_client_secret column');
  
  // Add severity column to case table
  await client.query('ALTER TABLE IF EXISTS public."case" ADD COLUMN IF NOT EXISTS severity TEXT;');
  console.log('Added severity column to case table');

  console.log('Migration successful!');
  await client.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
