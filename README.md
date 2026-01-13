# 📅 Application de réservation de salles

Application **fullstack MERN** EASYBOOKING permettant l’authentification des utilisateurs et la réservation de salles avec visualisation des disponibilités sous forme d’emploi du temps.

---

## 🚀 Fonctionnalités

- 🔐 Authentification (inscription / connexion)
- 👤 Gestion des sessions via JWT
- 🏢 Liste des salles disponibles
- 📆 Réservation par date et créneau horaire
- ⏱️ Visualisation des créneaux libres et réservés
- 🧭 Interface moderne et responsive

---

## 🖼️ Captures d’écran

> Ajoutez vos captures d’écran dans le dossier `screenshots/` puis référencez-les ici :

```md
![Connexion](docs/page_acceuil.png)
![Accueil](docs/page_connexion.png)
![Réservation](docs/page_reservation.png)
```

---

## 🛠️ Stack technique

### Frontend
- React
- React Router
- Fetch API
- CSS moderne

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- JWT
- CORS

---

## 📂 Structure du projet

```txt
├── backend
│   ├── server.js
│   ├── routes/
│   ├── models/
│   └── .env
│
├── frontend
│   ├── src/
│   │   ├── App.js
│   │   ├── pageAcceuil.js
│   │   ├── pageSalles.js
│   │   └── assets/
│   └── App.css
│
└── README.md
```

---

## ⚙️ Installation

### 1️⃣ Cloner le projet
```bash
git clone https://github.com/johnwaia/ProjetTestLogiciel.git
cd ProjetTestLogiciel
```

### 2️⃣ Backend
```bash
cd backend
npm install
```

Créer un fichier `.env` :
```env
MONGO_URI=ton_uri_mongodb
PORT=5000
JWT_SECRET=ton_secret
```

Lancer le serveur :
```bash
npm start
```

### 3️⃣ Frontend
```bash
cd frontend
npm install
npm start
```

---

## ✅ Améliorations possibles

- Rôles (admin / utilisateur)
- Annulation de réservation
- Notifications
- Filtrage par salle
- Responsive mobile avancé

---

## 👨‍💻 Auteur

John WAIA

Projet réalisé dans un objectif **pédagogique et professionnel**.

---

## 📄 Licence

Libre d’utilisation pour un usage personnel ou éducatif.
