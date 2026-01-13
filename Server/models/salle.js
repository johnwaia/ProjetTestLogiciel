const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    jour_choisi: { type: Date, required: true }, // jour (date à minuit)
    heure_debut: { type: String, required: true, trim: true }, // HH:mm
    heure_fin: { type: String, required: true, trim: true },   // HH:mm
    reservator: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  },
  { _id: true, timestamps: true }
);

const salleSchema = new mongoose.Schema(
  {
    salleName: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
    reservations: { type: [reservationSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

function isHHmm(v) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function toHHmm(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}
const START_MIN = 8 * 60;  // 08:00
const END_MIN = 19 * 60;   // 19:00

function normalizeDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a, b) {
  return normalizeDay(a).getTime() === normalizeDay(b).getTime();
}

// Service pur (réutilisable routes/virtual)
function computeFreeSlotsForDay(reservationsForDay) {
  // reservationsForDay: [{ heure_debut, heure_fin }]
  const busy = reservationsForDay
    .filter(r => isHHmm(r.heure_debut) && isHHmm(r.heure_fin))
    .map(r => ({ d: toMinutes(r.heure_debut), f: toMinutes(r.heure_fin) }))
    .filter(x => x.d < x.f)
    .sort((a, b) => a.d - b.d);

  // merge overlaps
  const merged = [];
  for (const seg of busy) {
    const d = Math.max(START_MIN, seg.d);
    const f = Math.min(END_MIN, seg.f);
    if (f <= START_MIN || d >= END_MIN) continue;

    if (!merged.length || d > merged[merged.length - 1].f) {
      merged.push({ d, f });
    } else {
      merged[merged.length - 1].f = Math.max(merged[merged.length - 1].f, f);
    }
  }

  // compute free gaps
  const free = [];
  let cur = START_MIN;
  for (const seg of merged) {
    if (seg.d > cur) free.push({ debut: toHHmm(cur), fin: toHHmm(seg.d) });
    cur = Math.max(cur, seg.f);
  }
  if (cur < END_MIN) free.push({ debut: toHHmm(cur), fin: toHHmm(END_MIN) });

  return free;
}

// ✅ Virtual “service” : calcule les dispos restantes pour “aujourd’hui” (UTC/local)
// (Pour un jour spécifique, on calcule plutôt dans la route avec query ?jour=YYYY-MM-DD)
salleSchema.virtual('disponibilitesRestantesAujourdhui').get(function () {
  const today = normalizeDay(new Date());
  const dayRes = (this.reservations || []).filter(r => sameDay(r.jour_choisi, today));
  return computeFreeSlotsForDay(dayRes);
});

// Index unique sur le nom de salle
salleSchema.index({ salleName: 1 }, { unique: true });

module.exports = mongoose.model('salle', salleSchema);

// Export util si tu veux l'utiliser dans les routes (optionnel)
module.exports.computeFreeSlotsForDay = computeFreeSlotsForDay;
module.exports.normalizeDay = normalizeDay;
