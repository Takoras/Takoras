import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode, type RefObject } from 'react';
import { reducedFx } from '@/lib/settings';
import s from './motion.module.css';

// Petites animations communes du site. Elles ne touchent qu'à transform et opacity (rien à recalculer pour le
// navigateur), ne tournent jamais en boucle, et sont coupées en qualité basse et patate.
const SPRING = 'cubic-bezier(.2,1.35,.4,1)';
const KINDS: Record<string, { k: Keyframe[]; ms: number; ease: string }> = {
  pop: { k: [{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.35 }, { transform: 'scale(1)' }], ms: 320, ease: 'ease-out' },
  stamp: { k: [{ transform: 'scale(1.9)', opacity: 0 }, { transform: 'scale(.92)', opacity: 1, offset: 0.65 }, { transform: 'scale(1)' }], ms: 340, ease: 'ease-out' },
  drop: { k: [{ transform: 'translateY(-18px) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], ms: 420, ease: SPRING },
  fade: { k: [{ opacity: 0 }, { opacity: 1 }], ms: 420, ease: 'ease-out' },
};

// Rejoue un petit effet quand `v` change (jamais à l'affichage de la page)
export function Bump({
  v,
  kind = 'pop',
  as: Tag = 'span',
  className,
  style,
  label,
  children,
}: {
  v: unknown;
  kind?: keyof typeof KINDS;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  label?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const last = useRef(v);
  useEffect(() => {
    if (Object.is(last.current, v)) return;
    last.current = v;
    const fx = KINDS[kind];
    if (fx && !reducedFx()) ref.current?.animate(fx.k, { duration: fx.ms, easing: fx.ease });
  }, [v, kind]);
  return (
    <Tag
      ref={ref}
      className={[Tag === 'div' ? '' : s.bump, className].filter(Boolean).join(' ')}
      style={style}
      aria-label={label}
    >
      {children}
    </Tag>
  );
}

// Garde un élément le temps de sa sortie : il arrive avec un rebond et repart en se tassant
export function Presence({ show, enter = true, children }: { show: boolean; enter?: boolean; children: ReactNode }) {
  const [st, setSt] = useState<{ node: ReactNode; out: boolean }>({ node: show ? children : null, out: false });
  if (show && (st.node !== children || st.out)) setSt({ node: children, out: false });
  if (!show && st.node && !st.out) setSt(reducedFx() ? { node: null, out: false } : { node: st.node, out: true });
  useEffect(() => {
    if (!st.out) return;
    const id = setTimeout(() => setSt((x) => (x.out ? { node: null, out: false } : x)), 210);
    return () => clearTimeout(id);
  }, [st.out]);
  if (!st.node) return null;
  return <div className={st.out ? s.out : enter ? s.in : s.plain}>{st.node}</div>;
}

// La hauteur suit le contenu en douceur quand `k` change (rayon, onglet…)
export function AutoHeight({ k, children, className }: { k: unknown; children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const last = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!el.getAnimations().length) last.current = el.offsetHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = box.current,
      h0 = last.current;
    if (!el) return;
    const h1 = el.offsetHeight;
    last.current = h1;
    if (h0 == null || reducedFx() || Math.abs(h1 - h0) < 2) return;
    el.classList.add(s.clip ?? '');
    el.animate([{ height: `${h0}px` }, { height: `${h1}px` }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () =>
      el.classList.remove(s.clip ?? '');
  }, [k]);
  return (
    <div ref={box} className={className}>
      {children}
    </div>
  );
}

// Quand `key` change : les éléments [data-flip] glissent de leur ancienne place à la nouvelle, les nouveaux rebondissent
export function useFlip(ref: RefObject<HTMLElement | null>, key: unknown) {
  const prev = useRef<{ root: HTMLElement | null; at: Map<string, [number, number]> }>({ root: null, at: new Map() });
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>('[data-flip]')];
    const at = new Map<string, [number, number]>();
    els.forEach((e) => at.set(e.dataset.flip ?? '', [e.offsetLeft, e.offsetTop]));
    const old = prev.current;
    if (old.root === root && old.at.size && !reducedFx() && els.length <= 150)
      els.forEach((e) => {
        const a = old.at.get(e.dataset.flip ?? ''),
          b = at.get(e.dataset.flip ?? '');
        if (!b) return;
        if (!a) e.animate([{ transform: 'scale(.72)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: SPRING });
        else if (a[0] !== b[0] || a[1] !== b[1])
          e.animate([{ transform: `translate(${a[0] - b[0]}px, ${a[1] - b[1]}px)` }, { transform: 'none' }], {
            duration: 380,
            easing: 'cubic-bezier(.2,.8,.2,1)',
          });
      });
    prev.current = { root, at };
  }, [ref, key]);
}

// Cases sombres qui respirent pendant un chargement
export function Skeleton({ n = 6, h = 120, min = 150 }: { n?: number; h?: number; min?: number }) {
  return (
    <div className={s.skel} style={{ '--h': `${h}px`, '--min': `${min}px` } as CSSProperties} aria-busy role="status">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  );
}
