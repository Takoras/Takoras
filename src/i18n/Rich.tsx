import { Fragment } from 'react';

// Affiche un texte du dictionnaire qui contient des <b>…</b>, sans HTML brut :
// seules les balises <b> sont reconnues, tout le reste (y compris les variables) reste du texte.
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(<b>.*?<\/b>)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('<b>') ? <b key={i}>{p.slice(3, -4)}</b> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}
