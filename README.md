# Générateur de quittance de loyer

Application web statique permettant de :

- gérer les locataires (ajouter, modifier, supprimer) ;
- importer et exporter les données au format JSON ;
- générer des quittances en PDF ;
- mémoriser les informations du bailleur dans le navigateur ;
- ajouter une signature image ;
- générer toutes les quittances du mois en cours.

## Utilisation en ligne

Cette application fonctionne entièrement dans le navigateur. Elle est compatible avec GitHub Pages et ne nécessite aucun serveur.

### Données et confidentialité

Les locataires, les informations du bailleur et la signature sont stockés dans le stockage local du navigateur et ne sont pas envoyés à GitHub.

Le fichier `tenants.json` du dépôt ne contient aucune donnée personnelle réelle. Les données des locataires sont destinées à rester dans le navigateur.

## Déploiement

Le fichier `.github/workflows/deploy-pages.yml` déploie automatiquement l'application sur GitHub Pages à chaque modification de la branche `main`.

Après avoir activé GitHub Pages avec la source GitHub Actions, l'application sera accessible à l'adresse :

`https://shakur56.github.io/quittance-generator/`

## Développement local

Ouvrir `index.html` directement dans un navigateur suffit pour utiliser l'application.

La génération PDF utilise jsPDF 2.5.1 chargé depuis jsDelivr.
