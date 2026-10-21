# Takoras

Gacha de jetons en pixel art + duel « Ring ». Front React (Vite + TypeScript), back Supabase, hébergé sur Cloudflare Workers.

## Lancer en local

```bash
npm install
npm run dev          # http://localhost:5173
```

## Vérifier avant de pousser

```bash
npm run check        # types + lint + tests + build
npm run e2e          # Playwright, téléphone 375 px et PC 1280 px
npm run parity       # ce qui manque encore par rapport à l'ancien site
```

## Dossiers

- `src/` : l'application React.
- `public/` : images et `_headers`, copiés tels quels dans `dist/`.
- `legacy/` : l'ancien site vanilla (référence pendant la réécriture, supprimé après la bascule).
- `supabase/` : schéma SQL, migrations, tests SQL.
- `docs/rewrite/` : inventaire, checklist de parité, captures de référence.
