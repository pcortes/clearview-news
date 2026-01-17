import { Router, Request, Response } from 'express';
import { getCostStatus } from '../services/costTracker';
import { lookupDOI } from '../services/crossref';
import { searchNews, searchAcademic, isConfigured as isExaConfigured } from '../services/exa';
import { openaiService } from '../services/openai';
import { config } from '../config';
import analyzeRoutes from './analyze';
import analyzeStreamRoutes from './analyzeStream';
import perspectivesRoutes from './perspectives';
import evidenceRoutes from './evidence';
import evaluateRoutes from './evaluate';

const router = Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API v1 routes
const apiV1Router = Router();

// Cost status endpoint (useful for monitoring)
apiV1Router.get('/cost-status', (_req: Request, res: Response) => {
  res.json(getCostStatus());
});

// Test endpoint for DOI verification
apiV1Router.post('/test/verify-doi', async (req: Request, res: Response) => {
  const { doi } = req.body;

  if (!doi || typeof doi !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid "doi" field in request body',
    });
    return;
  }

  try {
    const metadata = await lookupDOI(doi);
    res.json(metadata);
  } catch (error) {
    console.error('[DOI Verify] Unexpected error:', (error as Error).message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify DOI',
    });
  }
});

// Test endpoint for Exa news search
apiV1Router.post('/test/exa/news', async (req: Request, res: Response) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid "topic" field in request body',
    });
    return;
  }

  if (!isExaConfigured()) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Exa API is not configured. Please set EXA_API_KEY environment variable.',
    });
    return;
  }

  try {
    const results = await searchNews(topic);
    res.json(results);
  } catch (error) {
    console.error('[Exa News] Error:', (error as Error).message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search news',
    });
  }
});

// Test endpoint for Exa academic search
apiV1Router.post('/test/exa/academic', async (req: Request, res: Response) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid "topic" field in request body',
    });
    return;
  }

  if (!isExaConfigured()) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Exa API is not configured. Please set EXA_API_KEY environment variable.',
    });
    return;
  }

  try {
    const results = await searchAcademic(topic);
    res.json(results);
  } catch (error) {
    console.error('[Exa Academic] Error:', (error as Error).message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search academic papers',
    });
  }
});

// Test endpoint for OpenAI completions
apiV1Router.get('/test/openai', async (req: Request, res: Response) => {
  const { prompt } = req.query;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid "prompt" query parameter',
    });
    return;
  }

  if (!config.openaiApiKey) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'OpenAI API is not configured. Please set OPENAI_API_KEY environment variable.',
    });
    return;
  }

  try {
    const completion = await openaiService.complete(prompt);
    res.json({
      prompt,
      completion,
      model: config.openaiModel,
    });
  } catch (error) {
    console.error('[OpenAI Test] Error:', (error as Error).message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: (error as Error).message || 'Failed to complete prompt',
    });
  }
});

// Wire up feature routes
apiV1Router.use('/analyze', analyzeRoutes);
apiV1Router.use('/analyze', analyzeStreamRoutes);  // Adds /analyze/stream
apiV1Router.use('/perspectives', perspectivesRoutes);
apiV1Router.use('/evidence', evidenceRoutes);
apiV1Router.use('/evaluate', evaluateRoutes);  // Wave 7: Full pipeline evaluation

// API index endpoint
apiV1Router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'ClearView News API v1',
    endpoints: [
      'GET /api/v1/cost-status',
      'POST /api/v1/test/verify-doi',
      'POST /api/v1/test/exa/news',
      'POST /api/v1/test/exa/academic',
      'GET /api/v1/test/openai?prompt=<string>',
      'POST /api/v1/analyze',
      'POST /api/v1/perspectives',
      'POST /api/v1/evidence',
      'POST /api/v1/evaluate',
      'POST /api/v1/evaluate/quick',
      'POST /api/v1/evaluate/claim',
      'GET /api/v1/evaluate/health',
    ],
  });
});

router.use('/api/v1', apiV1Router);

export default router;
