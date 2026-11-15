import mongoose from 'mongoose';

const treatmentSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    strength: { type: String, default: '' },
    form: { type: String, default: '' },
    notes: { type: String, default: '' },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const visitSchema = new mongoose.Schema(
  {
    visitedAt: { type: Date, default: Date.now },
    treatments: { type: [treatmentSchema], default: [] },
  },
  { _id: true }
);

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 120 },
    address: { type: String, required: true, trim: true },
    allergies: { type: [String], default: [] },
    visitCount: { type: Number, default: 0, min: 0 },
    visits: { type: [visitSchema], default: [] },
  },
  { timestamps: true }
);

patientSchema.index({ name: 1 });

export default mongoose.model('Patient', patientSchema);
