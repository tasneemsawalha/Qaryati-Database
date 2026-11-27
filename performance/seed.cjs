require('dotenv/config');
const { PrismaClient } = require('../dist/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || new URL(url).pathname !== '/qaryati_benchmark')
    throw new Error('Use a dedicated database with benchmark in its name');
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    if (await db.village.count())
      throw new Error(
        'Benchmark database must contain no villages. Refusing to append or erase data.',
      );
    for (let batch = 0; batch < 100; batch++)
      await db.village.createMany({
        data: Array.from({ length: 100 }, (_, i) => ({
          arabicName: `Synthetic village ${batch * 100 + i}`,
          englishName: `Synthetic ${batch * 100 + i}`,
          governorate: `Benchmark ${i % 10}`,
        })),
      });
    console.log(
      'Added 10,000 clearly synthetic villages. Do not use as factual data.',
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
