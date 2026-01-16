import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { getEvidence } from '../controllers/evidenceController';

const router = Router();

const EvidenceRequestSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  // Core argument/position to find evidence for/against
  coreArgument: z.string().optional(),
  // Summary text (used to infer argument if coreArgument not provided)
  summaryText: z.string().optional(),
});

router.post('/', validateRequest(EvidenceRequestSchema), getEvidence);

export default router;
