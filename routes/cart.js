import express from 'express';
import Cart from '../models/Cart.js';

const router = express.Router();

// Get cart by sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || sessionId.length < 5) {
      return res.status(400).json({ success: false, message: 'SessionId không hợp lệ' });
    }

    let cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = await Cart.create({ sessionId, items: [] });
    }
    res.json(cart);
  } catch (e) {
    console.error('Get cart error:', e);
    res.status(500).json({ success: false, message: 'Lỗi khi tải giỏ hàng' });
  }
});

// Add item to cart
router.post('/:sessionId/add', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { item } = req.body;

    if (!sessionId || !item?._id) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    let cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = new Cart({ sessionId, items: [] });
    }

    const existingItem = cart.items.find(i => i._id?.toString() === item._id?.toString());
    if (existingItem) {
      existingItem.quantity += (item.quantity || 1);
    } else {
      cart.items.push({
        _id: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1
      });
    }

    cart.updatedAt = new Date();
    await cart.save();

    res.json({ success: true, data: cart });
  } catch (e) {
    console.error('Add to cart error:', e);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm vào giỏ hàng' });
  }
});

// Update item quantity
router.put('/:sessionId/update/:itemId', async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const { quantity } = req.body;

    if (!sessionId || !itemId || quantity === undefined || quantity < 0) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Giỏ hàng không tồn tại' });
    }

    const item = cart.items.find(i => i._id?.toString() === itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Mục không tồn tại' });
    }

    if (quantity === 0) {
      cart.items = cart.items.filter(i => i._id?.toString() !== itemId);
    } else {
      item.quantity = quantity;
    }

    cart.updatedAt = new Date();
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (e) {
    console.error('Update cart error:', e);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật giỏ hàng' });
  }
});

// Remove item from cart
router.delete('/:sessionId/remove/:itemId', async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const { quantity } = req.body;

    if (!sessionId || !itemId) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Giỏ hàng không tồn tại' });
    }

    // Tìm item trong giỏ hàng
    const itemIndex = cart.items.findIndex(i => i._id?.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Món không tồn tại trong giỏ' });
    }

    // Nếu có quantity, giảm số lượng, nếu không thì xóa toàn bộ
    if (quantity && quantity > 0 && quantity < cart.items[itemIndex].quantity) {
      cart.items[itemIndex].quantity -= quantity;
    } else {
      // Xóa item nếu quantity >= số lượng hiện tại hoặc không có quantity
      cart.items = cart.items.filter((_, idx) => idx !== itemIndex);
    }
    
    cart.updatedAt = new Date();
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (e) {
    console.error('Remove from cart error:', e);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa khỏi giỏ hàng' });
  }
});

// Clear entire cart
router.delete('/:sessionId/clear', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'SessionId không hợp lệ' });
    }

    await Cart.deleteOne({ sessionId });
    res.json({ success: true, message: 'Giỏ hàng đã được xóa' });
  } catch (e) {
    console.error('Clear cart error:', e);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa giỏ hàng' });
  }
});

export default router;
