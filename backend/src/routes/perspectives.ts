import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { getPerspectives } from '../controllers/perspectivesController';

const router = Router();

const PerspectivesRequestSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
  articleLean: z.enum(['left', 'center-left', 'center', 'center-right', 'right', 'none']).optional(),
});

export type PerspectivesRequest = z.infer<typeof PerspectivesRequestSchema>;

router.post('/', validateRequest(PerspectivesRequestSchema), getPerspectives);

export default router;
