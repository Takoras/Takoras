# scripts/db — extraction et contrôle d'écart du schéma Supabase

La base de Takoras (projet `joyskjoofihwhycyreyn`) a longtemps été modifiée à la main.
`supabase/schema/baseline.sql` est la photo de référence du schéma `public`, extraite en
**lecture seule** (uniquement des `SELECT` sur `pg_catalog`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `scripts/db/extract.sql` | Requête unique (SELECT seulement) qui renvoie une ligne, colonne `dump`, avec tout le schéma |
| `supabase/schema/baseline.sql` | En-tête (11 lignes) + contenu de `dump` |
| `supabase/schema/SECURITY-NOTES.md` | Constats faits pendant l'extraction (à traiter en phase 2) |
| `supabase/migrations/` | Futures migrations versionnées (phase 2). Vide pour l'instant |

Ordre des sections : extensions, tables (séquences, colonnes, contraintes), index, fonctions,
triggers, RLS, policies, droits, realtime, cron. Les droits sont écrits sous forme
`REVOKE ALL … FROM PUBLIC, anon, authenticated, service_role` puis `GRANT …` pour refléter
l'ACL effective (y compris le `EXECUTE` implicite à PUBLIC quand l'ACL est vide).

## Ré-extraire

Au choix :

- **MCP Supabase (Claude)** : `execute_sql` avec le contenu de `scripts/db/extract.sql`.
  La sortie (~130 Ko) dépasse la limite d'affichage et est enregistrée dans un fichier ;
  récupérer la valeur de la colonne `dump` (JSON) dans ce fichier.
- **psql** (connexion lecture seule, chaîne de connexion dans une variable d'environnement
  locale, **jamais** dans le repo) :

  ```bash
  psql "$TAKORAS_DB_URL" -X -A -t -f scripts/db/extract.sql > /tmp/dump.sql
  ```

Ne jamais lancer `apply_migration` ni de requête d'écriture pour extraire.

## Contrôle d'écart

On compare la nouvelle extraction à la baseline sans son en-tête :

```bash
tail -n +12 supabase/schema/baseline.sql | diff -u - /tmp/dump.sql
```

- Aucune sortie : la base correspond à la baseline (+ migrations déjà intégrées).
- Une différence : quelqu'un a modifié la base hors migrations, ou une migration n'a pas été
  reportée dans la baseline. La ligne `-- Comptes : …` en tête du dump donne un résumé rapide
  (nb de fonctions, tables, policies, triggers, index, tables realtime).

Une fois les migrations en place (phase 2), la règle est : toute modification passe par un
fichier dans `supabase/migrations/`, puis on régénère la baseline et on vérifie que le diff
ne montre que ce que la migration a changé.

## Hors périmètre

Les schémas gérés par Supabase (`auth`, `storage`, `realtime`, `vault`…) ne sont pas
extraits. Seul objet notable : le trigger `on_auth_user_created` sur `auth.users` qui appelle
`public.handle_new_user()` (rappelé en commentaire dans l'en-tête de la baseline).
Pas de `pg_cron` installé au moment de l'extraction ; s'il l'est un jour, exporter
`select jobname, schedule, command from cron.job` (sans secrets) dans la section 10.
