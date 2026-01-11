import express from 'express';
import * as reportController from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, reportController.getAllReports);
router.get('/daily', authMiddleware, reportController.getDailySales);
router.get('/monthly', authMiddleware, reportController.getMonthlySales);
router.get('/popular-menu', authMiddleware, reportController.getPopularMenu);

export default router;
