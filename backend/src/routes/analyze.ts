import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { analyzeArticle } from '../controllers/analyzeController';

const router = Router();

const AnalyzeRequestSchema = z.object({
  url: z.string().url(),
  content: z.string().min(100, 'Article content must be at least 100 characters'),
  title: z.string().min(1, 'Title is required'),
  source: z.string().min(1, 'Source is required'),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

router.post('/', validateRequest(AnalyzeRequestSchema), analyzeArticle);

export default router;
