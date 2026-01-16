import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error Handler]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.issues,
    });
    return;
  }

  // OpenAI API errors
  if (err.name === 'OpenAIError' || err.message.includes('OpenAI')) {
    res.status(503).json({
      error: 'AI service temporarily unavailable',
      message: 'Please try again in a moment',
    });
    return;
  }

  // Exa API errors
  if (err.message.includes('Exa') || err.message.includes('search')) {
    res.status(503).json({
      error: 'Search service temporarily unavailable',
      message: 'Please try again in a moment',
    });
    return;
  }

  // Budget exceeded
  if (err.message.includes('budget') || err.message.includes('cost')) {
    res.status(429).json({
      error: 'Service temporarily paused',
      message: 'Daily usage limit reached. Please try again tomorrow.',
    });
    return;
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
}
