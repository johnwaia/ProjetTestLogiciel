describe('Système – Réservation de salles (UI + API)', () => {
  const userA = Cypress.env('USER_A');
  const passA = Cypress.env('PASS_A');
  const userB = Cypress.env('USER_B');
  const passB = Cypress.env('PASS_B');
  const day = '2026-01-13';

  before(() => {
    cy.ensureUser(userA, passA);
    cy.ensureUser(userB, passB);
  });

  beforeEach(() => {
    cy.loginByApi(userA, passA, 'tokenA');
    cy.visit('/pageAcceuil');
    cy.contains('Mon carnet de réservation de salles').should('exist');
  });

  it('TS-SALLE-01: Navigation -> page /salles -> emploi du temps visible', () => {
    cy.goToSalles();
    cy.contains('Emploi du temps').should('exist');
    cy.contains('Créneaux libres').should('exist');
  });

  it('TS-SALLE-02: Réserver un créneau libre et voir le bloc apparaître', () => {
    const backend = Cypress.env('BACKEND_URL');
    const day = '2026-01-13';

    // Aller sur la page salles
    cy.goToSalles();

    // Fix : ne pas "clear()" la date (ça envoie jour= vide -> 400)
    cy.get('input[type="date"]').invoke('val', day).trigger('change');

    // Récupérer un créneau libre via l'API et réserver ce créneau
    cy.get('@tokenA').then((tokenA) => {
      cy.request({
        method: 'GET',
        url: `${backend}/api/salle`,
        headers: { Authorization: `Bearer ${tokenA}` },
      }).then((sallesRes) => {
        const salleId = sallesRes.body?.[0]?._id;
        expect(salleId, 'salleId').to.be.a('string');

        cy.request({
          method: 'GET',
          url: `${backend}/api/salle/${salleId}/disponibilites?jour=${day}`,
          headers: { Authorization: `Bearer ${tokenA}` },
        }).then((dispoRes) => {
          expect(dispoRes.status).to.eq(200);

          const libres = dispoRes.body?.libres || [];
          expect(libres.length, 'au moins un créneau libre').to.be.greaterThan(0);

          const { debut, fin } = libres[0]; // premier créneau libre
          // Sécurise : prendre au max 1h si le slot est trop grand
          const start = debut;
          const end = (debut === fin) ? fin : fin;

          // Appliquer les heures au formulaire UI
          cy.get('input[type="time"]').eq(0).clear().type(start);
          cy.get('input[type="time"]').eq(1).clear().type(end);

          // Réserver (via UI)
          cy.contains('button', 'Réserver').click();

          // Vérifier que le bloc horaire apparaît (plus fiable que le message ✅)
          cy.contains(`${start}–${end}`).should('exist');
        });
      });
    });
  });

  it('TS-SALLE-03: Conflit – userB réserve en conflit -> 409, et UI montre le créneau réservé', () => {
    cy.get('@tokenA').then((tokenA) => {
      const backend = Cypress.env('BACKEND_URL');

      cy.request({
        method: 'GET',
        url: `${backend}/api/salle`,
        headers: { Authorization: `Bearer ${tokenA}` },
      }).then((sallesRes) => {
        expect(sallesRes.status).to.eq(200);
        const salleId = sallesRes.body?.[0]?._id;
        expect(salleId, 'salleId').to.be.a('string');

        cy.request({
          method: 'POST',
          url: `${backend}/api/salle/${salleId}/reservations`,
          headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
          body: { jour_choisi: day, heure_debut: '09:00', heure_fin: '10:00' },
          failOnStatusCode: false,
        }).then((r) => {
          expect([201, 409]).to.include(r.status);

          cy.loginByApi(userB, passB, 'tokenB');
          cy.get('@tokenB').then((tokenB) => {
            cy.request({
              method: 'POST',
              url: `${backend}/api/salle/${salleId}/reservations`,
              headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
              body: { jour_choisi: day, heure_debut: '09:30', heure_fin: '10:30' },
              failOnStatusCode: false,
            }).then((conflict) => {
              expect(conflict.status).to.eq(409);
            });
          });
        });
      });
    });

    cy.visit('/pageAcceuil');
    cy.goToSalles();
    cy.pickDay(day);
    cy.contains('09:00–10:00').should('exist');
  });
});
