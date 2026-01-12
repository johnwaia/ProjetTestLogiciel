const mongoose = require('mongoose');

const salleSchema = new mongoose.Schema(
  {
    salleName: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },

    reservee: { type: Boolean, default: false },

    // ID de l’utilisateur qui a réservé (ou null si pas réservé)
    reservator: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },

    // Jour choisi (format Date, recommandé)
    jour_choisi: { type: Date, default: null },

    // Heures au format "HH:mm"
    heure_debut: { type: String, default: null, trim: true },
    heure_fin: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

// helpers validation simple HH:mm
function isHHmm(v) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

salleSchema.pre('validate', function (next) {
  if (this.reservee) {
    // si réservé => champs obligatoires
    if (!this.reservator) this.invalidate('reservator', 'reservator obligatoire si la salle est réservée.');
    if (!this.jour_choisi) this.invalidate('jour_choisi', 'jour_choisi obligatoire si la salle est réservée.');
    if (!this.heure_debut || !isHHmm(this.heure_debut)) this.invalidate('heure_debut', 'heure_debut doit être au format HH:mm.');
    if (!this.heure_fin || !isHHmm(this.heure_fin)) this.invalidate('heure_fin', 'heure_fin doit être au format HH:mm.');

    if (this.heure_debut && this.heure_fin && isHHmm(this.heure_debut) && isHHmm(this.heure_fin)) {
      if (toMinutes(this.heure_debut) >= toMinutes(this.heure_fin)) {
        this.invalidate('heure_fin', 'heure_fin doit être après heure_debut.');
      }
    }
  } else {
    // si pas réservé => tout remettre à null
    this.reservator = null;
    this.jour_choisi = null;
    this.heure_debut = null;
    this.heure_fin = null;
  }
  next();
});

// unique sur nom de salle
salleSchema.index({ salleName: 1 }, { unique: true });

module.exports = mongoose.model('salle', salleSchema);
