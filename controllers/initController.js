import Table from '../models/Table.js';
import Menu from '../models/Menu.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';

export const getInitData = async (req, res) => {
  try {
    const tables = await Table.find().sort({ order: 1, name: 1 });
    const menu = await Menu.find().sort({ order: 1, name: 1 });
    const categories = await Category.find().sort({ order: 1 });
    const activeOrders = await Order.find({ status: { $ne: 'paid' } }).sort({ createdAt: -1 });

    // Minimal settings placeholder (extend later if you have a settings collection)
    const settings = {};

    res.json({ tables, menu, categories, activeOrders, settings });
  } catch (error) {
    console.error('Init data error:', error);
    res.status(500).json({ error: error.message });
  }
};

export default { getInitData };
