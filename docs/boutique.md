# Boutique du sommeil

`/boutique/` (lien « Boutique » dans le menu Slumbywise) affiche les articles de `public/shop/products.json`. Six emplacements sont prêts, au statut « Bientôt ».

Pour chaque article :

| Champ | Rôle |
| --- | --- |
| `id` | Identifiant unique, sans espace (`masque-nuit`) |
| `nom`, `description`, `prix` | Textes affichés ; `prix` est libre (`24 €`) |
| `image` | Chemin d'une image placée dans `public/` (`/shop/masque.jpg`), format portrait 4/5 conseillé ; vide = visuel lune |
| `lien` | Page de paiement HTTPS (Stripe Payment Link, Shopify, Etsy…) ; vide = commande par WhatsApp, comme le Livre |
| `statut` | `bientot` (bouton « Me prévenir » par WhatsApp), `disponible` (« Commander »), `epuise` |

Aucun paiement n'est traité par le site : il redirige vers la page de paiement ou vers WhatsApp. Avant d'encaisser en ligne, ajouter les conditions générales de vente et les mentions légales du vendeur.
