import { useSettings } from '@/lib/settings';
import s from './Privacy.module.css';

// Confidentialité : ce que Takoras garde sur toi, en clair (FR / EN)
const TXT = {
  fr: {
    title: 'Confidentialité',
    blocks: [
      [
        'Ce qu’on garde',
        'Ton identifiant de connexion (Discord ou e-mail), ton pseudo, ton avatar et ta bannière, et ta progression dans le jeu : jetons, pièces, objets, quêtes, passe, classé, amis.',
      ],
      [
        'Pourquoi',
        'Uniquement pour faire marcher le jeu : sauvegarder ta collection, afficher les classements et ton profil public.',
      ],
      [
        'Ce qu’on ne fait pas',
        'Pas de publicité, pas de revente de données, pas de traqueur. Aucun paiement n’est ouvert pour l’instant.',
      ],
      [
        'Ce qui est public',
        'Ton pseudo, ton avatar, ta bannière, ta vitrine, tes stats de collection et ton rang classé.',
      ],
      [
        'Supprimer ton compte',
        'Demande-le avec le bouton « Donner un avis » : on efface ton compte et toutes tes données.',
      ],
    ],
  },
  en: {
    title: 'Privacy',
    blocks: [
      [
        'What we keep',
        'Your login id (Discord or e-mail), your username, avatar and banner, and your game progress: tokens, coins, items, quests, pass, ranked, friends.',
      ],
      ['Why', 'Only to run the game: save your collection, show leaderboards and your public profile.'],
      ['What we don’t do', 'No ads, no selling data, no trackers. No payments are open yet.'],
      ['What is public', 'Your username, avatar, banner, showcase, collection stats and ranked rank.'],
      ['Delete your account', 'Ask with the “Feedback” button: we erase your account and all your data.'],
    ],
  },
};

export default function Privacy() {
  const lang = useSettings((x) => x.lang);
  const d = TXT[lang === 'en' ? 'en' : 'fr'];
  return (
    <section className={s.page}>
      <h1>{d.title}</h1>
      {d.blocks.map(([h, p]) => (
        <article key={h}>
          <h2>{h}</h2>
          <p>{p}</p>
        </article>
      ))}
    </section>
  );
}
