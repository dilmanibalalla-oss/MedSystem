async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the clinic server. Leave this page open and check that the API is running.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'The clinic server rejected that request');
  }
  return data;
}

export const api = {
  stats: () => request('/api/stats'),
  patients: (q = '') => request(`/api/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  patient: (id) => request(`/api/patients/${id}`),
  createPatient: (body) => request('/api/patients', { method: 'POST', body: JSON.stringify(body) }),
  updatePatient: (id, body) => request(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePatient: (id) => request(`/api/patients/${id}`, { method: 'DELETE' }),
  recordVisit: (id, body) => request(`/api/patients/${id}/visit`, { method: 'POST', body: JSON.stringify(body || {}) }),
  saveVisitClinical: (id, body) => request(`/api/patients/${id}/visit/clinical`, { method: 'PUT', body: JSON.stringify(body) }),
  undoVisit: (id) => request(`/api/patients/${id}/visit/undo`, { method: 'POST' }),
  addTreatment: (id, body) => request(`/api/patients/${id}/treatments`, { method: 'POST', body: JSON.stringify(body) }),
  removeTreatment: (id, treatmentId) => request(`/api/patients/${id}/treatments/${treatmentId}`, { method: 'DELETE' }),
  medicines: (q = '') => request(`/api/medicines${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createMedicine: (body) => request('/api/medicines', { method: 'POST', body: JSON.stringify(body) }),
  updateMedicine: (id, body) => request(`/api/medicines/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMedicine: (id) => request(`/api/medicines/${id}`, { method: 'DELETE' }),
  doctors: () => request('/api/doctors'),
  createDoctor: (body) => request('/api/doctors', { method: 'POST', body: JSON.stringify(body) }),
  updateDoctor: (id, body) => request(`/api/doctors/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDoctor: (id) => request(`/api/doctors/${id}`, { method: 'DELETE' }),
};
