import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'Mr Duc POS' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  receiptFooter: { type: String, default: 'Cảm ơn quý khách!' },
  receiptLine1: { type: String, default: '' },
  receiptLine2: { type: String, default: '' },
  receiptLine3: { type: String, default: '' },
  wifiPass: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Settings', settingsSchema);
