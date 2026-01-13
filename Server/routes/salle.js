const express = require('express');
const Salle = require('../models/salle');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

const START = '08:00';
const END = '19:00';

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
const START_MIN = 8 * 60;
const END_MIN = 19 * 60;

function normalizeDayStr(dayStr) {
  const d = new Date(dayStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}
function sameDay(a, b) {
  const x = new Date(a); x.setHours(0, 0, 0, 0);
  const y = new Date(b); y.setHours(0, 0, 0, 0);
  return x.getTime() === y.getTime();
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  // overlap if start < otherEnd AND end > otherStart
  return aStart < bEnd && aEnd > bStart;
}

function computeFreeSlots(resForDay) {
  const busy = resForDay
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

    if (!merged.length || d > merged[merged.length - 1].f) merged.push({ d, f });
    else merged[merged.length - 1].f = Math.max(merged[merged.length - 1].f, f);
  }

  // compute free gaps
  const free = [];
  let cur = START_MIN;
  for (const seg of merged) {
    if (seg.d > cur) free.push({ debut: toHHmm(cur), fin: toHHmm(seg.d) });
    cur = Math.max(cur, seg.f);
  }
  if (cur < END_MIN) free.push({ debut: toHHmm(cur), fin: toHHmm(END_MIN) });

  return free.length ? free : [];
}

/**
 * POST /api/salle
 * créer une salle (optionnel)
 */
