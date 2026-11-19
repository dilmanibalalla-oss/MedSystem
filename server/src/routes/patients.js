import { Router } from 'express';
import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import Medicine from '../models/Medicine.js';
import Doctor from '../models/Doctor.js';
import { cleanText, escapeRegex, parseAge, parseAllergies } from '../validate.js';

const router = Router();

function missingPatient(res) {
  return res.status(404).json({ message: 'Patient not found' });
}

router.get('/', async (req, res) => {
  const q = cleanText(req.query.q, 80);
  let filter = {};
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const clauses = [
      { name: regex },
      { address: regex },
      { allergies: regex },
      { 'visits.treatments.medicineName': regex },
      { 'visits.treatments.strength': regex },
      { 'visits.treatments.notes': regex },
      { 'visits.treatments.form': regex },
      { 'visits.symptoms': regex },
      { 'visits.diagnosis': regex },
    ];
    if (/^\d+$/.test(q)) {
      const amount = Number(q);
      clauses.push({ age: amount }, { visitCount: amount });
    }
    filter = { $or: clauses };
  }

  const patients = await Patient.find(filter)
    .collation({ locale: 'en', strength: 2 })
    .sort({ name: 1 })
    .limit(300);
  res.json(patients);
});

router.post('/', async (req, res) => {
  const name = cleanText(req.body.name, 120);
  const address = cleanText(req.body.address, 300);
  const age = parseAge(req.body.age);
  if (!name) return res.status(400).json({ message: 'Name is required' });
  if (age == null) {
    return res.status(400).json({ message: 'Age must be a whole number from 0 to 120' });
  }
  if (!address) return res.status(400).json({ message: 'Address is required' });

  const patient = await Patient.create({
    name,
    age,
    address,
    allergies: parseAllergies(req.body.allergies),
    visitCount: 0,
    visits: [],
  });
  res.status(201).json(patient);
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return missingPatient(res);
  const patient = await Patient.findById(req.params.id);
  if (!patient) return missingPatient(res);
  res.json(patient);
});

router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return missingPatient(res);
  const name = cleanText(req.body.name, 120);
  const address = cleanText(req.body.address, 300);
  const age = parseAge(req.body.age);
  if (!name) return res.status(400).json({ message: 'Name is required' });
  if (age == null) {
    return res.status(400).json({ message: 'Age must be a whole number from 0 to 120' });
  }
  if (!address) return res.status(400).json({ message: 'Address is required' });

  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    { name, age, address, allergies: parseAllergies(req.body.allergies) },
    { new: true, runValidators: true }
  );
  if (!patient) return missingPatient(res);
  res.json(patient);
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return missingPatient(res);
  const patient = await Patient.findByIdAndDelete(req.params.id);
  if (!patient) return missingPatient(res);
  res.json({ ok: true });
});

router.post('/:id/visit', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return missingPatient(res);
  if (!mongoose.isValidObjectId(req.body.doctorId)) {
    return res.status(400).json({ message: 'Choose the doctor for this visit' });
  }
  const doctor = await Doctor.findById(req.body.doctorId);
  if (!doctor || doctor.active === false) {
    return res.status(400).json({ message: 'Choose an active doctor' });
  }
  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    {
      $inc: { visitCount: 1 },
      $push: {
        visits: {
          visitedAt: new Date(),
          doctor: doctor._id,
          doctorName: doctor.name,
          treatments: [],
        },
      },
    },
    { new: true }
  );
  if (!patient) return missingPatient(res);
  res.json(patient);
});

router.post('/:id/visit/undo', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return missingPatient(res);
  const patient = await Patient.findById(req.params.id);
  if (!patient) return missingPatient(res);
  const last = patient.visits[patient.visits.length - 1];
  if (!last) return res.status(400).json({ message: 'There is no visit to undo' });
  if (last.treatments.length > 0) {
    return res.status(400).json({ message: 'This visit already has a treatment, so it stays on the chart' });
  }
  patient.visits.pop();
  patient.visitCount = patient.visits.length;
  await patient.save();
  res.json(patient);
});

router.put('/:id/visit/clinical', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return missingPatient(res);
  const patient = await Patient.findById(req.params.id);
  if (!patient) return missingPatient(res);
  const visit = patient.visits[patient.visits.length - 1];
  if (!visit) {
    return res.status(400).json({ message: 'Check this patient in before recording symptoms' });
  }
  visit.symptoms = cleanText(req.body.symptoms, 500);
  visit.diagnosis = cleanText(req.body.diagnosis, 300);
  await patient.save();
  res.json(patient);
});

router.post('/:id/treatments', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return missingPatient(res);
  const rawItems = Array.isArray(req.body.items) && req.body.items.length
    ? req.body.items
    : [{ medicineId: req.body.medicineId, notes: req.body.notes, quantity: req.body.quantity }];
  if (!rawItems.length || rawItems.length > 40) {
    return res.status(400).json({ message: 'Add between 1 and 40 medicines' });
  }

  const prepared = [];
  for (const item of rawItems) {
    if (!mongoose.isValidObjectId(item?.medicineId)) {
      return res.status(400).json({ message: 'Choose a medicine from the catalog' });
    }
    const medicine = await Medicine.findById(item.medicineId);
    if (!medicine) return res.status(400).json({ message: 'That medicine is no longer in the catalog' });
    prepared.push({
      medicine: medicine._id,
      medicineName: medicine.name,
      strength: medicine.strength,
      form: medicine.form,
      notes: cleanText(item.notes, 400),
      quantity: cleanText(item.quantity, 40),
      recordedAt: new Date(),
    });
  }

  const patient = await Patient.findById(req.params.id);
  if (!patient) return missingPatient(res);
  if (patient.visits.length === 0) {
    patient.visits.push({ visitedAt: new Date(), treatments: [] });
    patient.visitCount = patient.visits.length;
  }

  const visit = patient.visits[patient.visits.length - 1];
  visit.treatments.push(...prepared);
  await patient.save();
  res.json(patient);
});

router.delete('/:id/treatments/:treatmentId', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.treatmentId)) {
    return res.status(404).json({ message: 'Treatment not found' });
  }
  const patient = await Patient.findById(req.params.id);
  if (!patient) return missingPatient(res);
  let removed = false;
  for (const visit of patient.visits) {
    const next = visit.treatments.filter((item) => String(item._id) !== req.params.treatmentId);
    if (next.length !== visit.treatments.length) {
      visit.treatments = next;
      removed = true;
    }
  }
  if (!removed) return res.status(404).json({ message: 'Treatment not found' });
  await patient.save();
  res.json(patient);
});

export default router;
