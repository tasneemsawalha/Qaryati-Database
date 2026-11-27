const fs=require('node:fs');
const [beforePath,afterPath]=process.argv.slice(2);
if(!beforePath||!afterPath) throw new Error('Usage: node performance/compare.cjs before.json after.json');
function row(path){const m=JSON.parse(fs.readFileSync(path,'utf8')).metrics;const v=x=>x?.values||x;return {avg_ms:v(m.http_req_duration)?.avg,p95_ms:v(m.http_req_duration)?.['p(95)'],throughput_rps:v(m.http_reqs)?.rate,error_rate:v(m.http_req_failed)?.rate ?? v(m.http_req_failed)?.value};}
console.log(JSON.stringify({before:row(beforePath),after:row(afterPath)},null,2));
