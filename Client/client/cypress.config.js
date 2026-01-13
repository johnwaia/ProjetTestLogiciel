const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      BACKEND_URL: 'http://localhost:5000',
      // Comptes de test (à adapter si besoin)
      USER_A: 'coco@toto.com',
      PASS_A: '123456789',
      USER_B: 'bob@toto.com',
      PASS_B: 'password123'
    },
    video: true,
    screenshotOnRunFailure: true,
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
  },
});
