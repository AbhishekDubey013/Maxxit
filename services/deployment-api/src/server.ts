import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import hyperliquidRoutes from './routes/hyperliquid';
import ostiumRoutes from './routes/ostium';
import deploymentsRoutes from './routes/deployments';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'deployment-api',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/hyperliquid', hyperliquidRoutes);
app.use('/api/ostium', ostiumRoutes);
app.use('/api/deployments', deploymentsRoutes);

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[Deployment API] Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Deployment API Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;

