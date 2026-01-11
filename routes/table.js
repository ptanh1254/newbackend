import express from 'express';
import * as tableController from '../controllers/tableController.js';

const router = express.Router();

router.get('/', tableController.getTables);
router.post('/', tableController.createTable);
router.put('/:id', tableController.updateTable);
router.delete('/:id', tableController.deleteTable);

export default router;
