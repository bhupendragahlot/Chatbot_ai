import mongoose from 'mongoose';

const horoscopeDataSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  data: { type: Object, required: true },
  createdAt: { type: Date, expires: '1h', default: Date.now }
});

export default mongoose.model('HoroscopeData', horoscopeDataSchema);