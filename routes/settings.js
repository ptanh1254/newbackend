import express from 'express';
import * as settingsController from '../controllers/settingsController.js';

const router = express.Router();

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

export default router;
