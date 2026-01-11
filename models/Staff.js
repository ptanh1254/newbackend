import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    phone: String,
    address: String,
    position: { type: String, default: 'staff' },
    salary: Number,
    joinDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('Staff', staffSchema);
