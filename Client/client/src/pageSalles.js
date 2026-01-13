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
function pad2(n) {
  return String(n).padStart(2, '0');
}
function toHHmm(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export default function Salles() {
  const navigate = useNavigate();

  const [msg, setMsg] = React.useState('');
  const [salles, setSalles] = React.useState([]);

  const [selectedSalleId, setSelectedSalleId] = React.useState('');
  const [jour, setJour] = React.useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [heureDebut, setHeureDebut] = React.useState('09:00');
  const [heureFin, setHeureFin] = React.useState('10:00');

  const [freeSlots, setFreeSlots] = React.useState([]);
  const [busySlots, setBusySlots] = React.useState([]); // [{_id, heure_debut, heure_fin, username, reservatorId}]

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

  // ------- Emploi du temps (grille + blocs) -------
  const renderEmploiDuTemps = () => {
    const startMin = toMin(START);
    const endMin = toMin(END);
    const total = endMin - startMin;

    // Grille: 30 minutes par ligne
    const STEP = 30; // minutes
    const rows = [];
    for (let t = startMin; t <= endMin; t += STEP) rows.push(t);

    // Hauteur totale (px) : 20px par demi-heure => 22 demi-heures pour 11h => ~440px
    const PX_PER_STEP = 22;
    const totalHeight = (rows.length - 1) * PX_PER_STEP;

    // Blocs réservés en position absolue
    const blocks = (busySlots || [])
      .slice()
      .sort((a, b) => toMin(a.heure_debut) - toMin(b.heure_debut))
      .map((b) => {
        const d = clamp(toMin(b.heure_debut), startMin, endMin);
        const f = clamp(toMin(b.heure_fin), startMin, endMin);
        const top = ((d - startMin) / total) * totalHeight;
        const height = Math.max(28, ((f - d) / total) * totalHeight);

        return {
          id: b._id,
          top,
          height,
          label: `${b.heure_debut}–${b.heure_fin}`,
          username: b.username || '',
        };
      });

    // Liste compacte des libres (optionnel)
    const freeText =
      Array.isArray(freeSlots) && freeSlots.length
        ? freeSlots.map((x) => `${x.debut}–${x.fin}`).join(', ')
        : 'Aucun créneau libre';

    return (
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12 }}>
        {/* Colonne info / libres */}
        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Créneaux libres</div>
          <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{freeText}</div>

          <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
            Astuce : choisis une heure de début/fin puis clique “Réserver”.
          </div>
        </div>

        {/* Grille emploi du temps */}
        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ fontWeight: 900 }}>Emploi du temps</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>Plage: {START} → {END}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10 }}>
            {/* Colonne heures */}
            <div style={{ position: 'relative', height: totalHeight }}>
              {rows.map((t, idx) => {
                const isHour = (t % 60) === 0;
                const top = idx * PX_PER_STEP;
                return (
                  <div key={t} style={{ position: 'absolute', top: top - 7, left: 0, opacity: isHour ? 0.95 : 0.45, fontSize: 12 }}>
                    {toHHmm(t)}
                  </div>
                );
              })}
            </div>

            {/* Zone planning */}
            <div style={{ position: 'relative', height: totalHeight }}>
              {/* Grille horizontale */}
              {rows.map((t, idx) => {
                const isHour = (t % 60) === 0;
                const top = idx * PX_PER_STEP;
                return (
                  <div
                    key={t}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top,
                      height: 0,
                      borderTop: isHour ? '1px solid rgba(255,255,255,0.18)' : '1px dashed rgba(255,255,255,0.10)',
                    }}
                  />
                );
              })}

              {/* Fond "libre" */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 255, 0, 0.04)',
                  borderRadius: 10,
                }}
              />

              {/* Blocs réservés */}
              {blocks.map((b) => (
                <div
                  key={b.id}
                  title={`${b.label} — ${b.username}`}
                  style={{
                    position: 'absolute',
                    left: 8,
                    right: 8,
                    top: b.top,
                    height: b.height,
                    background: 'rgba(255, 0, 0, 0.18)',
                    border: '1px solid rgba(255, 0, 0, 0.30)',
                    borderRadius: 12,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ fontWeight: 900 }}>Réservé</div>
                  <div style={{ opacity: 0.95 }}>{b.label}</div>
                  <div style={{ opacity: 0.85, fontSize: 12 }}>{b.username}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Légende */}
          <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, opacity: 0.85 }}>
            <span style={{ width: 12, height: 12, display: 'inline-block', background: 'rgba(0, 255, 0, 0.12)', border: '1px solid rgba(0,255,0,0.25)' }} />
            Libre
            <span style={{ width: 12, height: 12, display: 'inline-block', background: 'rgba(255, 0, 0, 0.18)', border: '1px solid rgba(255,0,0,0.30)', marginLeft: 10 }} />
            Réservé
          </div>
        </div>
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
        <span className="brand-text">Réservation par salle</span>
        <div className="actions">
          <button onClick={() => navigate(-1)} className="btn">Retour</button>
          <button onClick={fetchSalles} className="btn">Rafraîchir</button>
        </div>
      </header>

      <section className="card">
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input"
            value={selectedSalleId}
            onChange={(e) => setSelectedSalleId(e.target.value)}
            style={{ maxWidth: 240 }}
          >
            {salles.map((s) => {
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

        {selectedSalleId ? renderEmploiDuTemps() : <div className="msg" style={{ marginTop: 14 }}>Choisis une salle pour voir son emploi du temps.</div>}
      </section>
    </main>
  );
}
