import express from 'express';
import * as staffController from '../controllers/staffController.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', staffController.getStaff);
router.post('/', adminMiddleware, staffController.createStaff);
router.put('/:id', adminMiddleware, staffController.updateStaff);
router.delete('/:id', adminMiddleware, staffController.deleteStaff);

export default router;
