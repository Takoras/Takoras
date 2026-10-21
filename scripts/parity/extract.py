#!/usr/bin/env python3
"""Inventaire automatique d'un front Takoras (ancien ou nouveau) : RPC, tables, canaux temps réel,
clés localStorage, routes et clés de traduction. Sert de base à la checklist de parité.

Usage :
  python3 scripts/parity/extract.py public            > docs/rewrite/legacy-inventory.json
  python3 scripts/parity/extract.py src --diff docs/rewrite/legacy-inventory.json
"""
import json, re, sys, pathlib

PATTERNS = {
    'rpc':      re.compile(r"""\.rpc\(\s*['"`]([a-z_0-9]+)['"`]"""),
    'tables':   re.compile(r"""\.from\(\s*['"`]([a-z_0-9]+)['"`]"""),
    'channels': re.compile(r"""\.channel\(\s*['"`]([a-z_\-]+)"""),
    'realtime': re.compile(r"""table:\s*['"`]([a-z_0-9]+)['"`]"""),
    'storage':  re.compile(r"""['"`](takoras-[a-z\-]+)['"`]"""),
    'routes':   re.compile(r"""['"`]#((?![a-f0-9]{3,6}['"`])[a-z]+)(?:/|['"`])"""),
}
KEY = re.compile(r"""(?<![\w.])([a-zA-Z_][a-zA-Z0-9_]*):\s*['"`\[{]""")

def scan(root):
    out = {k: set() for k in PATTERNS}
    out['i18n'] = set()
    for f in sorted(pathlib.Path(root).rglob('*')):
        if f.suffix not in {'.js', '.ts', '.tsx', '.jsx', '.html'} or 'node_modules' in f.parts:
            continue
        s = f.read_text(encoding='utf-8', errors='ignore')
        for k, rx in PATTERNS.items():
            out[k].update(rx.findall(s))
        # clés de traduction : bloc « fr: { … } » jusqu'à « en: { » (I18N, AT, RT, TUTO, INFO) ou fichier i18n/fr.*
        if f.stem == 'fr':
            out['i18n'].update(f'{f.parent.name}.{k}' for k in KEY.findall(s))
        else:
            for m in re.finditer(r"\bfr:\s*\{", s):
                e = re.compile(r"\n\s*en:\s*\{").search(s, m.end())
                block = s[m.end(): e.start() if e else None]
                if len(block) > 400:
                    out['i18n'].update(f'{f.stem}.{k}' for k in KEY.findall(block))
    return {k: sorted(v) for k, v in out.items()}

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cur = scan(sys.argv[1])
    if '--diff' in sys.argv:
        ref = json.loads(pathlib.Path(sys.argv[sys.argv.index('--diff') + 1]).read_text())
        missing = {k: sorted(set(ref.get(k, [])) - set(cur.get(k, []))) for k in ref}
        missing = {k: v for k, v in missing.items() if v}
        print(json.dumps({'missing': missing}, ensure_ascii=False, indent=2))
        sys.exit(1 if missing else 0)
    print(json.dumps(cur, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
