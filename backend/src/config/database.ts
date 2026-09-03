// src/config/database.ts

import { PrismaClient } from '@prisma/client';

// Detect whether the runtime connection goes through a PgBouncer transaction
// pooler (Supabase port 6543). Prisma must use `?pgbouncer=true` so it does not
// rely on named prepared statements, which the transaction pooler does not support
// (this is the root cause of `prepared statement "s4" does not exist`).
const DATABASE_URL = process.env.DATABASE_URL || '';

function warnPoolerConfig(): void {
  const isSupabasePooler = /:\/\/[^@]+@[^:]+:6543\//.test(DATABASE_URL);
  const hasPgbouncerFlag = /pgbouncer=true/.test(DATABASE_URL);

  if (isSupabasePooler && !hasPgbouncerFlag) {
    console.error(
      '❌ DATABASE_URL points to the Supabase transaction pooler (port 6543) but is missing `?pgbouncer=true`.\n' +
      '   Prisma will use named prepared statements, which the transaction pooler does not support,\n' +
      '   causing intermittent `prepared statement ... does not exist` errors.\n' +
      '   Add `?pgbouncer=true&connection_limit=1` to DATABASE_URL.'
    );
    if (process.env.NODE_ENV === 'production') process.exit(1);
  } else if (hasPgbouncerFlag) {
    console.log('ℹ️  PgBouncer mode detected — prepared statements disabled (pgbouncer=true)');
  }
}

warnPoolerConfig();

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database');
    await recoverStuckJobs();
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

async function recoverStuckJobs(): Promise<void> {
  const stuck = await prisma.uploadJob.updateMany({
    where: { status: 'PROCESSING' },
    data: { status: 'REJECTED', aiSummary: 'Processing interrupted by server restart. Please re-upload the file.' },
  });
  if (stuck.count > 0) {
    console.warn(`⚠️  Recovered ${stuck.count} stuck upload job(s) from previous crash`);
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('📤 Disconnected from database');
}