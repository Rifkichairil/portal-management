const bcrypt = require('bcryptjs');

async function generateHashes() {
  const passwords = [
    { label: 'Admin#2026!', var: 'adminHash' },
    { label: 'Manager#2026!', var: 'managerHash' },
    { label: 'Submitter#2026!', var: 'submitterHash' },
  ];

  for (const p of passwords) {
    const hash = await bcrypt.hash(p.label, 12);
    console.log(`-- ${p.label}`);
    console.log(`-- ${p.var} = '${hash}'`);
    console.log();
  }
}

generateHashes();
