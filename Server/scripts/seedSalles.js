require('dotenv').config();
const mongoose = require('mongoose');
const Salle = require('../models/salle');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI manquant');

  await mongoose.connect(uri);
  console.log('✅ Mongo connecté');

  const salles = Array.from({ length: 10 }, (_, i) => ({
    salleName: `Salle ${String(i + 1).padStart(2, '0')}`,
    reservee: false,
    reservator: null,
    jour_choisi: null,
    heure_debut: null,
    heure_fin: null,
  }));

  // upsert => si tu relances, pas de doublons
  for (const s of salles) {
    await Salle.updateOne(
      { salleName: s.salleName },
      { $setOnInsert: s },
      { upsert: true }
    );
  }

  console.log('✅ 10 salles insérées (sans doublons)');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error('❌ Seed error:', e);
  process.exit(1);
});
