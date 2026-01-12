const express = require('express');
const Salle = require('../models/salle');

const router = express.Router();

/**
 * POST /api/salle
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
    const salle = await Salle.findById(req.params.id);
    if (!salle) return res.status(404).json({ message: 'Salle non trouvée' });
    return res.status(200).json(salle);
  } catch (err) {
    console.error('Erreur GET /salle/:id :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/salle/:id
 */
router.patch('/salle/:id', async (req, res) => {
  try {
    const { reservee, reservator, jour_choisi, heure_debut, heure_fin } = req.body || {};

    // 1) Si on libère : on remet tout à null
    if (reservee === false) {
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
      );

      if (!salle) return res.status(404).json({ message: 'Salle non trouvée' });
      return res.status(200).json(salle);
    }

    // 2) Si on réserve : tous les champs doivent être là
    if (reservee !== true) {
      return res.status(400).json({ message: 'reservee doit être true ou false' });
    }

    if (!reservator) return res.status(400).json({ message: 'reservator requis' });
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

    const salle = await Salle.findByIdAndUpdate(
      req.params.id,
      {
        reservee: true,
        reservator,
        jour_choisi: date,
        heure_debut,
        heure_fin,
      },
      { new: true, runValidators: true }
    );

    if (!salle) return res.status(404).json({ message: 'Salle non trouvée' });
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
