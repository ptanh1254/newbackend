import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    tableId: String,
    items: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        name: String,
        price: { type: Number, min: 0 },
        quantity: { type: Number, min: 1 }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model('Cart', cartSchema);
