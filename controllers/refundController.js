import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';

// Refund an existing order
export const refundOrder = async (req, res) => {
  try {
    const { orderId, refundAmount, reason } = req.body;

    // Validate inputs
    if (!orderId || !refundAmount || refundAmount <= 0) {
      return res.status(400).json({ error: 'Invalid refund amount' });
    }

    const order = await Order.findById(orderId).populate('table');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if already refunded
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order already cancelled' });
    }

    // Validate refund amount
    if (refundAmount > order.finalAmount) {
      return res.status(400).json({ 
        error: `Refund amount (${refundAmount}) exceeds total (${order.finalAmount})` 
      });
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        status: 'cancelled',
        refundAmount,
        refundReason: reason || 'Customer request',
        refundedAt: new Date(),
        refundedBy: req.user.id
      },
      { new: true }
    ).populate('table').populate('createdBy');

    // Create audit log
    await AuditLog.create({
      action: 'refund',
      user: req.user.id,
      module: 'order',
      details: {
        orderId,
        refundAmount,
        reason: reason || 'Customer request',
        originalTotal: order.finalAmount
      },
      status: 'success'
    });

    // Emit socket event
    req.io?.emit('order-refunded', {
      orderId,
      refundAmount,
      table: order.table?.name
    });

    res.json({
      message: 'Refund processed successfully',
      order: updatedOrder,
      refundAmount
    });
  } catch (error) {
    // Log failed refund
    await AuditLog.create({
      action: 'refund',
      user: req.user.id,
      module: 'order',
      details: { error: error.message },
      status: 'failed'
    });

    res.status(500).json({ error: error.message });
  }
};

// Get refund history
export const getRefundHistory = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const filter = { status: 'cancelled', refundedAt: { $exists: true } };

    if (startDate || endDate) {
      filter.refundedAt = {};
      if (startDate) filter.refundedAt.$gte = new Date(startDate);
      if (endDate) filter.refundedAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      Order.find(filter)
        .populate('table')
        .populate('createdBy', 'username')
        .populate('refundedBy', 'username')
        .sort({ refundedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    res.json({
      refunds,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get refund statistics
export const getRefundStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { status: 'cancelled', refundedAt: { $exists: true } };

    if (startDate || endDate) {
      filter.refundedAt = {};
      if (startDate) filter.refundedAt.$gte = new Date(startDate);
      if (endDate) filter.refundedAt.$lte = new Date(endDate);
    }

    const stats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRefunds: { $sum: '$refundAmount' },
          refundCount: { $sum: 1 },
          avgRefund: { $avg: '$refundAmount' },
          maxRefund: { $max: '$refundAmount' }
        }
      }
    ]);

    const topReasons = await Order.aggregate([
      { $match: filter },
      { $group: { _id: '$refundReason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      stats: stats[0] || {
        totalRefunds: 0,
        refundCount: 0,
        avgRefund: 0,
        maxRefund: 0
      },
      topReasons
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Undo refund (only if recent)
export const undoRefund = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order || order.status !== 'cancelled' || !order.refundedAt) {
      return res.status(400).json({ error: 'Cannot undo this refund' });
    }

    // Only allow undo within 1 hour
    const refundTime = new Date(order.refundedAt).getTime();
    const now = new Date().getTime();
    if (now - refundTime > 3600000) { // 1 hour
      return res.status(400).json({ error: 'Refund is older than 1 hour' });
    }

    // Restore order
    const restored = await Order.findByIdAndUpdate(
      orderId,
      {
        status: 'completed',
        refundAmount: 0,
        refundReason: null,
        refundedAt: null,
        refundedBy: null
      },
      { new: true }
    ).populate('table').populate('createdBy');

    // Log undo
    await AuditLog.create({
      action: 'update',
      user: req.user.id,
      module: 'order',
      details: { action: 'undo_refund', orderId },
      status: 'success'
    });

    res.json({ message: 'Refund undone', order: restored });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
