process.env.DATABASE_URL='postgresql://unused/unused';
const {Test}=require('@nestjs/testing');
const {AppModule}=require('../dist/app.module');
const {PrismaService}=require('../dist/prisma/prisma.service');
const {setupApp}=require('../dist/common/setup');
const {createDocumentation}=require('../dist/common/openapi');
const fs=require('node:fs');
async function main(){
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(PrismaService).useValue({}).compile();
  const app=module.createNestApplication({bodyParser:false});app.useLogger(false);setupApp(app);await app.init();
  fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/openapi.json',JSON.stringify(createDocumentation(app),null,2));
  await app.close();console.log('Exported OpenAPI without connecting to a database.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
