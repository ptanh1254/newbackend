import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import menuRoutes from "./routes/menu.js";
import categoryRoutes from "./routes/category.js";
import staffRoutes from "./routes/staff.js";
import tableRoutes from "./routes/table.js";
import orderRoutes from "./routes/order.js";
import reportRoutes from "./routes/report.js";
import refundRoutes from "./routes/refund.js";
import initRoutes from "./routes/init.js";
import cartRoutes from "./routes/cart.js";
import settingsRoutes from "./routes/settings.js";

import { authMiddleware } from "./middleware/auth.js";
import { initializeAdmin } from "./utils/initAdmin.js";
import * as orderController from "./controllers/orderController.js";
import Order from "./models/Order.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

/* =======================
   CORS CONFIG (CORE FIX)
======================= */

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

/* Express CORS */
app.use(cors({
  origin: (origin, callback) => {
    // Cho Postman / mobile / server-to-server
    if (!origin) return callback(null, true);

    // Capacitor (Android / iOS)
    if (origin === "capacitor://localhost") return callback(null, true);
    if (origin === "ionic://localhost") return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

/* =======================
   BODY PARSER
======================= */

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* =======================
   SOCKET.IO
======================= */

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (origin === "capacitor://localhost") return callback(null, true);
      if (origin === "ionic://localhost") return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Socket CORS blocked"));
    },
    credentials: true
  },
  transports: ["websocket", "polling"]
});

/* =======================
   SOCKET EVENTS
======================= */

const emitAllOrders = async () => {
  const activeOrders = await Order.find({
    status: { $nin: ["paid", "cancelled"] }
  }).sort({ createdAt: 1 });

  io.emit("orders_updated", activeOrders);
};

io.on("connection", (socket) => {
  console.log("👤 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("👤 Socket disconnected:", socket.id);
  });

  socket.on("join-table", (tableId) => {
    socket.join(`table-${tableId}`);
  });

  socket.on("cart-update", (data) => {
    io.to(`table-${data.tableId}`).emit("cart-updated", data);
  });

  socket.on("order-status-change", (data) => {
    io.emit("order-status-changed", data);
  });

  socket.on("request_refresh", emitAllOrders);
});

/* =======================
   ATTACH IO TO REQ
======================= */

app.use((req, res, next) => {
  req.io = io;
  next();
});

/* =======================
   ROUTES
======================= */

app.use("/api/auth", authRoutes);
app.use("/api/init", initRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/table", tableRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);

app.use("/api/staff", authMiddleware, staffRoutes);
app.use("/api/report", authMiddleware, reportRoutes);
app.use("/api/refund", authMiddleware, refundRoutes);
app.use("/api/settings", authMiddleware, settingsRoutes);

/* Payment */
app.post("/api/pay", (req, res) => {
  return orderController.paymentProcess(req, res);
});

/* =======================
   ERROR HANDLER
======================= */

app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  res.status(500).json({ error: err.message });
});

/* =======================
   DB + SERVER
======================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✓ MongoDB connected");
    initializeAdmin();
  })
  .catch(err => {
    console.error("❌ Mongo error:", err.message);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export { io };
