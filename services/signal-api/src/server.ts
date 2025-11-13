import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import signalsRoutes from './routes/signals';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'signal-api',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/signals', signalsRoutes);

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[Signal API] Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Signal API Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
