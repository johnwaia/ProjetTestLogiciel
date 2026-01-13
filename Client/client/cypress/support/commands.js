// Commandes custom adaptées à ton UI (App.js / pageAcceuil.js / pageSalles.js)

Cypress.Commands.add('ensureUser', (username, password) => {
  const backend = Cypress.env('BACKEND_URL');
  // register peut renvoyer 409 si déjà créé — on accepte
  return cy.request({
    method: 'POST',
    url: `${backend}/api/users/register`,
    failOnStatusCode: false,
    body: { username, password },
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => {
    expect([201, 409]).to.include(res.status);
  });
});

Cypress.Commands.add('loginByApi', (username, password, tokenAlias = 'token') => {
  const backend = Cypress.env('BACKEND_URL');
  return cy.request({
    method: 'POST',
    url: `${backend}/api/users/login`,
    body: { username, password },
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => {
    expect(res.status).to.eq(200);
    expect(res.body).to.have.property('token');

    window.localStorage.setItem('token', res.body.token);
    window.localStorage.setItem('userId', res.body.user?.id || res.body.user?._id || '');
    window.localStorage.setItem('lastUsername', res.body.user?.username || username);

    cy.wrap(res.body.token).as(tokenAlias);
  });
});

Cypress.Commands.add('loginByUI', (username, password) => {
  cy.visit('/');
  cy.get('#username').clear().type(username);
  cy.get('#password').clear().type(password);
  cy.contains('button', 'Connexion').click();
  cy.contains('Mon carnet de réservation de salles').should('exist');
});

Cypress.Commands.add('goToSalles', () => {
  cy.contains('button', 'Réserver une salle').click();
  cy.contains('Réservation par salle').should('exist');
});

Cypress.Commands.add('pickDay', (yyyy_mm_dd) => {
  cy.get('input[type="date"]').clear().type(yyyy_mm_dd);
});

Cypress.Commands.add('setTimeRange', (start, end) => {
  cy.get('input[type="time"]').eq(0).clear().type(start);
  cy.get('input[type="time"]').eq(1).clear().type(end);
});

Cypress.Commands.add('reserve', () => {
  cy.contains('button', 'Réserver').click();
});
