import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use(routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
  });
});

// Error handler (handles ZodError and other errors)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         ClearView News Backend Server                 ║
╠═══════════════════════════════════════════════════════╣
║  Environment: ${config.environment.padEnd(39)}║
║  Port: ${config.port.toString().padEnd(46)}║
║  Daily Cost Cap: $${config.dailyCostCap.toString().padEnd(35)}║
╚═══════════════════════════════════════════════════════╝
  `);
  console.log(`Health check available at: http://localhost:${config.port}/health`);
  console.log(`API v1 available at: http://localhost:${config.port}/api/v1`);
});

export default app;
