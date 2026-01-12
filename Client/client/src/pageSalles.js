import React from 'react';
import { useNavigate } from 'react-router-dom';
import carnetImg from './assets/carnet.png';

// ✅ CRA proxy-friendly (si tu déploies le front séparément, mets REACT_APP_API_BASE)
const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/+$/, '');
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

export default function Salles() {
  const navigate = useNavigate();
  const [salles, setSalles] = React.useState([]);
  const [msg, setMsg] = React.useState('');

  const [jour, setJour] = React.useState('');
  const [heureDebut, setHeureDebut] = React.useState('09:00');
  const [heureFin, setHeureFin] = React.useState('10:00');

  React.useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true });
      return;
    }
    fetchSalles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSalles = async () => {
    setMsg('Chargement...');
    try {
      const token = localStorage.getItem('token');

      // ✅ IMPORTANT: /api/... => proxy CRA => pas de CORS
      const res = await fetch(apiUrl('/api/salle'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(`❌ ${data?.message || `Erreur ${res.status}`}`);
        return;
      }

      setSalles(Array.isArray(data) ? data : []);
      setMsg('');
    } catch {
      setMsg('❌ Erreur réseau');
    }
  };

  const reserverSalle = async (salleId) => {
    if (!jour) return setMsg('❌ Choisis un jour');
    if (!heureDebut || !heureFin) return setMsg('❌ Choisis heure_debut et heure_fin');

    const reservator = localStorage.getItem('userId');
    if (!reservator) return setMsg('❌ userId manquant (stocke-le au login)');

    setMsg('Envoi...');
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(apiUrl(`/api/salle/${salleId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reservee: true,
          reservator,
          jour_choisi: jour,        // YYYY-MM-DD
          heure_debut: heureDebut,  // HH:mm
          heure_fin: heureFin,      // HH:mm
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(`❌ ${data?.message || `Erreur ${res.status}`}`);
        return;
      }

      setMsg('✅ Salle réservée');
      await fetchSalles();
    } catch {
      setMsg('❌ Erreur réseau');
    }
  };

  const libererSalle = async (salleId) => {
    setMsg('Envoi...');
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(apiUrl(`/api/salle/${salleId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reservee: false }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(`❌ ${data?.message || `Erreur ${res.status}`}`);
        return;
      }

      setMsg('✅ Salle libérée');
      await fetchSalles();
    } catch {
      setMsg('❌ Erreur réseau');
    }
  };

  const isError = msg.startsWith('❌');
  const isSuccess = msg.startsWith('✅');

  return (
    <main className="container">
      <header className="header">
        <div className="brand">
          <img src={carnetImg} alt="Carnet" className="brand-logo" />
        </div>
        <span className="brand-text">Réservation de salles</span>
        <div className="actions">
          <button onClick={() => navigate(-1)} className="btn">Retour</button>
          <button onClick={fetchSalles} className="btn">Rafraîchir</button>
        </div>
      </header>

      <section className="card">
        <div className="row" style={{ gap: 8 }}>
          <input
            type="date"
            className="input"
            value={jour}
            onChange={(e) => setJour(e.target.value)}
          />
          <input
            type="time"
            className="input"
            value={heureDebut}
            onChange={(e) => setHeureDebut(e.target.value)}
          />
          <input
            type="time"
            className="input"
            value={heureFin}
            onChange={(e) => setHeureFin(e.target.value)}
          />
        </div>

        {msg && (
          <div
            className={`msg ${isError ? 'error' : ''} ${isSuccess ? 'success' : ''}`}
            style={{ marginTop: 10 }}
          >
            {msg}
          </div>
        )}

        <div className="table-wrap" role="region" aria-label="Liste des salles" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Salle</th>
                <th>Réservée</th>
                <th>Par</th>
                <th>Jour</th>
                <th>Heures</th>
                <th style={{ width: 220 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {salles.map((s) => {
                const id = s._id || s.id;
                return (
                  <tr key={id}>
                    <td>{s.salleName}</td>
                    <td>{s.reservee ? 'Oui' : 'Non'}</td>
                    <td>{s.reservator ? String(s.reservator) : '-'}</td>
                    <td>{s.jour_choisi ? new Date(s.jour_choisi).toLocaleDateString() : '-'}</td>
                    <td>{s.heure_debut && s.heure_fin ? `${s.heure_debut} → ${s.heure_fin}` : '-'}</td>
                    <td>
                      <div className="actions">
                        {!s.reservee ? (
                          <button onClick={() => reserverSalle(id)} className="btn btn-primary">
                            Réserver
                          </button>
                        ) : (
                          <button onClick={() => libererSalle(id)} className="btn btn-danger">
                            Libérer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {salles.length === 0 && (
                <tr>
                  <td colSpan={6} className="msg">Aucune salle trouvée.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
