require('dotenv/config');
const {PrismaClient}=require('../dist/generated/prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
async function main(){const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});try{const result=await db.session.deleteMany({where:{expiresAt:{lt:new Date()}}});console.log(`Removed ${result.count} expired sessions`);}finally{await db.$disconnect();}}
main().catch(()=>{console.error('Session cleanup failed');process.exitCode=1;});
