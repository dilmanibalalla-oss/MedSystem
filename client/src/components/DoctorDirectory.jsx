import { useState } from 'react';
import { api } from '../api';

const EMPTY = { name: '', registrationNo: '', specialty: '', phone: '', active: true };

export function DoctorDirectory({ doctors, onRefresh, onToast }) {
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startEdit(doctor) {
    setEditingId(doctor._id);
    setDraft({
      name: doctor.name,
      registrationNo: doctor.registrationNo,
      specialty: doctor.specialty,
      phone: doctor.phone || '',
      active: doctor.active !== false,
    });
  }

  function resetForm() {
    setEditingId('');
    setDraft(EMPTY);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.updateDoctor(editingId, draft);
        onToast('Doctor updated.');
      } else {
        await api.createDoctor(draft);
        onToast('Doctor added.');
      }
      resetForm();
      await onRefresh();
    } catch (error) {
      onToast(error.message, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await api.deleteDoctor(pendingDelete._id);
      if (editingId === pendingDelete._id) resetForm();
      setPendingDelete(null);
      await onRefresh();
      onToast('Doctor removed. Visits already recorded keep the copied name.');
    } catch (error) {
      onToast(error.message, 'danger');
    }
  }

  return (
    <section>
      <header className="stage-head">
        <div>
          <p className="kicker">Staff</p>
          <h1>Doctors</h1>
        </div>
      </header>

      <form className="medicine-form doctor-form" onSubmit={submit}>
        <label>
          Name
          <input value={draft.name} onChange={(event) => update('name', event.target.value)} required maxLength={120} />
        </label>
        <label>
          Registration number
          <input value={draft.registrationNo} onChange={(event) => update('registrationNo', event.target.value)} required maxLength={40} />
        </label>
        <label>
          Specialty
          <input value={draft.specialty} onChange={(event) => update('specialty', event.target.value)} required maxLength={80} />
        </label>
        <label>
          Phone
          <input value={draft.phone} onChange={(event) => update('phone', event.target.value)} maxLength={40} />
        </label>
        <label className="check-line">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => update('active', event.target.checked)}
          />
          Active for check-in
        </label>
        <div className="dialog-actions medicine-actions">
          {editingId ? (
            <button type="button" className="ghost" onClick={resetForm}>Cancel</button>
          ) : null}
          <button type="submit" className="solid" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save doctor' : 'Add doctor'}
          </button>
        </div>
      </form>

      {doctors.length === 0 ? (
        <p className="empty">No doctors yet. Add one before checking a patient in.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Name</th>
                <th>Registration</th>
                <th>Specialty</th>
                <th>Phone</th>
                <th>Status</th>
                <th><span className="sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => (
                <tr key={doctor._id}>
                  <td className="name-cell">{doctor.name}</td>
                  <td>{doctor.registrationNo}</td>
                  <td>{doctor.specialty}</td>
                  <td>{doctor.phone || <span className="muted">—</span>}</td>
                  <td>{doctor.active === false ? 'Inactive' : 'Active'}</td>
                  <td className="row-actions">
                    <button type="button" className="text-btn" onClick={() => startEdit(doctor)}>Edit</button>
                    <button type="button" className="text-btn danger-text" onClick={() => setPendingDelete(doctor)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingDelete ? (
        <div className="scrim" role="presentation" onMouseDown={() => setPendingDelete(null)}>
          <div
            className="dialog dialog-narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-doctor-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="delete-doctor-title">Remove {pendingDelete.name}?</h2>
            <p>New check-ins will no longer offer this doctor. Visits already written keep the name.</p>
            <div className="dialog-actions">
              <button type="button" className="ghost" onClick={() => setPendingDelete(null)}>Keep</button>
              <button type="button" className="danger" onClick={confirmDelete}>Remove doctor</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
