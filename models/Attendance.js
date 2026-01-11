import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: Date,
    date: { type: Date, default: () => new Date().setHours(0, 0, 0, 0) },
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
    notes: String
  },
  { timestamps: true }
);

export default mongoose.model('Attendance', attendanceSchema);
