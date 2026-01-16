import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { getEvidence } from '../controllers/evidenceController';

const router = Router();

const EvidenceRequestSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  claims: z.array(z.string()).min(1, 'At least one claim is required'),
});

router.post('/', validateRequest(EvidenceRequestSchema), getEvidence);

export default router;
