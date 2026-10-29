// Nom d'une série : le logo dessiné à la main quand il existe (Takoras), sinon le texte
const LOGOS: Record<string, { src: string; ratio: number }> = {
  Takoras: { src: '/img/logo-takoras.png?v=2', ratio: 880 / 320 },
};
export function SerieName({ name, h = '1.25em', doodle }: { name: string; h?: string; doodle?: boolean }) {
  const l = LOGOS[name];
  if (!l) return <>{name}</>;
  return (
    <img
      className={doodle ? 'px serie-logo' : 'serie-logo'}
      src={l.src}
      alt={name}
      style={{ display: 'inline-block', height: h, width: 'auto', aspectRatio: String(l.ratio), verticalAlign: 'middle' }}
    />
  );
}
