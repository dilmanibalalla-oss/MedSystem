import { useState } from 'react';

export function PatientForm({ initial, onClose, onSave }) {
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name || '');
  const [age, setAge] = useState(initial?.age ?? '');
  const [address, setAddress] = useState(initial?.address || '');
  const [allergies, setAllergies] = useState(initial?.allergies || []);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function addAllergy() {
    const next = draft.trim().replace(/\s+/g, ' ');
    if (!next) return;
    setAllergies((current) => {
      if (current.some((item) => item.toLowerCase() === next.toLowerCase())) return current;
      return [...current, next].slice(0, 30);
    });
    setDraft('');
  }

  async function submit(event) {
    event.preventDefault();
    const pending = draft.trim().replace(/\s+/g, ' ');
    const nextAllergies = pending && !allergies.some((item) => item.toLowerCase() === pending.toLowerCase())
      ? [...allergies, pending]
      : allergies;
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        age: age === '' ? '' : Number(age),
        address: address.trim(),
        allergies: nextAllergies,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="scrim" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="kicker">{editing ? 'Update chart' : 'New chart'}</p>
        <h2 id="patient-form-title">{editing ? initial.name : 'Add a patient'}</h2>
        <form onSubmit={submit} className="stack">
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required autoFocus maxLength={120} />
          </label>
          <label>
            Age
            <input
              type="number"
              min="0"
              max="120"
              step="1"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              required
            />
          </label>
          <label>
            Address
            <textarea value={address} onChange={(event) => setAddress(event.target.value)} required maxLength={300} rows={3} />
          </label>
          <div>
            <span className="field-label">Allergy</span>
            <div className="chips">
              {allergies.map((allergy) => (
                <button
                  type="button"
                  key={allergy}
                  className="chip"
                  onClick={() => setAllergies((current) => current.filter((item) => item !== allergy))}
                >
                  {allergy}
                  <span aria-hidden="true"> ×</span>
                  <span className="sr">Remove {allergy}</span>
                </button>
              ))}
            </div>
            <div className="inline-field">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addAllergy();
                  }
                }}
                placeholder="Type an allergy and press Enter"
                maxLength={80}
                aria-label="Add an allergy"
              />
              <button type="button" className="ghost" onClick={addAllergy}>Add</button>
            </div>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="dialog-actions">
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="solid" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save chart' : 'Create chart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
