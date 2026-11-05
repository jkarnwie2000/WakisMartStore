// Drops temporary test schemas created by run-tests.js.
// Usage: node tests/drop-test-schemas.js <schemaName>   — drop one schema
//        node tests/drop-test-schemas.js --all          — drop every leftover wm_test_* schema
// Only names matching /^wm_test_\d+_\d+$/ are ever dropped; the "public" schema is never touched.
import { PrismaClient } from '@prisma/client';

const TEST_SCHEMA = /^wm_test_\d+_\d+$/;
const arg = process.argv[2];
const prisma = new PrismaClient();

try {
  let names;
  if (arg === '--all') {
    const rows = await prisma.$queryRaw`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'wm\_test\_%'`;
    names = rows.map((r) => r.schema_name);
  } else {
    names = [arg];
  }
  for (const name of names) {
    if (!TEST_SCHEMA.test(name || '')) {
      console.error(`Refusing to drop "${name}" — not a test schema.`);
      process.exitCode = 1;
      continue;
    }
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
    console.log(`Dropped test schema ${name}`);
  }
} finally {
  await prisma.$disconnect();
}
