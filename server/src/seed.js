import Medicine from './models/Medicine.js';

const STARTER = [
  ['Paracetamol', '500 mg', 'Tablet'],
  ['Paracetamol', '250 mg/5 ml', 'Syrup'],
  ['Ibuprofen', '400 mg', 'Tablet'],
  ['Diclofenac', '50 mg', 'Tablet'],
  ['Amoxicillin', '500 mg', 'Capsule'],
  ['Amoxicillin + Clavulanate', '625 mg', 'Tablet'],
  ['Azithromycin', '500 mg', 'Tablet'],
  ['Ciprofloxacin', '500 mg', 'Tablet'],
  ['Metronidazole', '400 mg', 'Tablet'],
  ['Cetirizine', '10 mg', 'Tablet'],
  ['Levocetirizine', '5 mg', 'Tablet'],
  ['Loratadine', '10 mg', 'Tablet'],
  ['Montelukast', '10 mg', 'Tablet'],
  ['Chlorpheniramine', '4 mg', 'Tablet'],
  ['Salbutamol', '100 mcg', 'Inhaler'],
  ['Omeprazole', '20 mg', 'Capsule'],
  ['Pantoprazole', '40 mg', 'Tablet'],
  ['Domperidone', '10 mg', 'Tablet'],
  ['ORS', '1 sachet', 'Sachet'],
  ['Metformin', '500 mg', 'Tablet'],
  ['Gliclazide', '80 mg', 'Tablet'],
  ['Amlodipine', '5 mg', 'Tablet'],
  ['Losartan', '50 mg', 'Tablet'],
  ['Atorvastatin', '20 mg', 'Tablet'],
  ['Aspirin', '75 mg', 'Tablet'],
  ['Vitamin D3', '60000 IU', 'Capsule'],
  ['Clotrimazole', '1%', 'Cream'],
  ['Prednisolone', '5 mg', 'Tablet'],
  ['Ambroxol', '30 mg', 'Tablet'],
  ['Normal saline', '0.65%', 'Drops'],
];

export async function seedMedicines() {
  const count = await Medicine.countDocuments();
  if (count > 0) return;
  await Medicine.insertMany(
    STARTER.map(([name, strength, form]) => ({ name, strength, form }))
  );
}
