import React from 'react';
import { useNavigate } from 'react-router-dom';
import carnetImg from './assets/carnet.png';

const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/+$/, '');
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const START = '08:00';
const END = '19:00';

function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export default function Salles() {
  const navigate = useNavigate();

  const [msg, setMsg] = React.useState('');
  const [salles, setSalles] = React.useState([]);

  const [selectedSalleId, setSelectedSalleId] = React.useState('');
  const [jour, setJour] = React.useState(() => {
    // default today YYYY-MM-DD
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [heureDebut, setHeureDebut] = React.useState('09:00');
  const [heureFin, setHeureFin] = React.useState('10:00');

  // Disponibilités pour la salle sélectionnée et le jour
  const [freeSlots, setFreeSlots] = React.useState([]);
  const [busySlots, setBusySlots] = React.useState([]); // [{debut, fin, username, reservatorId, reservationId}]

  React.useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true });
      return;
    }
    fetchSalles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!selectedSalleId) return;
    fetchDisponibilites(selectedSalleId, jour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSalleId, jour]);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchSalles = async () => {
    setMsg('Chargement salles...');
    try {
      const res = await fetch(apiUrl('/api/salle'), { headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) return setMsg(`❌ ${data?.message || `Erreur ${res.status}`}`);

      setSalles(Array.isArray(data) ? data : []);
      setMsg('');

      // auto-select first
      if (!selectedSalleId && Array.isArray(data) && data.length) {
        setSelectedSalleId(data[0]._id || data[0].id);
      }
    } catch {
      setMsg('❌ Erreur réseau');
    }
  };

  const fetchDisponibilites = async (salleId, day) => {
    setMsg('Chargement disponibilités...');
    try {
      const res = await fetch(apiUrl(`/api/salle/${salleId}/disponibilites?jour=${encodeURIComponent(day)}`), {
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return setMsg(`❌ ${data?.message || `Erreur ${res.status}`}`);

      // attendu: { libres:[], reservations:[] }
      setFreeSlots(Array.isArray(data?.libres) ? data.libres : []);
      setBusySlots(Array.isArray(data?.reservations) ? data.reservations : []);
      setMsg('');
    } catch {
      setMsg('❌ Erreur réseau');
    }
  };

  const reserver = async () => {
    if (!selectedSalleId) return setMsg('❌ Choisis une salle');
    if (!jour) return setMsg('❌ Choisis un jour');
    if (!heureDebut || !heureFin) return setMsg('❌ Choisis des heures');

    setMsg('Envoi...');
    try {
      const res = await fetch(apiUrl(`/api/salle/${selectedSalleId}/reservations`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          jour_choisi: jour,
          heure_debut: heureDebut,
          heure_fin: heureFin,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) return setMsg(`❌ ${data?.message || `Erreur ${res.status}`}`);

      setMsg('✅ Réservation ajoutée');
      await fetchDisponibilites(selectedSalleId, jour);
    } catch {
      setMsg('❌ Erreur réseau');
    }
  };

  // segments timeline
  const buildSegments = () => {
    const segs = [];

    for (const f of freeSlots) segs.push({ type: 'free', debut: f.debut, fin: f.fin });
    for (const b of busySlots) segs.push({ type: 'busy', debut: b.heure_debut || b.debut, fin: b.heure_fin || b.fin, username: b.username });

    segs.sort((a, b) => toMin(a.debut) - toMin(b.debut));
    return segs;
  };

  const renderTimeline = () => {
    const startMin = toMin(START);
    const endMin = toMin(END);
    const total = endMin - startMin;

    const segments = buildSegments();

    return (
      <div style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, overflow: 'hidden' }}>
        {segments.map((seg, idx) => {
          const a = clamp(toMin(seg.debut), startMin, endMin);
          const b = clamp(toMin(seg.fin), startMin, endMin);
          const h = Math.max(18, Math.round(((b - a) / total) * 260));

          const isBusy = seg.type === 'busy';

          return (
            <div
              key={idx}
              style={{
                height: h,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderBottom: idx === segments.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                background: isBusy ? 'rgba(255, 0, 0, 0.12)' : 'rgba(0, 255, 0, 0.10)',
              }}
              title={`${seg.debut} → ${seg.fin}`}
            >
              <span style={{ fontWeight: 600 }}>
                {isBusy ? 'Réservé' : 'Libre'} — {seg.debut} → {seg.fin}
              </span>
              <span style={{ opacity: isBusy ? 0.95 : 0.6 }}>
                {isBusy ? (seg.username || '') : ''}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const isError = msg.startsWith('❌');
  const isSuccess = msg.startsWith('✅');

  return (
    <main className="container">
      <header className="header">
        <div className="brand">
          <img src={carnetImg} alt="Carnet" className="brand-logo" />
        </div>
        <span className="brand-text">Réservation par salle (08:00–19:00)</span>
        <div className="actions">
          <button onClick={() => navigate(-1)} className="btn">Retour</button>
          <button onClick={fetchSalles} className="btn">Rafraîchir</button>
        </div>
      </header>

      <section className="card">
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <select
            className="input"
            value={selectedSalleId}
            onChange={(e) => setSelectedSalleId(e.target.value)}
            style={{ maxWidth: 240 }}
          >
            {salles.map(s => {
              const id = s._id || s.id;
              return <option key={id} value={id}>{s.salleName}</option>;
            })}
          </select>

          <input type="date" className="input" value={jour} onChange={(e) => setJour(e.target.value)} />

          <input
            type="time"
            className="input"
            value={heureDebut}
            onChange={(e) => setHeureDebut(e.target.value)}
            min="08:00"
            max="19:00"
          />
          <input
            type="time"
            className="input"
            value={heureFin}
            onChange={(e) => setHeureFin(e.target.value)}
            min="08:00"
            max="19:00"
          />

          <button onClick={reserver} className="btn btn-primary">
            Réserver
          </button>
        </div>

        {msg && (
          <div className={`msg ${isError ? 'error' : ''} ${isSuccess ? 'success' : ''}`} style={{ marginTop: 10 }}>
            {msg}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          {selectedSalleId ? renderTimeline() : <div className="msg">Choisis une salle pour voir ses disponibilités.</div>}
        </div>
      </section>
    </main>
  );
}
