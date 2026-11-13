import dotenv from 'dotenv';
import { store } from './store.js';

dotenv.config();

async function run() {
  const email = process.env.ADMIN_EMAIL?.trim() || process.argv[2]?.trim();
  const password = process.env.ADMIN_PASSWORD || process.argv[3];
  const name = process.env.ADMIN_NAME?.trim() || process.argv[4]?.trim() || 'RideNexa Administrator';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Error: Provide a valid ADMIN_EMAIL environment variable or first argument.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('Error: Provide an ADMIN_PASSWORD environment variable (min 8 characters) or second argument.');
    process.exit(1);
  }

  await store.init();
  const admin = await store.provisionAdmin({ email, password, name });
  console.log(`[RideNexa] Provisioned Admin user: ${admin.email} (id: ${admin.id}, mode: ${store.databaseMode})`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[RideNexa] Failed to provision admin:', err);
  process.exit(1);
});
