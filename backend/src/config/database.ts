// src/config/database.ts

import { PrismaClient } from '@prisma/client';

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