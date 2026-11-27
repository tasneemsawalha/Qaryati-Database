// Run only inside the disposable benchmark build; do not modify the working copy.
const fs = require('node:fs');
if (process.cwd() !== '/app' || process.env.QARYATI_BENCHMARK_BUILD !== '1') {
  throw new Error('Run this script only inside the benchmark Docker build.');
}
const stage = process.argv[2];
if (!['before', 'after'].includes(stage)) throw new Error('Stage must be before or after');
if (stage === 'before') {
  fs.copyFileSync('/app/performance/baseline/villages.service.ts.txt', '/app/src/villages/villages.service.ts');
  fs.rmSync('/app/prisma/migrations/20261018010000_search_trigram_indexes', { recursive: true });
}
fs.writeFileSync('/app/performance-stage.txt', stage + '\n');
console.log(`Prepared ${stage} benchmark image; working source files are not mounted.`);
