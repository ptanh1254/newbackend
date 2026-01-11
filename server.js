import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import categoryRoutes from './routes/category.js';
import staffRoutes from './routes/staff.js';
import tableRoutes from './routes/table.js';
import orderRoutes from './routes/order.js';
import reportRoutes from './routes/report.js';
import refundRoutes from './routes/refund.js';
import initRoutes from './routes/init.js';
import cartRoutes from './routes/cart.js';
import settingsRoutes from './routes/settings.js';
import { authMiddleware } from './middleware/auth.js';
import { initializeAdmin } from './utils/initAdmin.js';
import * as orderController from './controllers/orderController.js';
import Order from './models/Order.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Emit all active orders
const emitAllOrders = async () => {
  try {
    const activeOrders = await Order.find({ status: { $nin: ['paid', 'cancelled'] } }).sort({ createdAt: 1 });
    io.emit('orders_updated', activeOrders);
  } catch (error) {
    console.error('Error emitting orders:', error);
  }
};

// Socket.io
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });

  // Join room for specific table
  socket.on('join-table', (tableId) => {
    socket.join(`table-${tableId}`);
    console.log(`🚪 User ${socket.id} joined table-${tableId}`);
  });

  socket.on('table-order-update', (data) => {
    io.emit('table-order-updated', data);
  });

  socket.on('order-status-change', (data) => {
    io.emit('order-status-changed', data);
  });

  socket.on('kitchen-order-ready', (data) => {
    io.emit('order-ready', data);
  });

  // Handle cart updates
  socket.on('cart-update', (data) => {
    io.to(`table-${data.tableId}`).emit('cart-updated', data);
  });

  // Request full orders refresh
  socket.on('request_refresh', async () => {
    await emitAllOrders();
  });
});

// Attach io to app
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/init', initRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/staff', authMiddleware, staffRoutes);
app.use('/api/table', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/report', authMiddleware, reportRoutes);
app.use('/api/refund', authMiddleware, refundRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);

// Payment endpoint
app.post('/api/pay', (req, res) => {
  req.io = io;
  return orderController.paymentProcess(req, res);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority'
})
  .then(() => {
    console.log('✓ Connected to MongoDB');
    initializeAdmin();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for Android emulator
httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});

export { io };
