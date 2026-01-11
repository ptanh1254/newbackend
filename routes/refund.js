import express from 'express';
import {
  refundOrder,
  getRefundHistory,
  getRefundStats,
  undoRefund
} from '../controllers/refundController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Process refund
router.post('/', authMiddleware, refundOrder);

// Get refund history
router.get('/history', authMiddleware, getRefundHistory);

// Get refund statistics
router.get('/stats', authMiddleware, getRefundStats);

// Undo recent refund
router.put('/:orderId/undo', authMiddleware, undoRefund);

export default router;
