import express from 'express';
import initController from '../controllers/initController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Return aggregated initial data used by client
router.get('/', /*authMiddleware,*/ initController.getInitData);

export default router;
