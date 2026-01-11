import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    tableId: { type: String, required: true },
    tableName: String,
    staffName: String,
    items: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        name: String,
        price: { type: Number, min: 0 },
        quantity: { type: Number, min: 1 },
        note: String,
        notes: String,
        status: { type: String, default: 'pending', enum: ['pending', 'cooking', 'served', 'new'] }
      }
    ],
    status: { type: String, default: 'pending', enum: ['pending', 'cooking', 'served', 'paid', 'new', 'completed', 'cancelled'] },
    paymentMethod: String,
    finalTotal: { type: Number, min: 0 },
    totalAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    notes: String,
    paidAt: Date,
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    refundAmount: { type: Number, default: 0 },
    refundReason: String,
    refundedAt: Date
  },
  { timestamps: true }
);

// Index for common queries
orderSchema.index({ tableId: 1, status: 1 });
orderSchema.index({ status: 1, paidAt: -1 });

export default mongoose.model('Order', orderSchema);
