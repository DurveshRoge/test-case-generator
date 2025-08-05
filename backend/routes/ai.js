import express from 'express';
import * as aiController from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate-summaries', aiController.generateSummaries);
router.post('/generate-code', aiController.generateCode);

export default router;
