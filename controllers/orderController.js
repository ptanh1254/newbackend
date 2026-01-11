import Order from '../models/Order.js';
import Table from '../models/Table.js';
import mongoose from 'mongoose';

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: { $nin: ['paid', 'cancelled'] } }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { tableId, items, note, staffName } = req.body;
    
    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Dữ liệu đơn hàng không hợp lệ' });
    }

    // Validate items
    for (const item of items) {
      if (!item.name || !item.price || !item.quantity) {
        return res.status(400).json({ success: false, message: 'Thông tin mặt hàng không hợp lệ' });
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        return res.status(400).json({ success: false, message: 'Giá mặt hàng không hợp lệ' });
      }
      if (typeof item.quantity !== 'number' || item.quantity < 1) {
        return res.status(400).json({ success: false, message: 'Số lượng mặt hàng không hợp lệ' });
      }
    }

    const itemsWithStatus = items.map(item => ({
      _id: item._id || new mongoose.Types.ObjectId(),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      status: 'pending',
      note: item.note || item.notes || ''
    }));

    const existingOrder = await Order.findOne({
      tableId,
      status: { $nin: ['paid', 'cancelled'] }
    });

    if (existingOrder) {
      existingOrder.items = [...existingOrder.items, ...itemsWithStatus];
      if (note) {
        existingOrder.notes = existingOrder.notes ? `${existingOrder.notes}, ${note}` : note;
      }
      await existingOrder.save();

      if (req.io) {
        // Emit item added event
        req.io.emit('order-updated', existingOrder);
        // Also emit all orders update
        req.io.emit('orders_updated', await Order.find({ status: { $nin: ['paid', 'cancelled'] } }));
      }
      return res.json({ success: true, data: existingOrder });
    }

    const newOrder = new Order({
      tableId,
      items: itemsWithStatus,
      staffName: staffName || 'Staff',
      note: note || '',
      status: 'pending'
    });

    await newOrder.save();

    if (req.io) {
      // Emit new order event to specific clients
      req.io.emit('order-created', newOrder);
      // Also emit all orders update
      req.io.emit('orders_updated', await Order.find({ status: { $nin: ['paid', 'cancelled'] } }));
    }

    res.status(201).json({ success: true, data: newOrder });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo đơn hàng' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (req.io) {
      req.io.emit('orders_updated', await Order.find({ status: { $nin: ['paid', 'cancelled'] } }));
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái đơn hàng' });
  }
};

export const updateItemStatusByIndex = async (req, res) => {
  try {
    const { orderId, itemIdx } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' });
    }

    if (!['pending', 'cooking', 'served'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (!order.items[itemIdx]) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mặt hàng' });
    }

    const itemName = order.items[itemIdx].name;
    order.items[itemIdx].status = status;

    const allServed = order.items.every(item => item.status === 'served');
    if (allServed) {
      order.status = 'served';
    }

    await order.save();

    if (req.io) {
      req.io.emit('orders_updated', await Order.find({ status: { $nin: ['paid', 'cancelled'] } }));
      
      // Emit item-served event when item is marked as served
      if (status === 'served') {
        req.io.emit('item-served', {
          orderId: order._id,
          tableId: order.tableId,
          itemName: itemName,
          timestamp: new Date()
        });
      }
    }

    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái mặt hàng' });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' });
    }

    await Order.findByIdAndDelete(id);

    if (req.io) {
      req.io.emit('orders_updated', await Order.find({ status: { $nin: ['paid', 'cancelled'] } }));
    }

    res.json({ success: true, message: 'Đơn hàng đã được xóa' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa đơn hàng' });
  }
};

// Cập nhật items của order (xóa hoặc giảm số lượng)
export const updateOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    // Nếu items rỗng, xóa toàn bộ đơn hàng
    if (Array.isArray(items) && items.length === 0) {
      await Order.findByIdAndDelete(id);
      
      if (req.io) {
        req.io.emit('orders_updated', await Order.find({ status: { $nin: ['paid', 'cancelled'] } }));
      }
      
      return res.json({ success: true, message: 'Đơn hàng đã được xóa' });
    }

    // Cập nhật items
    if (Array.isArray(items)) {
      order.items = items.map(item => ({
        ...item,
        _id: item._id || new mongoose.Types.ObjectId()
      }));
    }

    // Cập nhật status nếu có
    if (status) {
      order.status = status;
    }

    await order.save();

    if (req.io) {
      req.io.emit('orders_updated', await Order.find({ status: { $nin: ['paid', 'cancelled'] } }));
    }

    res.json({ success: true, message: 'Cập nhật đơn hàng thành công', data: order });
  } catch (error) {
    console.error('Update order items error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật đơn hàng' });
  }
};

export const updateItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIndex, status } = req.body;

    const order = await Order.findById(id);
    if (order && order.items[itemIndex]) {
      order.items[itemIndex].status = status;
      await order.save();
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái' });
  }
};

export const completeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { discount, paymentMethod } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    order.status = 'served';
    order.discount = discount || 0;
    order.paymentMethod = paymentMethod;
    await order.save();

    if (req.io) {
      req.io.emit('orders_updated', await Order.find({ status: { $nin: ['paid', 'cancelled'] } }));
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi hoàn tất đơn hàng' });
  }
};

export const paymentProcess = async (req, res) => {
  try {
    let { orderIds, paymentMethod } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Dữ liệu thanh toán không hợp lệ' });
    }

    const methodMap = {
      'cash': 'Tiền mặt',
      'card': 'Chuyển khoản',
      'bank_transfer': 'Chuyển khoản',
      'Tiền mặt': 'Tiền mặt',
      'Chuyển khoản': 'Chuyển khoản'
    };

    if (!methodMap[paymentMethod]) {
      return res.status(400).json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });
    }

    paymentMethod = methodMap[paymentMethod];

    for (const orderId of orderIds) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ success: false, message: 'Order ID không hợp lệ' });
      }

      const order = await Order.findById(orderId);
      if (order) {
        const total = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        order.status = 'paid';
        order.paymentMethod = paymentMethod;
        order.paidAt = new Date();
        order.finalTotal = total - (order.discount || 0);
        await order.save();
      }
    }

    if (req.io) {
      req.io.emit('orders_updated', await Order.find({ status: { $nin: ['paid', 'cancelled'] } }));
    }

    res.json({ success: true, message: 'Thanh toán thành công' });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xử lý thanh toán' });
  }
};
