import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: { 
      type: String, 
      enum: ['create', 'update', 'delete', 'login', 'logout', 'refund', 'payment'],
      required: true 
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    module: { 
      type: String, 
      enum: ['menu', 'order', 'staff', 'table', 'category', 'auth', 'report'],
      required: true 
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

// Auto-delete logs older than 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model('AuditLog', auditLogSchema);
