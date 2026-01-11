import express from 'express';
import * as orderController from '../controllers/orderController.js';

const router = express.Router();

router.get('/', orderController.getOrders);
router.post('/', orderController.createOrder);
router.post('/payment', orderController.paymentProcess);
router.put('/:orderId/items/:itemIdx', orderController.updateItemStatusByIndex);
router.put('/:id/status', orderController.updateOrderStatus);
router.put('/:id/item-status', orderController.updateItemStatus);
router.put('/:id/complete', orderController.completeOrder);
router.put('/:id', orderController.updateOrderItems);
router.delete('/:id', orderController.deleteOrder);

export default router;
