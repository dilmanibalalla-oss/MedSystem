import { Router } from 'express';
import mongoose from 'mongoose';
import Doctor from '../models/Doctor.js';
import { cleanText } from '../validate.js';

const router = Router();

function readDoctor(body) {
  const name = cleanText(body.name, 120);
  const registrationNo = cleanText(body.registrationNo, 40);
  const specialty = cleanText(body.specialty, 80);
  const phone = cleanText(body.phone, 40);
  const active = body.active !== false;
  if (!name) return { error: 'Doctor name is required' };
  if (!registrationNo) return { error: 'Registration number is required' };
  if (!specialty) return { error: 'Specialty is required' };
  return { name, registrationNo, specialty, phone, active };
}

router.get('/', async (_req, res) => {
  const doctors = await Doctor.find().sort({ active: -1, name: 1 });
  res.json(doctors);
});

router.post('/', async (req, res) => {
  const doctor = readDoctor(req.body);
  if (doctor.error) return res.status(400).json({ message: doctor.error });
  try {
    const created = await Doctor.create(doctor);
    res.status(201).json(created);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That registration number is already used' });
    }
    throw error;
  }
});

router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Doctor not found' });
  }
  const doctor = readDoctor(req.body);
  if (doctor.error) return res.status(400).json({ message: doctor.error });
  try {
    const updated = await Doctor.findByIdAndUpdate(req.params.id, doctor, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Doctor not found' });
    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That registration number is already used' });
    }
    throw error;
  }
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Doctor not found' });
  }
  const deleted = await Doctor.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Doctor not found' });
  res.json({ ok: true });
});

export default router;
