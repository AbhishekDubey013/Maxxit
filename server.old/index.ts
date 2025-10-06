import "reflect-metadata";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./nest-app.module";
import { startWorkers } from "./workers/index";
import { setupBullBoard } from "./bull-board";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  log("🚀 Starting Maxxit DeFi Platform...");
  
  // Start NestJS API on port 3000
  const nestApp = await NestFactory.create(AppModule);
  
  nestApp.setGlobalPrefix("api");
  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  nestApp.enableCors();
  
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Maxxit DeFi API")
    .setDescription("Agentic DeFi Trading Platform - REST API Documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(nestApp, swaggerConfig);
  SwaggerModule.setup("api-docs", nestApp, document);
  
  const expressApp = nestApp.getHttpAdapter().getInstance();
  
  const { config } = await import('./config/config');
  setupBullBoard(expressApp, config.REDIS_URL);
  
  await nestApp.listen(3000, "0.0.0.0");
  log(`✅ NestJS API running on http://0.0.0.0:3000`);
  log(`📚 Swagger docs: http://0.0.0.0:3000/api-docs`);
  log(`📊 Bull Board: http://0.0.0.0:3000/admin/queues`);
  
  // Start BullMQ workers
  log("🔄 Starting BullMQ workers...");
  startWorkers();
  
  // Start frontend server on port 5000
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`✅ Frontend serving on port ${port}`);
    log(`\n🎉 Maxxit DeFi Platform fully operational!`);
  });
})();
