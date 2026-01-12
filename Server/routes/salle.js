const express = require('express');
const Salle = require('../models/salle');

// ✅ Ajoute ton middleware d'auth si tu l'as (recommandé)
// Si ton fichier s'appelle autrement, adapte le chemin.
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// ✅ Protéger toutes les routes salles (sinon impossible de vérifier qui libère)
router.use(requireAuth);

/**
 * POST /api/salle
 * (Optionnel) tu peux garder si tu crées des salles via l’API
 */
router.post('/salle', async (req, res) => {
  try {
    const salleName = (req.body?.salleName ?? '').toString().trim();
    const reservee = Boolean(req.body?.reservee);

    const jour = (req.body?.reservation?.jour ?? '').toString().trim();
    const heure = (req.body?.reservation?.heure ?? '').toString().trim();
    const nom = (req.body?.reservation?.nom ?? '').toString().trim();

    if (!salleName) return res.status(400).json({ message: 'Données manquantes' });

    if (reservee && (!jour || !heure || !nom)) {
      return res.status(400).json({ message: 'Réservation incomplète' });
    }

    const exists = await Salle.findOne({ salleName });
    if (exists) return res.status(409).json({ message: 'Cette salle existe déjà' });

    const salle = await Salle.create({
      salleName,
      reservee,
      reservation: reservee ? { jour, heure, nom } : null,
    });

    return res.status(201).json(salle);
  } catch (err) {
    console.error('Erreur POST /salle :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/salle
 */
router.get('/salle', async (_req, res) => {
  try {
    const salles = await Salle.find()
      .populate('reservator', 'username')
      .sort({ salleName: 1 });

    return res.status(200).json(salles);
  } catch (err) {
    console.error('Erreur GET /salle :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/salle/:id
 */
router.get('/salle/:id', async (req, res) => {
  try {
    const salle = await Salle.findById(req.params.id).populate('reservator', 'username');
    if (!salle) return res.status(404).json({ message: 'Salle non trouvée' });
    return res.status(200).json(salle);
  } catch (err) {
    console.error('Erreur GET /salle/:id :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/salle/:id
 * - reservee=false : libérer (SEULEMENT le réservateur)
 * - reservee=true  : réserver
 */
router.patch('/salle/:id', async (req, res) => {
  try {
    const { reservee, reservator, jour_choisi, heure_debut, heure_fin } = req.body || {};

    const me = req.user?.id?.toString();
    if (!me) return res.status(401).json({ message: 'Non authentifié' });

    // 1) LIBÉRER : seul le réservateur peut libérer
    if (reservee === false) {
      const salleCurrent = await Salle.findById(req.params.id);
      if (!salleCurrent) return res.status(404).json({ message: 'Salle non trouvée' });

      // si déjà libre => OK (idempotent)
      if (!salleCurrent.reservee) {
        const populated = await Salle.findById(req.params.id).populate('reservator', 'username');
        return res.status(200).json(populated);
      }

      const reservatorId = salleCurrent.reservator?.toString();
      if (!reservatorId || reservatorId !== me) {
        return res.status(403).json({ message: 'Seul le réservateur peut libérer cette salle' });
      }

      const salle = await Salle.findByIdAndUpdate(
        req.params.id,
        {
          reservee: false,
          reservator: null,
          jour_choisi: null,
          heure_debut: null,
          heure_fin: null,
        },
        { new: true, runValidators: true }
      ).populate('reservator', 'username');

      return res.status(200).json(salle);
    }

    // 2) RÉSERVER : on force reservator = user connecté (plus fiable que le front)
    if (reservee !== true) {
      return res.status(400).json({ message: 'reservee doit être true ou false' });
    }

    if (!jour_choisi) return res.status(400).json({ message: 'jour_choisi requis' });
    if (!heure_debut || !heure_fin) return res.status(400).json({ message: 'heure_debut et heure_fin requis' });

    // format HH:mm (simple)
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!hhmm.test(heure_debut) || !hhmm.test(heure_fin)) {
      return res.status(400).json({ message: 'Format heure invalide (HH:mm)' });
    }

    // heure_debut < heure_fin
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    if (toMin(heure_debut) >= toMin(heure_fin)) {
      return res.status(400).json({ message: 'heure_fin doit être après heure_debut' });
    }

    // jour_choisi : accepte "YYYY-MM-DD"
    const date = new Date(jour_choisi);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'jour_choisi invalide' });
    }

    // Optionnel : empêcher de réserver une salle déjà réservée par quelqu'un d'autre
    const current = await Salle.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Salle non trouvée' });
    if (current.reservee && current.reservator?.toString() !== me) {
      return res.status(409).json({ message: 'Salle déjà réservée' });
    }

    const salle = await Salle.findByIdAndUpdate(
      req.params.id,
      {
        reservee: true,
        reservator: me, // ✅ on ignore reservator du front
        jour_choisi: date,
        heure_debut,
        heure_fin,
      },
      { new: true, runValidators: true }
    ).populate('reservator', 'username');

    return res.status(200).json(salle);
  } catch (err) {
    console.error('Erreur PATCH /salle/:id :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/salle/:id
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
