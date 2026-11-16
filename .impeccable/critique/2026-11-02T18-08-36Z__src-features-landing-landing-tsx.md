---
target: accueil (landing)
total_score: 21
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 3
target_identity: "file:/Users/bilal/Library/Application Support/Claude/scratch-workspaces/7d5aed36-e4a1-4e40-b6ef-0716187ccdce/960cc8e5-5541-4d28-8d17-175090b62a48/scratch-2026-10-15-6cc3f0/takoras-react/src/features/landing/Landing.tsx"
target_fingerprint: "sha256:2b61aa0086835af4c1583222eec70dc354bb38a2306716c0dae5e0352280ad9c"
target_path: /Users/bilal/Library/Application Support/Claude/scratch-workspaces/7d5aed36-e4a1-4e40-b6ef-0716187ccdce/960cc8e5-5541-4d28-8d17-175090b62a48/scratch-2026-10-15-6cc3f0/takoras-react/src/features/landing/Landing.tsx
timestamp: 2026-11-02T18-08-36Z
slug: src-features-landing-landing-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Score: 21/32 (Acceptable) — h7 et h10 n/a (landing)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 2 | Hero vide 2-4 s (fondu), "1 en ligne" |
| 2 | Real world | 3 | "Probas & infos" en CTA de hero |
| 3 | Control | 3 | Mur "tourne ton téléphone" en portrait |
| 4 | Consistency | 2 | Connexion + Jouer violets, même action ; police Outfit ≠ DESIGN.md |
| 5 | Error prevention | 3 | Crédits sans état chargement/erreur |
| 6 | Recognition | 3 | Sprites sans nom |
| 7 | Flexibility | n/a | landing |
| 8 | Minimalist | 2 | Sections plein écran vides (min-height 100svh) |
| 9 | Error recovery | 3 | Blueprint/AutoDemo null silencieux |
| 10 | Help | n/a | landing |

## Specificity
À moitié Takoras : Blueprint + AutoDemo authored ; reste = template SaaS (logo centré, H1, 2 boutons, étapes 01-04 identiques, CTA final). Detector : codex-grid-background (Landing.module.css:74), bounce-easing (--ease-spring, Toast), pulsing-dot + marquee (Home.module.css:396/414), dark-glow (Layout.module.css:559), kicker "#014" (Landing.tsx:91).

## Priority issues
- [P0] Téléphone : portrait = mur de rotation, paysage = Jouer ~35×20 px réels sous la bannière d'install → /impeccable adapt
- [P1] Hero montre le logo, pas un jeton ; pas d'énergie arcade → /impeccable bolder
- [P1] Sections plein écran vides, 8 écrans sur PC → /impeccable layout
- [P1] Fil "En direct" : un compte enchaîne des mythiques + "1 en ligne" → jeu vide et jackpots trompeurs → /impeccable harden
- [P2] Deux boutons violets pour la même action → /impeccable colorize

## Personas
Jordan : ne voit un jeton qu'à l'écran 3, raretés avant explication. Casey : mur portrait, Jouer minuscule, 9 sections. Riley : "#014" et "1/100 000" en dur, crédits sans état, callouts qui se chevauchent en EN.

## Minor
Liens du fil 13 px ; 0{i+1} casse après 9 ; 6 sprites en 4+2 ; monospace et tailles hors tokens ; AutoDemo tourne hors écran ; alt vides.
