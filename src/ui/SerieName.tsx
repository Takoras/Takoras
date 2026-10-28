// Nom d'une série : le logo dessiné à la main quand il existe (Takoras), sinon le texte
const LOGOS: Record<string, { src: string; ratio: number }> = {
  Takoras: { src: '/img/logo-takoras.png', ratio: 880 / 320 },
};
export function SerieName({ name, h = '1.25em' }: { name: string; h?: string }) {
  const l = LOGOS[name];
  if (!l) return <>{name}</>;
  return (
    <img
      className="serie-logo"
      src={l.src}
      alt={name}
      style={{ display: 'inline-block', height: h, width: 'auto', aspectRatio: String(l.ratio), verticalAlign: 'middle' }}
    />
  );
}
