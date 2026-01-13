describe('Système – Authentification (UI)', () => {
  const userA = Cypress.env('USER_A');
  const passA = Cypress.env('PASS_A');

  before(() => {
    cy.ensureUser(userA, passA);
  });

  it('TS-AUTH-01: Connexion via UI -> redirection page accueil', () => {
    cy.loginByUI(userA, passA);
    cy.url().should('include', '/pageAcceuil');
  });

  it('TS-AUTH-02: Accès /salles sans token -> redirection /', () => {
    cy.clearLocalStorage();      // mieux que window.localStorage.clear()
    cy.visit('/salles');

    // Vérifie qu'on est bien revenu au login
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    // Vérifie la présence du formulaire de login (adapté à ton UI)
    cy.get('#username').should('exist');
    cy.get('#password').should('exist');
    cy.contains('button', 'Connexion').should('exist');
  });

});
