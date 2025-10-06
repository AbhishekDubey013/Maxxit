import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./nest-app.module";
import { startWorkers } from "./workers/index";
import { setupBullBoard } from "./bull-board";
import { config } from "./config/config";

async function bootstrap() {
  console.log("🚀 Starting Maxxit DeFi Backend...");
  
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix("api");
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  
  app.enableCors();
  
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Maxxit DeFi API")
    .setDescription("Agentic DeFi Trading Platform - REST API Documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, document);
  
  const expressApp = app.getHttpAdapter().getInstance();
  setupBullBoard(expressApp);
  
  const port = parseInt(config.PORT || "3000");
  await app.listen(port, "0.0.0.0");
  
  console.log(`✅ NestJS API running on http://0.0.0.0:${port}`);
  console.log(`📚 Swagger docs: http://0.0.0.0:${port}/api-docs`);
  console.log(`📊 Bull Board: http://0.0.0.0:${port}/admin/queues`);
  
  console.log("\n🔄 Starting BullMQ workers...");
  startWorkers();
  
  console.log("\n✅ Maxxit DeFi Backend fully operational!");
}

bootstrap().catch((error) => {
  console.error("❌ Failed to start application:", error);
  process.exit(1);
});