router.post('/salle', async (req, res) => {
  try {
    const salleName = (req.body?.salleName ?? '').toString().trim();
    if (!salleName) return res.status(400).json({ message: 'salleName requis' });

    const exists = await Salle.findOne({ salleName });
    if (exists) return res.status(409).json({ message: 'Cette salle existe déjà' });

    const salle = await Salle.create({ salleName, reservations: [] });
    return res.status(201).json(salle);
  } catch (err) {
    console.error('Erreur POST /salle :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/salle
 * -> léger: liste id + nom (utile pour menu)
 */
router.get('/salle', async (_req, res) => {
  try {
    const salles = await Salle.find()
      .select('_id salleName')
      .sort({ salleName: 1 });

    return res.status(200).json(salles);
  } catch (err) {
    console.error('Erreur GET /salle :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/salle/:id
 * -> détail salle + toutes réservations (populate username)
 */
router.get('/salle/:id', async (req, res) => {
  try {
    const salle = await Salle.findById(req.params.id)
      .populate('reservations.reservator', 'username');

    if (!salle) return res.status(404).json({ message: 'Salle non trouvée' });
    return res.status(200).json(salle);
  } catch (err) {
    console.error('Erreur GET /salle/:id :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/salle/:id/disponibilites?jour=YYYY-MM-DD
 * -> renvoie planning du jour: réservations + créneaux libres
 */
router.get('/salle/:id/disponibilites', async (req, res) => {
  try {
    const day = req.query.jour;
    const date = normalizeDayStr(day);
    if (!date) return res.status(400).json({ message: 'jour invalide (YYYY-MM-DD)' });

    const salle = await Salle.findById(req.params.id)
      .populate('reservations.reservator', 'username');

    if (!salle) return res.status(404).json({ message: 'Salle non trouvée' });

    const reservationsDay = (salle.reservations || []).filter(r => sameDay(r.jour_choisi, date));

    const formatted = reservationsDay
      .map(r => ({
        _id: r._id,
        jour_choisi: r.jour_choisi,
        heure_debut: r.heure_debut,
        heure_fin: r.heure_fin,
        reservatorId: typeof r.reservator === 'object' ? r.reservator._id : r.reservator,
        username: typeof r.reservator === 'object' ? r.reservator.username : '',
      }))
      .sort((a, b) => toMinutes(a.heure_debut) - toMinutes(b.heure_debut));

    const libres = computeFreeSlots(reservationsDay);

    return res.status(200).json({
      salle: { id: salle._id, salleName: salle.salleName },
      jour: day,
      plage: { debut: START, fin: END },
      reservations: formatted,
      libres,
    });
  } catch (err) {
    console.error('Erreur GET /salle/:id/disponibilites :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/salle/:id/reservations
 * -> ajoute une réservation si pas de chevauchement
 */
router.post('/salle/:id/reservations', async (req, res) => {
  try {
    const me = req.user?.id?.toString();
    if (!me) return res.status(401).json({ message: 'Non authentifié' });

    const { jour_choisi, heure_debut, heure_fin } = req.body || {};
    if (!jour_choisi) return res.status(400).json({ message: 'jour_choisi requis' });
    if (!heure_debut || !heure_fin) return res.status(400).json({ message: 'heure_debut et heure_fin requis' });

    if (!isHHmm(heure_debut) || !isHHmm(heure_fin)) {
      return res.status(400).json({ message: 'Format heure invalide (HH:mm)' });
    }

    const date = normalizeDayStr(jour_choisi);
    if (!date) return res.status(400).json({ message: 'jour_choisi invalide' });

    const d = toMinutes(heure_debut);
    const f = toMinutes(heure_fin);

    if (d >= f) return res.status(400).json({ message: 'heure_fin doit être après heure_debut' });
    if (d < START_MIN || f > END_MIN) return res.status(400).json({ message: 'Réservation possible uniquement entre 08:00 et 19:00' });

    const salle = await Salle.findById(req.params.id);
    if (!salle) return res.status(404).json({ message: 'Salle non trouvée' });

    const existingDay = (salle.reservations || []).filter(r => sameDay(r.jour_choisi, date));

    // vérif chevauchement
    for (const r of existingDay) {
      const rd = toMinutes(r.heure_debut);
      const rf = toMinutes(r.heure_fin);
      if (overlaps(d, f, rd, rf)) {
        return res.status(409).json({ message: 'Créneau déjà réservé' });
      }
    }

    salle.reservations.push({
      jour_choisi: date,
      heure_debut,
      heure_fin,
      reservator: me,
    });

    await salle.save();

    // renvoyer planning du jour mis à jour (avec username)
    const populated = await Salle.findById(req.params.id)
      .populate('reservations.reservator', 'username');

    const reservationsDay = (populated.reservations || []).filter(r => sameDay(r.jour_choisi, date));
    const formatted = reservationsDay
      .map(r => ({
        _id: r._id,
        jour_choisi: r.jour_choisi,
        heure_debut: r.heure_debut,
        heure_fin: r.heure_fin,
        reservatorId: typeof r.reservator === 'object' ? r.reservator._id : r.reservator,
        username: typeof r.reservator === 'object' ? r.reservator.username : '',
      }))
      .sort((a, b) => toMinutes(a.heure_debut) - toMinutes(b.heure_debut));

    return res.status(201).json({
      message: 'Réservation créée',
      reservation: formatted[formatted.length - 1],
      libres: computeFreeSlots(reservationsDay),
      reservations: formatted,
    });
  } catch (err) {
    console.error('Erreur POST /salle/:id/reservations :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/salle/:id/reservations/:reservationId
 * -> annuler une réservation (seul le reservator)
 */
router.delete('/salle/:id/reservations/:reservationId', async (req, res) => {
  try {
    const me = req.user?.id?.toString();
    if (!me) return res.status(401).json({ message: 'Non authentifié' });

    const salle = await Salle.findById(req.params.id);
    if (!salle) return res.status(404).json({ message: 'Salle non trouvée' });

    const idx = (salle.reservations || []).findIndex(r => r._id.toString() === req.params.reservationId);
    if (idx === -1) return res.status(404).json({ message: 'Réservation non trouvée' });

    const r = salle.reservations[idx];
    if (r.reservator.toString() !== me) {
      return res.status(403).json({ message: 'Seul le réservateur peut annuler cette réservation' });
    }

    const day = normalizeDayStr(r.jour_choisi);
    salle.reservations.splice(idx, 1);
    await salle.save();

    // renvoyer planning du jour
    const populated = await Salle.findById(req.params.id)
      .populate('reservations.reservator', 'username');

    const reservationsDay = (populated.reservations || []).filter(x => sameDay(x.jour_choisi, day));
    const formatted = reservationsDay
      .map(x => ({
        _id: x._id,
        jour_choisi: x.jour_choisi,
        heure_debut: x.heure_debut,
        heure_fin: x.heure_fin,
        reservatorId: typeof x.reservator === 'object' ? x.reservator._id : x.reservator,
        username: typeof x.reservator === 'object' ? x.reservator.username : '',
      }))
      .sort((a, b) => toMinutes(a.heure_debut) - toMinutes(b.heure_debut));

    return res.status(200).json({
      message: 'Réservation supprimée',
      libres: computeFreeSlots(reservationsDay),
      reservations: formatted,
    });
  } catch (err) {
    console.error('Erreur DELETE /salle/:id/reservations/:reservationId :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/salle/:id
 * -> compat avec l'ancienne logique:
 *   - { reservee:true, jour_choisi, heure_debut, heure_fin } => ajoute une réservation
 *   - { reservee:false, reservationId } => supprime la réservation (si reservator)
 */
router.patch('/salle/:id', async (req, res) => {
  try {
    const { reservee } = req.body || {};

    if (reservee === true) {
      // forward vers création
      req.url = `/salle/${req.params.id}/reservations`;
      return router.handle(req, res);
    }

    if (reservee === false) {
      const reservationId = req.body?.reservationId;
      if (!reservationId) return res.status(400).json({ message: 'reservationId requis pour libérer' });

      req.params.reservationId = reservationId;
      req.url = `/salle/${req.params.id}/reservations/${reservationId}`;
      req.method = 'DELETE';
      return router.handle(req, res);
    }

    return res.status(400).json({ message: 'reservee doit être true ou false' });
  } catch (err) {
    console.error('Erreur PATCH /salle/:id :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/salle/:id
 * supprimer une salle (optionnel)
 */
router.delete('/salle/:id', async (req, res) => {
  try {
    const salle = await Salle.findByIdAndDelete(req.params.id);
    if (!salle) return res.status(404).json({ message: 'Salle non trouvée' });
    return res.status(200).json({ message: 'Salle supprimée' });
  } catch (err) {
    console.error('Erreur DELETE /salle/:id :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
