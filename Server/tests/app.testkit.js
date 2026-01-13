const express = require('express');
const usersRouter = require('../routes/users'); // adapte le chemin si besoin

function makeApp() {
  const app = express();
  app.use(express.json());

  // routes
  app.use('/api/users', usersRouter);

  return app;
}

module.exports = { makeApp };
