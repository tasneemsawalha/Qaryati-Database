import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { setupApp } from './common/setup';
import { createDocumentation } from './common/openapi';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  setupApp(app);
  SwaggerModule.setup('api-docs', app, createDocumentation(app));
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
void bootstrap();
