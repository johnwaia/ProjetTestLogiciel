const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user'); 

const router = express.Router();
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'username et password sont requis' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mot de passe >= 6 caractères' });
    }

    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ message: 'Ce nom d’utilisateur existe déjà' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });

    return res.status(201).json({ id: user._id, username: user.username, createdAt: user.createdAt });
  } catch (err) {
    console.error('Erreur /register :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'username et password requis' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ✅ UNE SEULE réponse
    return res.status(200).json({
      token,
      user: { id: user._id, username: user.username },
    });
  } catch (err) {
    // ✅ Si une réponse a déjà été envoyée, on ne renvoie rien
    if (res.headersSent) return;

    console.error('Erreur /login :', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});


module.exports = router;
