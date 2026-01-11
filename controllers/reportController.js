import Order from '../models/Order.js';

// Lấy tất cả reports (đơn hàng đã thanh toán)
export const getAllReports = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'paid' })
      .sort({ paidAt: -1 });

    const reports = orders.map(order => ({
      _id: order._id,
      items: order.items || [],
      finalTotal: order.finalTotal || 0,
      paymentMethod: order.paymentMethod || 'Tiền mặt',
      status: order.status,
      tableName: order.tableName || 'Mang về',
      staffName: order.staffName || '-',
      paidAt: order.paidAt || order.updatedAt,
      createdAt: order.createdAt
    }));

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDailySales = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      paidAt: { $gte: startOfDay },
      status: 'paid'
    });

    const totalSales = orders.reduce((sum, order) => sum + (order.finalTotal || 0), 0);
    const orderCount = orders.length;

    res.json({
      totalSales,
      orderCount,
      avgOrderValue: orderCount > 0 ? totalSales / orderCount : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMonthlySales = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      paidAt: { $gte: startOfMonth },
      status: 'paid'
    });

    const totalSales = orders.reduce((sum, order) => sum + (order.finalTotal || 0), 0);
    const orderCount = orders.length;

    res.json({
      totalSales,
      orderCount,
      avgOrderValue: orderCount > 0 ? totalSales / orderCount : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPopularMenu = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'paid' });

    const menuStats = {};
    orders.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.name;
          menuStats[key] = {
            name: item.name,
            quantity: (menuStats[key]?.quantity || 0) + item.quantity,
            totalSales: (menuStats[key]?.totalSales || 0) + (item.price * item.quantity)
          };
        });
      }
    });

    const popular = Object.values(menuStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    res.json(popular);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
