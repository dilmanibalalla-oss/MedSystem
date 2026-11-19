import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { latestVisitField, treatmentLines } from './format';
import { MedicineCatalog } from './components/MedicineCatalog';
import { DoctorDirectory } from './components/DoctorDirectory';
import { PatientChart } from './components/PatientChart';
import { PatientForm } from './components/PatientForm';
import { PatientTable } from './components/PatientTable';

function sortValue(patient, key) {
  if (key === 'allergies') return patient.allergies.join(', ');
  if (key === 'treatments') return treatmentLines(patient).join(', ');
  if (key === 'symptoms' || key === 'diagnosis') return latestVisitField(patient, key);
  return patient[key] ?? '';
}

export default function App() {
  const [section, setSection] = useState('patients');
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({ patients: 0, visits: 0, medicines: 0, doctors: 0 });
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const layer = useRef({ form: null, pending: null });
  const queryRef = useRef('');
  const opening = useRef(false);

  layer.current = { form, pending: pendingDelete };
  queryRef.current = debouncedQuery;

  const notify = useCallback((text, tone = 'ok') => {
    setToast({ text, tone, id: Date.now() });
  }, []);

  const loadStats = useCallback(async () => {
    setStats(await api.stats());
  }, []);

  const loadMedicines = useCallback(async () => {
    const rows = await api.medicines();
    setMedicines(rows);
  }, []);

  const loadDoctors = useCallback(async () => {
    setDoctors(await api.doctors());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    api.patients(debouncedQuery)
      .then((rows) => {
        if (ignore) return;
        setPatients(rows);
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    let ignore = false;
    Promise.all([api.stats(), api.medicines(), api.doctors()])
      .then(([nextStats, rows, doctorRows]) => {
        if (ignore) return;
        setStats(nextStats);
        setMedicines(rows);
        setDoctors(doctorRows);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function onKey(event) {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (event.key === '/' && !typing && section === 'patients') {
        event.preventDefault();
        document.getElementById('patient-search')?.focus();
      }
      if (event.key === 'Escape') {
        if (layer.current.pending) setPendingDelete(null);
        else if (layer.current.form) setForm(null);
        else setSelected(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [section]);

  const sortedPatients = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...patients].sort((a, b) => {
      const left = sortValue(a, sort.key);
      const right = sortValue(b, sort.key);
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * dir;
      return String(left).localeCompare(String(right), undefined, { sensitivity: 'base', numeric: true }) * dir;
    });
  }, [patients, sort]);

  function syncPatient(updated) {
    setSelected((current) => (current && current._id === updated._id ? updated : current));
    setPatients((rows) => rows.map((row) => (row._id === updated._id ? updated : row)));
  }

  function changeSort(key) {
    setSort((current) => {
      if (current.key === key) {
        return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'asc' };
    });
  }

  function switchSection(next) {
    setSection(next);
    setSelected(null);
    setForm(null);
  }

  async function openPatient(patient) {
    if (opening.current) return;
    opening.current = true;
    setBusyId(patient._id);
    try {
      const [full, catalog] = await Promise.all([
        api.patient(patient._id),
        api.medicines().catch(() => null),
      ]);
      if (catalog) setMedicines(catalog);
      syncPatient(full);
      setSelected(full);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      opening.current = false;
      setBusyId('');
    }
  }

  async function checkIn(patient, doctorId) {
    if (opening.current) return;
    opening.current = true;
    setBusyId(patient._id);
    try {
      const updated = await api.recordVisit(patient._id, { doctorId });
      syncPatient(updated);
      setSelected(updated);
      await loadStats();
      notify(`Visit recorded for ${updated.name}. Visits are now ${updated.visitCount}.`);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      opening.current = false;
      setBusyId('');
    }
  }

  async function savePatient(body) {
    if (form?.mode === 'edit') {
      const updated = await api.updatePatient(form.patient._id, body);
      syncPatient(updated);
      setPatients(await api.patients(queryRef.current));
      notify('Chart details saved.');
    } else {
      await api.createPatient(body);
      setQuery('');
      setDebouncedQuery('');
      setPatients(await api.patients(''));
      notify('Patient chart created. Open it when they arrive.');
    }
    await loadStats();
    setForm(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await api.deletePatient(pendingDelete._id);
      setPatients((rows) => rows.filter((row) => row._id !== pendingDelete._id));
      setSelected((current) => (current?._id === pendingDelete._id ? null : current));
      setPendingDelete(null);
      await loadStats();
      notify('Chart removed.');
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  async function refreshCatalog() {
    await loadMedicines();
    await loadStats();
  }

  async function refreshDoctors() {
    await loadDoctors();
    await loadStats();
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div className="shell">
        <aside className="rail">
          <div className="brand">
            <span className="mark" aria-hidden="true" />
            <div>
              <p className="brand-name">PharmaVision AR</p>
              <p className="brand-sub">Patient desk</p>
            </div>
          </div>
          <p className="today">{today}</p>
          <nav className="nav" aria-label="PharmaVision AR">
            <button type="button" className={section === 'patients' ? 'is-on' : undefined} onClick={() => switchSection('patients')}>
              Patients
            </button>
            <button type="button" className={section === 'medicines' ? 'is-on' : undefined} onClick={() => switchSection('medicines')}>
              Medicines
            </button>
            <button type="button" className={section === 'doctors' ? 'is-on' : undefined} onClick={() => switchSection('doctors')}>
              Doctors
            </button>
          </nav>
          <dl className="rail-stats">
            <div>
              <dt>Patients</dt>
              <dd>{stats.patients}</dd>
            </div>
            <div>
              <dt>Visits</dt>
              <dd>{stats.visits}</dd>
            </div>
            <div>
              <dt>Medicines</dt>
              <dd>{stats.medicines}</dd>
            </div>
            <div>
              <dt>Doctors</dt>
              <dd>{stats.doctors}</dd>
            </div>
          </dl>
          <p className="rail-note">Open a patient to see only that chart. Check in when the visit starts.</p>
        </aside>

        <main className="stage">
          {error ? (
            <p className="banner" role="alert">{error}</p>
          ) : null}

          {section === 'patients' ? (
            <section>
              {selected ? (
                <PatientChart
                  patient={selected}
                  medicines={medicines}
                  doctors={doctors}
                  onClose={() => setSelected(null)}
                  onCheckIn={(doctorId) => checkIn(selected, doctorId)}
                  onEdit={(patient) => setForm({ mode: 'edit', patient })}
                  onUpdated={(updated) => {
                    syncPatient(updated);
                    loadStats().catch(() => {});
                  }}
                  onToast={notify}
                />
              ) : (
                <>
                  <header className="stage-head">
                    <div>
                      <p className="kicker">Registry</p>
                      <h1>Patients</h1>
                    </div>
                    <button type="button" className="solid" onClick={() => setForm({ mode: 'create' })}>
                      Add patient
                    </button>
                  </header>
                  <div className="toolbar">
                    <label className="search">
                      <span className="sr">Search patients</span>
                      <input
                        id="patient-search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search name, age, address, allergy, symptom, or diagnosis"
                      />
                    </label>
                    <p className="count">{sortedPatients.length} shown</p>
                  </div>
                  <PatientTable
                    patients={sortedPatients}
                    loading={loading}
                    query={debouncedQuery}
                    sort={sort}
                    onSort={changeSort}
                    onOpen={openPatient}
                    onEdit={(patient) => setForm({ mode: 'edit', patient })}
                    onDelete={setPendingDelete}
                    busyId={busyId}
                    selectedId={selected?._id}
                  />
                </>
              )}
            </section>
          ) : section === 'medicines' ? (
            <MedicineCatalog medicines={medicines} onRefresh={refreshCatalog} onToast={notify} />
          ) : (
            <DoctorDirectory doctors={doctors} onRefresh={refreshDoctors} onToast={notify} />
          )}
        </main>
      </div>

      {form ? (
        <PatientForm
          initial={form.mode === 'edit' ? form.patient : null}
          onClose={() => setForm(null)}
          onSave={savePatient}
        />
      ) : null}

      {pendingDelete ? (
        <div className="scrim" role="presentation" onMouseDown={() => setPendingDelete(null)}>
          <div
            className="dialog dialog-narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-patient-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="delete-patient-title">Remove {pendingDelete.name}&apos;s chart?</h2>
            <p>The address, allergies, visit count, and past treatments will be deleted.</p>
            <div className="dialog-actions">
              <button type="button" className="ghost" onClick={() => setPendingDelete(null)}>Keep chart</button>
              <button type="button" className="danger" onClick={confirmDelete}>Delete chart</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`toast toast-${toast.tone}`} role="status">{toast.text}</div>
      ) : null}
    </>
  );
}
