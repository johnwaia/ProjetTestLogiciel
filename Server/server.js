const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const usersRoutes = require('./routes/users');
const sallesRoutes = require('./routes/salle');

const Salle = require('./models/salle');

const app = express();
const PORT = process.env.PORT || 5000;

// Origines autorisées (prod)
const ALLOWED_ORIGINS = [
  'https://radiant-alfajores-52e968.netlify.app',
];

// DEV: autoriser localhost/127.0.0.1/::1 + LAN privés (optionnel)
function isAllowedDevHost(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;

  // optionnel: LAN (utile si tu testes depuis mobile)
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;

  return false;
}

const corsOptions = {
  origin(origin, cb) {
    // Requêtes sans Origin (Postman/curl) => OK
    if (!origin) return cb(null, true);

    const normalized = origin.replace(/\/+$/, '');

    try {
      const url = new URL(normalized);
      const host = url.hostname;

      const isNetlifyPreview = /\.netlify\.app$/.test(host);
      const devOk = isAllowedDevHost(host);
      const prodOk = ALLOWED_ORIGINS.includes(normalized) || isNetlifyPreview;

      return (devOk || prodOk) ? cb(null, true) : cb(new Error('Not allowed by CORS'));
    } catch {
      return cb(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

// CORS
app.use(cors(corsOptions));

// ✅ IMPORTANT (Express 5 compatible): gérer OPTIONS sans app.options('*')
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return cors(corsOptions)(req, res, () => res.sendStatus(204));
  }
  next();
});

// JSON
app.use(express.json());

// Logs
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health
app.get('/', (_req, res) => res.send('API OK'));

// Routes
app.use('/api/users', usersRoutes);
app.use('/api', sallesRoutes);

// Mongo
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('❌ MONGO_URI manquant');
  process.exit(1);
}

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 7000 })
  .then(async () => {
    console.log('✅ MongoDB connecté');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API sur http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur connexion MongoDB :', err);
    process.exit(1);
  });

module.exports = app;
