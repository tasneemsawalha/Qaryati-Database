require('dotenv/config');
const {PrismaClient}=require('../dist/generated/prisma/client');
const {PrismaPg}=require('@prisma/adapter-pg');
const {hashPassword}=require('../dist/auth/password');
async function main(){
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD;
  if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password || password.length<12 || password.length>128) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12-128 characters)');
  const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
  try{
    if(await db.user.findUnique({where:{email}})) throw new Error('User already exists; use the audited role API for existing accounts');
    await db.$transaction(async tx=>{
      const user=await tx.user.create({data:{email,passwordHash:await hashPassword(password),role:'ADMIN'}});
      await tx.auditLog.create({data:{actorId:user.id,action:'BOOTSTRAP_ADMIN',entity:'User',entityId:user.id,after:{id:user.id,email:user.email,role:user.role}}});
    });
    console.log('Administrator created. Remove ADMIN_PASSWORD from your environment.');
  }finally{await db.$disconnect();}
}
main().catch(()=>{console.error('Admin creation failed. Check inputs, database connectivity, and whether the account exists.');process.exitCode=1;});
