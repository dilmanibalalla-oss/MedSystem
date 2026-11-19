import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { formatWhen, medicineLabel, treatmentLabel } from '../format';

export function PatientChart({ patient, medicines, doctors, onClose, onCheckIn, onEdit, onUpdated, onToast }) {
  const [doctorId, setDoctorId] = useState('');
  const [lines, setLines] = useState(() => [{ key: 1, medicineId: '', quantity: '', notes: '' }]);
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingClinical, setSavingClinical] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const lineKey = useRef(1);
  const latestId = patient.visits[patient.visits.length - 1]?._id || '';

  function blankLine() {
    lineKey.current += 1;
    return { key: lineKey.current, medicineId: '', quantity: '', notes: '' };
  }

  useEffect(() => {
    const visit = patient.visits[patient.visits.length - 1];
    setLines([{ key: 1, medicineId: '', quantity: '', notes: '' }]);
    lineKey.current = 1;
    setDoctorId('');
    setSymptoms(visit?.symptoms || '');
    setDiagnosis(visit?.diagnosis || '');
  }, [patient._id, latestId]);

  const latest = patient.visits[patient.visits.length - 1];
  const canUndo = latest && latest.treatments.length === 0;
  const history = patient.visits.map((visit, index) => ({ ...visit, number: index + 1 })).reverse();
  const activeDoctors = doctors.filter((doctor) => doctor.active !== false);

  function updateLine(key, field, value) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: value } : line)));
  }

  async function saveClinical() {
    setSavingClinical(true);
    try {
      const updated = await api.saveVisitClinical(patient._id, { symptoms, diagnosis });
      onUpdated(updated);
      onToast('Symptoms and diagnosis saved for this visit.');
    } catch (error) {
      onToast(error.message, 'danger');
    } finally {
      setSavingClinical(false);
    }
  }

  async function addTreatment(event) {
    event.preventDefault();
    const items = lines
      .filter((line) => line.medicineId)
      .map((line) => ({ medicineId: line.medicineId, quantity: line.quantity, notes: line.notes }));
    if (!items.length) {
      onToast('Choose at least one medicine.', 'danger');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.addTreatment(patient._id, { items });
      onUpdated(updated);
      setLines([blankLine()]);
      onToast(items.length === 1 ? 'Medicine saved for this visit.' : `${items.length} medicines saved for this visit.`);
    } catch (error) {
      onToast(error.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function removeTreatment(treatmentId) {
    try {
      const updated = await api.removeTreatment(patient._id, treatmentId);
      onUpdated(updated);
      onToast('Treatment removed from this visit.');
    } catch (error) {
      onToast(error.message, 'danger');
    }
  }

  async function undoVisit() {
    setUndoing(true);
    try {
      const updated = await api.undoVisit(patient._id);
      onUpdated(updated);
      onToast(`Visit undone. ${updated.name} has ${updated.visitCount} visits.`);
      onClose();
    } catch (error) {
      onToast(error.message, 'danger');
    } finally {
      setUndoing(false);
    }
  }

  return (
    <article className="chart chart-page" aria-labelledby="chart-title">
      <div className="chart-top">
        <p className="kicker">This patient only</p>
        <button type="button" className="ghost" onClick={onClose}>Back to patients</button>
      </div>
      <h2 id="chart-title">{patient.name}</h2>
      <dl className="facts">
        <div>
          <dt>Age</dt>
          <dd>{patient.age}</dd>
        </div>
        <div>
          <dt>Visits</dt>
          <dd>{patient.visitCount}</dd>
        </div>
        <div className="fact-wide">
          <dt>Address</dt>
          <dd>{patient.address}</dd>
        </div>
      </dl>

      <section className="allergy-panel">
        <h3>Allergy</h3>
        {patient.allergies.length === 0 ? (
          <p className="muted">No allergies recorded.</p>
        ) : (
          <div className="chips">
            {patient.allergies.map((allergy) => (
              <span className="chip chip-static" key={allergy}>{allergy}</span>
            ))}
          </div>
        )}
      </section>

      <div className="chart-footer">
        <label>
          Doctor for the next visit
          <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
            <option value="">Select a doctor</option>
            {activeDoctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.name} · {doctor.specialty}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="solid" onClick={() => onCheckIn(doctorId)} disabled={!doctorId}>
          Check in
        </button>
        <button type="button" className="ghost" onClick={() => onEdit(patient)}>Edit details</button>
      </div>

      <section>
        <h3>Visits</h3>
        {history.length === 0 ? (
          <p className="muted">No visits yet. Check this patient in to start one.</p>
        ) : (
          history.map((visit) => (
            <section className="visit-card" key={visit._id}>
              <p className="visit-kicker">Visit {visit.number} · {formatWhen(visit.visitedAt)}</p>
              <p>{visit.doctorName || 'No doctor recorded'}</p>
              {visit.number === patient.visits.length ? (
                <>
                  <div className="clinical-grid">
                    <label>
                      Symptoms
                      <textarea
                        value={symptoms}
                        onChange={(event) => setSymptoms(event.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="What the patient reports"
                      />
                    </label>
                    <label>
                      Diagnosis
                      <textarea
                        value={diagnosis}
                        onChange={(event) => setDiagnosis(event.target.value)}
                        rows={2}
                        maxLength={300}
                        placeholder="The doctor's diagnosis"
                      />
                    </label>
                  </div>
                  <button type="button" className="ghost" onClick={saveClinical} disabled={savingClinical}>
                    {savingClinical ? 'Saving…' : 'Save symptoms and diagnosis'}
                  </button>
                  <form onSubmit={addTreatment} className="stack">
                    {lines.map((line, index) => (
                      <div className="rx-line" key={line.key}>
                        <label>
                          {index === 0 ? 'Medicine' : `Medicine ${index + 1}`}
                          <select
                            value={line.medicineId}
                            onChange={(event) => updateLine(line.key, 'medicineId', event.target.value)}
                          >
                            <option value="">Select from the catalog</option>
                            {medicines.map((medicine) => (
                              <option key={medicine._id} value={medicine._id}>
                                {medicineLabel(medicine)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Amount
                          <input
                            value={line.quantity}
                            onChange={(event) => updateLine(line.key, 'quantity', event.target.value)}
                            maxLength={40}
                            placeholder="e.g. 10 tablets"
                          />
                        </label>
                        <label>
                          Instructions
                          <input
                            value={line.notes}
                            onChange={(event) => updateLine(line.key, 'notes', event.target.value)}
                            maxLength={400}
                            placeholder="Optional directions"
                          />
                        </label>
                        {lines.length > 1 ? (
                          <button type="button" className="text-btn danger-text" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>
                            Remove
                          </button>
                        ) : <span />}
                      </div>
                    ))}
                    <div className="dialog-actions medicine-actions">
                      <button type="button" className="ghost" onClick={() => setLines((current) => [...current, blankLine()])}>
                        Add another medicine
                      </button>
                      <button type="submit" className="solid" disabled={saving || medicines.length === 0}>
                        {saving ? 'Saving…' : 'Save medicines'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="clinical-grid">
                  <p>
                    <span className="visit-kicker">Symptoms</span>
                    {visit.symptoms || 'None recorded'}
                  </p>
                  <p>
                    <span className="visit-kicker">Diagnosis</span>
                    {visit.diagnosis || 'None recorded'}
                  </p>
                </div>
              )}
              {visit.treatments.length === 0 ? (
                <p className="muted">No medicine on this visit.</p>
              ) : (
                <ul className="treatment-list">
                  {visit.treatments.map((treatment) => (
                    <li key={treatment._id}>
                      <div>
                        <strong>{treatmentLabel(treatment)}</strong>
                        {treatment.quantity ? <p>Amount: {treatment.quantity}</p> : null}
                        {treatment.notes ? <p>{treatment.notes}</p> : null}
                      </div>
                      <button type="button" className="text-btn danger-text" onClick={() => removeTreatment(treatment._id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {visit.number === patient.visits.length && canUndo ? (
                <button type="button" className="text-btn undo" onClick={undoVisit} disabled={undoing}>
                  {undoing ? 'Undoing…' : 'Undo this visit'}
                </button>
              ) : null}
            </section>
          ))
        )}
      </section>
    </article>
  );
}
