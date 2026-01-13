# Cypress – Dossier prêt à copier

Ce dossier est adapté à ton UI actuelle :
- Login: inputs `#username`, `#password`, bouton **Connexion**
- Page accueil: bouton **Réserver une salle**
- Page salles: bouton **Réserver**, inputs `date` et `time`, grille **Emploi du temps**

## Installation (dans ton dossier Front / client)
```bash
npm i -D cypress
```

## Scripts à ajouter dans package.json
```json
{
  "scripts": {
    "cy:open": "cypress open",
    "cy:run": "cypress run"
  }
}
```

## Lancer
1) Backend : `npm start` (port 5000)
2) Frontend : `npm start` (port 3000)
3) Cypress :
```bash
npm run cy:open
# ou
npm run cy:run
```

## Variables (optionnel)
Dans `cypress.config.js` tu peux changer USER_A / PASS_A / USER_B / PASS_B.
