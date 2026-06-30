import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const testSchemaPath = path.join(projectRoot, 'prisma', 'schema-test.prisma');
const testDbPath = path.join(projectRoot, 'prisma', 'test.db');

// Generate test Prisma client (SQLite provider, separate output)
execSync(`npx prisma generate --schema="${testSchemaPath}"`, {
  cwd: projectRoot,
  stdio: 'pipe',
});

// Push schema to test DB (creates/resets the SQLite file)
execSync(`npx prisma db push --schema="${testSchemaPath}" --force-reset --accept-data-loss`, {
  cwd: projectRoot,
  stdio: 'pipe',
});

// Import PrismaClient from the test-specific generated client
const require = createRequire(import.meta.url);
const clientPath = path.join(projectRoot, 'node_modules', '.prisma', 'client-test');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require(clientPath) as {
  PrismaClient: new (opts?: unknown) => import('@prisma/client').PrismaClient;
};

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${testDbPath}`,
    },
  },
});

export default testPrisma;
