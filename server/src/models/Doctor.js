import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    registrationNo: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

doctorSchema.index({ registrationNo: 1 }, { unique: true });

export default mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
