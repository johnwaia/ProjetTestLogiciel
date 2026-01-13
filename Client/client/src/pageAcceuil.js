import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import carnetImg from './assets/carnet.png';

const API_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  'https://authentification-fullstack.onrender.com'
).replace(/\/+$/, '');

export default function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const username =
    location.state?.username ||
    localStorage.getItem('lastUsername') ||
    'utilisateur';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('lastUsername');
    navigate('/', { replace: true });
  };

  const handleGoToSalles = () => {
    navigate('/salles');
  };


  return (
    <main className="container">
      <header className="header">
        <div className="brand">
          <img
            src={carnetImg}
            alt="Réservation de salles"
            className="brand-logo"
          />
        </div>
        <span className="brand-text">Mon carnet de réservation de salles</span>
        <div className="actions">

  <button onClick={handleGoToSalles} className="btn">
    Réserver une salle
  </button>

  <button onClick={handleLogout} className="btn btn-ghost">
    Déconnexion
  </button>
        </div>
      </header>
    </main>
  );
}
