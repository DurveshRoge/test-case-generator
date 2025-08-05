import express from 'express';
import * as githubController from '../controllers/githubController.js';

const router = express.Router();

router.post('/repo-files', githubController.getRepoFiles);
router.post('/create-pr', githubController.createPullRequest);
router.post('/file-content', githubController.getFileContent);

export default router;
