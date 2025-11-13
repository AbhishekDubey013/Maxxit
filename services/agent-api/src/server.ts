import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import agentRoutes from './routes/agents';
import agentAccountsRoutes from './routes/agent-accounts';
import routingStatsRoutes from './routes/routing-stats';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'agent-api',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/agent-accounts', agentAccountsRoutes);
app.use('/api/routing-stats', routingStatsRoutes);

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[Agent API] Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agent API Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;

