# Design system Takoras

Tokens : `src/styles/tokens.css` (aucune couleur, taille, rayon, ombre ou durée en dur ailleurs).
Composants : `src/ui/`.

## Principes
- **Salle d'arcade de nuit.** Fond presque noir, surfaces mates, la lumière vient des jetons (`--g`).
- **Un seul accent.** Le violet sert uniquement à l'action principale de l'écran. L'orange (`--gold`) est réservé aux pièces et à l'urgence.
- **Pixel art net** (classe `.px`). Rayons petits (4 à 16 px). Le rond est réservé aux avatars et aux pastilles.
- **Mobile d'abord** : cibles tactiles de 44 px minimum. Barre d'onglets sous 760 px (`--tabh`), clavier pris en compte (`--kb`).
- **Anti-slop** : pas de dégradés violets partout, pas d'emoji servant d'icônes dans l'interface, pas de grilles de cartes toutes identiques.

## Tokens
| Groupe | Tokens |
|---|---|
| Fonds | `--bg`, `--bg-raised`, `--surface`, `--surface-2`, `--surface-3`, `--line`, `--line-strong` |
| Texte | `--text`, `--text-2`, `--muted`, `--faint` |
| Action | `--accent`, `--accent-hi`, `--accent-lo`, `--gold`, `--gold-hi` |
| États | `--ok`, `--warn`, `--danger`, `--info` |
| Raretés | `--r-common`, `--r-rare`, `--r-epic`, `--r-legend`, `--r-myth` (classes `.r-*`) |
| Variantes | `--v-gold`, `--v-celeste`, `--v-ombre` |
| Ring | `--me` (vert), `--foe` (rouge) |
| Typo | `--font-display` (Space Grotesk), `--font-body` (Inter), `--fs-xs` à `--fs-3xl` |
| Espaces | `--s-1` à `--s-12` (grille de 4), `--gutter` 16 px |
| Ombres | `--press` (ombre « arcade » des boutons), `--shadow-1`, `--shadow-pop`, `--glow-shadow` |
| Mouvement | `--t-fast` 120 ms, `--t-med` 220 ms, `--t-slow` 420 ms (à 0 si `prefers-reduced-motion`), `--ease-out`, `--ease-spring` |
| Empilement | `--z-nav`, `--z-tabbar`, `--z-overlay`, `--z-modal`, `--z-toast` |

Les polices sont hébergées par le site (`@fontsource-variable`), il n'y a pas d'appel à Google Fonts.

## Composants
| Composant | Rôle | Accessibilité |
|---|---|---|
| `Button` (`primary`, `ghost`, `danger`, `gold` ; `sm`, `md`, `lg` ; `loading`, `block`) | `primary` = une seule action principale par écran ; il s'enfonce au clic | `aria-busy` pendant le chargement, 44 px minimum |
| `Modal` | Fenêtre sur `<dialog>` natif ; `locked` = impossible à fermer | Focus piégé, Échap ferme, fond inerte |
| `toast(text, bad)` + `ToastHost` | Message de 2,6 s en bas, au-dessus de la barre d'onglets | `role="status"`, `aria-live` ; uniquement du texte |
| `confirm(text, {danger, typed})` + `ConfirmHost` | Remplace `confirm()` natif ; `typed` = mot à taper | Dans un `Modal` |
| `Avatar` | Photo de profil ou initiale ; les photos manquantes sont demandées en une seule requête groupée | Décoratif (`aria-hidden`), le pseudo est à côté |
| `Segmented` | Choix exclusif (vitesse, langue, période) | `radiogroup` / `radio` + `aria-checked` |

## Textes
- `useT()` donne `t('ui.cle', {vars})`. Les dictionnaires sont dans `src/i18n/fr.ts` et `en.ts` ; une clé EN manquante empêche la compilation.
- Le gras du dictionnaire passe par `<Rich text={…}>`. Il n'y a jamais de HTML brut (règle ESLint).
