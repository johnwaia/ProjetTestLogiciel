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
  const [contacts, setContacts] = React.useState([]);

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

  const handleAddContact = () => {
    navigate('/addContact');
  };

  const handleSeeContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/contact`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur lors de la récupération des contacts');
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/contact/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression du contact');
      setContacts((prev) => prev.filter((contact) => (contact._id || contact.id) !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditContact = (id) => {
    navigate(`/editContact/${id}`);
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
            alt="Carnet de contacts"
            className="brand-logo"
          />
        </div>
        <span className="brand-text">Mon carnet de contacts</span>
        <div className="actions">
  <button onClick={handleAddContact} className="btn btn-primary">
    Ajouter un contact
  </button>

  <button onClick={handleSeeContacts} className="btn">
    Voir mes contacts
  </button>

  {/* ✅ NOUVEAU BOUTON */}
  <button onClick={handleGoToSalles} className="btn">
    Réserver une salle
  </button>

  <button onClick={handleLogout} className="btn btn-ghost">
    Déconnexion
  </button>
        </div>

        
      </header>

      <section className="card">
        <div style={{marginBottom:8}}>Bienvenue, <strong>{username}</strong> !</div>

        {contacts.length > 0 ? (
          <div className="table-wrap" role="region" aria-label="Liste de contacts">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Téléphone</th>
                  <th style={{width:180}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => {
                  const id = c._id || c.id;
                  return (
                    <tr key={id}>
                      <td>{c.contactname}</td>
                      <td>{c.contactFirstname}</td>
                      <td>{c.contactPhone}</td>
                      <td>
                        <div className="actions">
                          <button onClick={() => handleEditContact(id)} className="btn">Modifier</button>
                          <button onClick={() => handleDeleteContact(id)} className="btn btn-danger">Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="msg">Clique sur <em>“Voir mes contacts”</em> pour charger ta liste.</div>
        )}
      </section>
    </main>
  );
}
