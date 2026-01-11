import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import Routes
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

// Import Middleware & Utils
import { authMiddleware } from './middleware/auth.js';
import { initializeAdmin } from './utils/initAdmin.js';
import * as orderController from './controllers/orderController.js';
import Order from './models/Order.js';

dotenv.config();

// Kiểm tra MONGO_URI (chỉ log warning chứ không exit để tránh crash loop trên Render nếu env load chậm)
if (!process.env.MONGO_URI) {
  console.warn('⚠️ CẢNH BÁO: Chưa tìm thấy MONGO_URI. Hãy kiểm tra Environment Variables trên Render.');
}

const app = express();
const httpServer = createServer(app);

// --- CẤU HÌNH QUAN TRỌNG CHO RENDER ---

// 1. Trust Proxy: Bắt buộc để Express nhận diện đúng IP và Protocol sau Load Balancer của Render
app.set('trust proxy', 1);

// 2. CORS "Mở Rộng": Chấp nhận dynamic origin để fix triệt để lỗi Blocked Cross-Origin
// Lưu ý: Khi ra production thực tế nên giới hạn lại domain cụ thể.
const corsOptions = {
  origin: true, // Phản hồi lại chính origin của request -> Luôn cho phép
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true, // Cho phép cookie/headers
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

// 3. Socket.io CORS: Cũng cần mở tương tự
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Ưu tiên websocket
  pingTimeout: 60000,
});

// Middleware Global
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Inject IO vào request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Hàm emit order
const emitAllOrders = async () => {
  try {
    const activeOrders = await Order.find({ 
      status: { $nin: ['paid', 'cancelled'] } 
    }).sort({ createdAt: 1 });
    io.emit('orders_updated', activeOrders);
  } catch (error) {
    console.error('⚠️ Lỗi emit orders:', error.message);
  }
};

// Socket Logic
io.on('connection', (socket) => {
  console.log(`👤 Socket connected: ${socket.id}`);
  
  socket.on('join-table', (tableId) => {
    if (tableId) socket.join(`table-${tableId}`);
  });

  socket.on('table-order-update', (data) => io.emit('table-order-updated', data));
  socket.on('order-status-change', (data) => io.emit('order-status-changed', data));
  socket.on('kitchen-order-ready', (data) => io.emit('order-ready', data));

  socket.on('cart-update', (data) => {
    if (data.tableId) io.to(`table-${data.tableId}`).emit('cart-updated', data);
  });

  socket.on('request_refresh', async () => await emitAllOrders());
});

// --- ROUTES ---

// Route Health Check (Quan trọng để Render biết App đang sống)
app.get('/', (req, res) => {
  res.status(200).send('✅ Server is running ready for Render!');
});

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

app.post('/api/pay', (req, res) => orderController.paymentProcess(req, res));

app.use((req, res) => res.status(404).json({ error: 'API Route not found' }));

app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// --- DATABASE & SERVER START ---

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("❌ Critical: MONGO_URI is missing!");
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout nhanh hơn để retry
      socketTimeoutMS: 45000,
      family: 4 // Bắt buộc dùng IPv4 để tránh lỗi IPv6 trên một số môi trường cloud
    });
    console.log('✓ Connected to MongoDB');
    await initializeAdmin();
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('⏳ Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Bắt buộc bind 0.0.0.0 trên Render

httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  connectDB();
});
