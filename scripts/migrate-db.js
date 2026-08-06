// One-off data migration: copy all rows from DATABASE_URL (source) to
// SUPABASE_DB_URL (target), both read from the root .env. Target schema must
// already exist (run `prisma db push` against it first).
//
// Tables are inserted in dependency order; a retry pass handles anything
// missed. Rows are inserted with their original ids via createMany +
// skipDuplicates, so the script is safe to re-run.
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const source = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const target = new PrismaClient({ datasources: { db: { url: process.env.SUPABASE_DB_URL } } });

// Parents before children (FK order).
const MODELS = [
  'college',
  'collegeCourse',
  'user',
  'student',
  'alumni',
  'notification',
  'resume',
  'internship',
  'company',
  'companyContact',
  'job',
  'jobRound',
  'interviewRound',
  'application',
  'applicationRound',
  'applicationStageHistory',
  'refreshToken',
  'passwordResetToken',
  'auditLog',
];

async function main() {
  const rows = {};
  for (const m of MODELS) {
    rows[m] = await source[m].findMany();
  }
  console.log(
    'Source rows:',
    Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length])),
  );

  const pending = new Set(MODELS.filter((m) => rows[m].length > 0));
  for (let pass = 1; pass <= 5 && pending.size > 0; pass++) {
    for (const m of [...pending]) {
      try {
        const res = await target[m].createMany({ data: rows[m], skipDuplicates: true });
        console.log(`${m}: inserted ${res.count}/${rows[m].length}`);
        pending.delete(m);
      } catch (e) {
        console.log(`${m}: pass ${pass} failed (${e.message.split('\n')[0]}), will retry`);
      }
    }
  }
  if (pending.size > 0) {
    throw new Error(`Could not insert: ${[...pending].join(', ')}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
