import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { sb } from './supabase';

// Session du joueur. `ready` = on sait s'il est connecté ou non (évite un clignotement au chargement).
export const useAuth = create<{ user: User | null; ready: boolean }>(() => ({ user: null, ready: false }));

let started = false;
export function initAuth() {
  if (started) return;
  started = true;
  void sb.auth.getSession().then(({ data }) => useAuth.setState({ user: data.session?.user ?? null, ready: true }));
  sb.auth.onAuthStateChange((_event, session) => useAuth.setState({ user: session?.user ?? null, ready: true }));
}

// Connexion Discord uniquement (comme l'ancien site). Retour sur la page d'accueil.
export const signInDiscord = () =>
  sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: `${location.origin}/` } });
export const signOut = () => sb.auth.signOut();
export const PSEUDO_RE = /^[A-Za-z0-9_.-]{3,16}$/;
