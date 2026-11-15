import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import patientsRouter from './routes/patients.js';
import medicinesRouter from './routes/medicines.js';
import Patient from './models/Patient.js';
import Medicine from './models/Medicine.js';
import { seedMedicines } from './seed.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'down' });
});

app.get('/api/stats', async (_req, res) => {
  const [patients, medicines, visits] = await Promise.all([
    Patient.countDocuments(),
    Medicine.countDocuments(),
    Patient.aggregate([{ $group: { _id: null, total: { $sum: '$visitCount' } } }]),
  ]);
  res.json({
    patients,
    medicines,
    visits: visits[0]?.total || 0,
  });
});

app.use('/api/patients', patientsRouter);
app.use('/api/medicines', medicinesRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Check those details and try again' });
  }
  res.status(500).json({ message: 'The clinic server could not finish that request' });
});

const port = Number(process.env.PORT) || 5000;
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Missing MONGODB_URI. Add it to server/.env');
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(async () => {
    await seedMedicines();
    app.listen(port, () => {
      console.log(`Clinic API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB');
    console.error(error.message);
    process.exit(1);
  });
