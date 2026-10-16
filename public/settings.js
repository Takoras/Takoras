// Paramètres du joueur (sauvegardés dans le navigateur) + traductions FR / EN.
// Chargé en premier : les autres scripts utilisent SETTINGS et t().

const SETTINGS = { speed: 'normal', lang: 'fr', volume: 70, fx: 'full' };
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('takoras-settings'))); } catch {}
const saveSettings = () => { try { localStorage.setItem('takoras-settings', JSON.stringify(SETTINGS)); } catch {} };

// Vitesse des ouvertures : facteur appliqué aux durées (rotation, blocage…)
const SPEED = { normal: 1, rapide: .5, instant: 0 };
const speed = () => SPEED[SETTINGS.speed] ?? 1;
const reducedFx = () => SETTINGS.fx === 'reduced';
const LOCALE = () => (SETTINGS.lang === 'en' ? 'en-US' : 'fr-FR');

const I18N = {
  fr: {
    nav_home: 'Accueil', nav_board: 'Classement', pulls: 'Pulls', history: 'Mon historique', see_all: 'Tout voir',
    live: 'En direct', live_empty: 'Les tirages des joueurs apparaîtront ici', board_tag: 'Classement', board_title: 'Les meilleurs joueurs',
    week: 'Cette semaine', all_time: 'Depuis toujours', board_empty: 'Aucun joueur classé pour l’instant. Connecte-toi et ouvre un pull pour y entrer !',
    hist_empty: 'Aucun pull pour l’instant', ago: 'il y a {n}', just_now: 'à l’instant', you: 'Toi', got: 'a eu',
    grp_perm: 'Permanents', grp_lim: 'Limités', grp_we: 'Week-end', free: 'Gratuit · se recharge', limited: 'Limité', permanent: 'Permanent', sat_sun: 'Sam–Dim',
    ends_in: 'Se termine dans', weekend_only: 'Disponible seulement le samedi et le dimanche', always: 'Toujours disponible', pull: 'Pull',
    k_pulls: 'Pulls ouverts', k_gain: 'Meilleur gain', k_tokens: 'Jetons totaux', k_collec: 'Collection',
    stock_full: 'stock plein', plus1_in: '+1 dans {t}', pulls_word: 'pulls', open1: 'Ouvrir 1', open_all: 'Tout ouvrir ({n})',
    stock_max: 'Stock max {a} → {b}', stock_top: 'Stock max atteint (10)', open_again: 'Ouvrir encore · reste {n}', no_pull: 'Plus de pull · +1 dans {t}',
    click_coin: 'Clique sur le jeton', click_reveal: 'Clique pour révéler', next: 'Suivant · {a}/{b}', see_recap: 'Voir le récap', back: 'Retour',
    series: 'Série Takoras', stats_note: 'Statistiques provisoires · combats bientôt', s_hp: 'PV', s_atk: 'Attaque', s_def: 'Défense', s_spd: 'Vitesse',
    recap_tag: 'Récap · {n} pulls', recap_title: 'Tes {n} jetons', best: 'Meilleur tirage',
    settings: 'Paramètres', set_speed: 'Vitesse des ouvertures', sp_normal: 'Normale', sp_fast: 'Rapide', sp_instant: 'Instantanée',
    set_lang: 'Langue', set_sound: 'Son', set_volume: 'Volume', set_fx: 'Effets visuels', fx_full: 'Complets', fx_reduced: 'Réduits',
    fx_hint: 'Moins de tremblements, de flashs et de particules',
    no_banner: 'Pas encore de bannière (bientôt en boutique)', showcase_click: 'clique sur une case pour choisir un jeton', private_zone: 'Ton compte', private_hint: 'visible seulement par toi', pv_login: 'Connexion', pv_email: 'Mail', open: 'Ouvrir', pick_title: 'Vitrine · case {n}', pick_remove: 'Vider cette case', none: 'Aucune', no_banner_owned: 'Tu n’as pas encore de bannière. Elles arriveront bientôt en boutique.', pp_soon: 'Les photos de profil arrivent bientôt.',
    nav_inv: 'Inventaire', nav_shop: 'Boutique', inv_title: 'Tes jetons', inv_select: 'Sélectionner', inv_done: 'Terminé', all: 'Tous', r_common: 'Commun', r_rare: 'Rare', r_epic: 'Épique', r_legend: 'Légendaire', r_myth: 'Mythique', search: 'Chercher…', sort_rarity: 'Rareté', sort_count: 'Quantité', sort_recent: 'Récents', sort_name: 'Nom', sel_dupes: 'Doublons', sel_common: 'Communs', sel_all: 'Tout', sel_none: 'Rien', sell: 'Vendre', sel_n: '{n} sélectionné(s)', inv_count: '{n} jetons · {k} différents', inv_value: 'valeur', inv_empty: 'Aucun jeton pour l’instant. Ouvre des pulls !', inv_locked: 'Ce jeton est verrouillé', inv_have: 'Tu en as {n}', sell_one: 'Vendre 1', sell_dupes: 'Vendre les doublons ({n})', lock: 'Verrouiller', unlock: 'Déverrouiller', set_pp: 'Mettre en photo', to_showcase: 'Mettre en vitrine', unlocked: 'Déverrouillé', locked_ok: 'Verrouillé : il ne sera pas vendu', pp_done: 'Photo de profil changée', sell_rare_confirm: 'Tu vas vendre {n} jetons dont des rares (1/1000+) pour {v} pièces. Sûr ?', sold: '{n} jeton(s) vendu(s)', power: 'Puissance', sell_value: 'Revente', shop_title: 'Boutique', shop_reset: 'Nouveau stock dans', owned: 'Déjà à toi', left_today: '{n} restant(s) aujourd’hui', sold_out: 'Épuisé', buy: 'Acheter', bought: '{n} acheté !', it_potion: 'Potion de chance ×{m}', it_potion_d: 'Ta chance est multipliée par {m} sur tes {n} prochains pulls.', it_instant: 'Recharge éclair', it_instant_d: '+1 pull tout de suite (si ton stock n’est pas plein).', it_hourglass: 'Sablier', it_hourglass_d: 'Tes pulls se rechargent 2× plus vite pendant {n} min.', it_banner: 'Bannière « {n} »', it_banner_d: 'Une nouvelle bannière pour ton profil, à vie.', fx_luck: 'Chance ×{m} · {n} pull(s)', fx_fast: 'Recharge ×2 · {t}', bn_nuit: 'Nuit', in_showcase: 'En vitrine (protégé de la vente)', shown_n: '{n} en vitrine, protégé(s) de la vente', cat_potions: 'Potions de chance', cat_utils: 'Objets utiles', cat_cosm: 'Cosmétiques', stock_n: 'Stock : {n}', back_in: 'Refresh dans', unlocked_b: 'Débloquée', in_stock: '{n}/{m} en stock', odds_info: 'Probas & infos', fx_total: 'Chance totale ×{m}', items: 'Objets', use: 'Utiliser', item_used: 'Objet utilisé !', no_item: 'Tu n’as plus cet objet', bn_plaine: 'Plaine', bn_doodle: 'Doodle', bn_aurore: 'Aurore', bn_ocean: 'Océan', bn_braise: 'Braise', bn_foret: 'Forêt', bn_neon: 'Néon', bn_or: 'Or', bn_cosmos: 'Cosmos', err_coins: 'Pas assez de pièces', err_limit: 'Limite du jour atteinte', err_potion: 'Une autre potion est déjà active', err_stock_full: 'Ton stock est déjà plein', err_owned: 'Tu l’as déjà', err_shop: 'Cet objet n’est plus en boutique', already_showcase: 'Déjà en vitrine', showcase_full: 'Vitrine pleine (5 max)', showcase_added: 'Ajouté à ta vitrine', showcase_hint: 'Ouvre un jeton puis « Mettre en vitrine »', profile_404: 'Joueur introuvable', bio_empty_me: 'Ajoute une bio dans « Modifier le profil »', edit_profile: 'Modifier le profil', st_pulls: 'tirages', st_best: 'meilleur jeton', st_collec: 'collection', st_owned: 'jetons possédés', showcase: 'Vitrine', joined: 'Joueur depuis le {d}', pe_banner: 'Bannière', pe_pp: 'Photo de profil', pe_bio: 'Bio', save: 'Enregistrer', cancel: 'Annuler', banner_locked: 'Bannière à débloquer en boutique', profile_saved: 'Profil enregistré', my_profile: 'Mon profil', close: 'Fermer', mute: 'Couper le son', unmute: 'Activer le son',
    login: 'Connexion', signup: 'Créer un compte', logout: 'Se déconnecter', acc_email: 'Adresse mail', acc_password: 'Mot de passe', acc_pseudo: 'Pseudo',
    acc_pseudo_hint: '3 à 16 caractères : lettres, chiffres, _ - .', acc_forgot: 'Mot de passe oublié ?', acc_no_account: 'Pas de compte ? Inscris-toi',
    acc_have_account: 'Déjà un compte ? Connecte-toi', acc_check_mail: 'Vérifie tes mails', acc_code_sent: 'Code envoyé à {e}. Entre-le ci-dessous (pense aux spams).', acc_link_sent: 'Un lien de confirmation a été envoyé à {e}. Clique dessus pour activer ton compte (pense aux spams), tu reviendras ici connecté.', acc_link_reset: 'Un lien a été envoyé à {e}. Clique dessus pour choisir un nouveau mot de passe.', acc_go_login: 'C’est fait, me connecter', acc_need: 'Connecte-toi pour ouvrir des pulls.', acc_oauth_p: 'Connecte-toi en un clic, sans mot de passe à retenir.', acc_with: 'Continuer avec {p}', acc_choose_pseudo: 'Choisis ton pseudo', acc_choose_pseudo_p: 'C’est le nom que les autres joueurs verront dans le classement et le live. Tu pourras le changer une fois par mois.', acc_login_to_open: 'Se connecter pour ouvrir', acc_send_link: 'Recevoir le lien', acc_set_pass: 'Choisis ton nouveau mot de passe',
    acc_code: 'Code reçu par mail', acc_confirm: 'Valider', acc_resend: 'Renvoyer le code', acc_resent: 'Nouveau code envoyé',
    acc_forgot_p: 'Entre ton adresse : tu recevras un lien pour choisir un nouveau mot de passe.', acc_send_code: 'Recevoir un code', acc_new_pass: 'Nouveau mot de passe',
    acc_my_account: 'Mon compte', acc_me_p: 'Tes tirages sont enregistrés en ligne : historique, En direct et classement.',
    err_credentials: 'Mail ou mot de passe incorrect', err_not_confirmed: 'Compte pas encore confirmé : un nouveau code vient d’être envoyé.',
    err_email_used: 'Cette adresse a déjà un compte', err_weak_pass: 'Mot de passe trop court (6 caractères minimum)', err_code: 'Code incorrect ou expiré',
    err_rate: 'Trop d’essais, réessaie dans quelques minutes', err_email: 'Adresse mail invalide', err_generic: 'Une erreur est survenue, réessaie',
    err_pseudo: 'Pseudo invalide (3 à 16 caractères : lettres, chiffres, _ - .)', err_pseudo_taken: 'Ce pseudo est déjà pris',
    pseudo_free: '1 changement gratuit dispo', pseudo_month: '1 changement tous les 30 jours', pseudo_next: 'prochain changement possible le {d}', pseudo_confirm: 'Changer ton pseudo en « {n} » ? Tu ne pourras plus le changer pendant 30 jours.', err_pseudo_cd: 'Tu as déjà changé de pseudo ce mois-ci', pseudo_confirm_free: 'Changer ton pseudo en « {n} » ? (ton changement gratuit)',
    price_down: 'Prix en baisse !', price_up: 'Un prix a changé', nav_friends: 'Amis', ann_title: 'Annonce', ann_ok: 'Compris !', ann_missed: 'Tu as raté {n} autre(s) annonce(s) :', ann_hist: 'Annonces', ann_none: 'Aucune annonce pour l’instant', new: 'nouveau',
    fr_title: 'Tes amis', fr_add_ph: 'Pseudo de ton ami…', fr_add: 'Ajouter en ami', fr_requests: 'Demandes reçues', fr_list: 'Amis', fr_pending: 'Demandes envoyées',
    fr_accept: 'Accepter', fr_chat: 'Discuter', fr_remove: 'Retirer des amis', fr_remove_q: 'Retirer {n} de tes amis ?', fr_empty: 'Pas encore d’amis. Ajoute quelqu’un avec son pseudo !',
    fr_wants: 'veut être ton ami', fr_sent: 'Demande envoyée', fr_last: 'dernier message : {d}', fr_no_msg: 'aucun message', fr_chats: 'Messages', fr_write: 'Écrire à {n}…',
    fr_first: 'Dis bonjour 👋', fr_res_sent: 'Demande envoyée à {n}', fr_res_accepted: 'Toi et {n} êtes maintenant amis !', fr_res_pending: 'Demande déjà envoyée à {n}', fr_res_already: '{n} est déjà ton ami',
    fr_now: 'Toi et {n} êtes maintenant amis !', fr_got: '{n} veut être ton ami', send: 'Envoyer', back: 'Retour',
    err_banned: 'Ton compte est suspendu', err_not_friends: 'Vous n’êtes pas amis', err_slow: 'Doucement ! Attends un peu avant de réécrire', err_unknown: 'Aucun joueur avec ce pseudo', err_self: 'C’est toi 😄',
    banned_bar: 'Ton compte est suspendu par un admin : tu ne peux plus ouvrir, acheter, vendre ni écrire.',
    u_pulls: '{n} pulls', u_tokens: '{n} jetons', u_collec: '{n} / {t} jetons', you_tag: 'toi',
  },
  en: {
    nav_home: 'Home', nav_board: 'Leaderboard', pulls: 'Pulls', history: 'My history', see_all: 'See all',
    live: 'Live', live_empty: 'Players’ pulls will show up here', board_tag: 'Leaderboard', board_title: 'Top players',
    week: 'This week', all_time: 'All time', board_empty: 'No ranked players yet. Log in and open a pull to get in!',
    hist_empty: 'No pulls yet', ago: '{n} ago', just_now: 'just now', you: 'You', got: 'got',
    grp_perm: 'Permanent', grp_lim: 'Limited', grp_we: 'Weekend', free: 'Free · recharges', limited: 'Limited', permanent: 'Permanent', sat_sun: 'Sat–Sun',
    ends_in: 'Ends in', weekend_only: 'Only available on Saturday and Sunday', always: 'Always available', pull: 'Pull',
    k_pulls: 'Pulls opened', k_gain: 'Best pull', k_tokens: 'Total tokens', k_collec: 'Collection',
    stock_full: 'stock full', plus1_in: '+1 in {t}', pulls_word: 'pulls', open1: 'Open 1', open_all: 'Open all ({n})',
    stock_max: 'Max stock {a} → {b}', stock_top: 'Max stock reached (10)', open_again: 'Open again · {n} left', no_pull: 'No pulls left · +1 in {t}',
    click_coin: 'Click the token', click_reveal: 'Click to reveal', next: 'Next · {a}/{b}', see_recap: 'See recap', back: 'Back',
    series: 'Takoras series', stats_note: 'Temporary stats · battles coming soon', s_hp: 'HP', s_atk: 'Attack', s_def: 'Defense', s_spd: 'Speed',
    recap_tag: 'Recap · {n} pulls', recap_title: 'Your {n} tokens', best: 'Best pull',
    settings: 'Settings', set_speed: 'Opening speed', sp_normal: 'Normal', sp_fast: 'Fast', sp_instant: 'Instant',
    set_lang: 'Language', set_sound: 'Sound', set_volume: 'Volume', set_fx: 'Visual effects', fx_full: 'Full', fx_reduced: 'Reduced',
    fx_hint: 'Less shaking, flashes and particles',
    no_banner: 'No banner yet (coming soon to the shop)', showcase_click: 'click a slot to pick a token', private_zone: 'Your account', private_hint: 'only visible to you', pv_login: 'Login', pv_email: 'Email', open: 'Open', pick_title: 'Showcase · slot {n}', pick_remove: 'Empty this slot', none: 'None', no_banner_owned: 'You don’t have a banner yet. They’ll be in the shop soon.', pp_soon: 'Profile pictures are coming soon.',
    nav_inv: 'Inventory', nav_shop: 'Shop', inv_title: 'Your tokens', inv_select: 'Select', inv_done: 'Done', all: 'All', r_common: 'Common', r_rare: 'Rare', r_epic: 'Epic', r_legend: 'Legendary', r_myth: 'Mythic', search: 'Search…', sort_rarity: 'Rarity', sort_count: 'Amount', sort_recent: 'Recent', sort_name: 'Name', sel_dupes: 'Duplicates', sel_common: 'Commons', sel_all: 'All', sel_none: 'None', sell: 'Sell', sel_n: '{n} selected', inv_count: '{n} tokens · {k} unique', inv_value: 'value', inv_empty: 'No tokens yet. Open some pulls!', inv_locked: 'This token is locked', inv_have: 'You have {n}', sell_one: 'Sell 1', sell_dupes: 'Sell duplicates ({n})', lock: 'Lock', unlock: 'Unlock', set_pp: 'Set as picture', to_showcase: 'Add to showcase', unlocked: 'Unlocked', locked_ok: 'Locked: it won’t be sold', pp_done: 'Profile picture changed', sell_rare_confirm: 'You are about to sell {n} tokens including rare ones (1/1000+) for {v} coins. Sure?', sold: '{n} token(s) sold', power: 'Power', sell_value: 'Sell value', shop_title: 'Shop', shop_reset: 'New stock in', owned: 'Already yours', left_today: '{n} left today', sold_out: 'Sold out', buy: 'Buy', bought: '{n} bought!', it_potion: 'Luck potion ×{m}', it_potion_d: 'Your luck is multiplied by {m} for your next {n} pulls.', it_instant: 'Instant refill', it_instant_d: '+1 pull right now (if your stock isn’t full).', it_hourglass: 'Hourglass', it_hourglass_d: 'Your pulls recharge 2× faster for {n} min.', it_banner: '“{n}” banner', it_banner_d: 'A new banner for your profile, forever.', fx_luck: 'Luck ×{m} · {n} pull(s)', fx_fast: 'Recharge ×2 · {t}', bn_nuit: 'Night', in_showcase: 'In showcase (protected from selling)', shown_n: '{n} in showcase, protected from selling', cat_potions: 'Luck potions', cat_utils: 'Useful items', cat_cosm: 'Cosmetics', stock_n: 'Stock: {n}', back_in: 'Refresh in', unlocked_b: 'Unlocked', in_stock: '{n}/{m} in stock', odds_info: 'Odds & info', fx_total: 'Total luck ×{m}', items: 'Items', use: 'Use', item_used: 'Item used!', no_item: 'You don’t have this item anymore', bn_plaine: 'Plains', bn_doodle: 'Doodle', bn_aurore: 'Dawn', bn_ocean: 'Ocean', bn_braise: 'Ember', bn_foret: 'Forest', bn_neon: 'Neon', bn_or: 'Gold', bn_cosmos: 'Cosmos', err_coins: 'Not enough coins', err_limit: 'Daily limit reached', err_potion: 'Another potion is already active', err_stock_full: 'Your stock is already full', err_owned: 'You already have it', err_shop: 'This item left the shop', already_showcase: 'Already in showcase', showcase_full: 'Showcase full (5 max)', showcase_added: 'Added to your showcase', showcase_hint: 'Open a token then “Add to showcase”', profile_404: 'Player not found', bio_empty_me: 'Add a bio in “Edit profile”', edit_profile: 'Edit profile', st_pulls: 'pulls', st_best: 'best token', st_collec: 'collection', st_owned: 'tokens owned', showcase: 'Showcase', joined: 'Player since {d}', pe_banner: 'Banner', pe_pp: 'Profile picture', pe_bio: 'Bio', save: 'Save', cancel: 'Cancel', banner_locked: 'Unlock this banner in the shop', profile_saved: 'Profile saved', my_profile: 'My profile', close: 'Close', mute: 'Mute', unmute: 'Unmute',
    login: 'Log in', signup: 'Sign up', logout: 'Log out', acc_email: 'Email', acc_password: 'Password', acc_pseudo: 'Username',
    acc_pseudo_hint: '3 to 16 characters: letters, digits, _ - .', acc_forgot: 'Forgot password?', acc_no_account: 'No account? Sign up',
    acc_have_account: 'Already have an account? Log in', acc_check_mail: 'Check your email', acc_code_sent: 'Code sent to {e}. Enter it below (check spam).', acc_link_sent: 'A confirmation link was sent to {e}. Click it to activate your account (check spam), you’ll come back here logged in.', acc_link_reset: 'A link was sent to {e}. Click it to choose a new password.', acc_go_login: 'Done, log me in', acc_need: 'Log in to open pulls.', acc_oauth_p: 'Log in with one click, no password to remember.', acc_with: 'Continue with {p}', acc_choose_pseudo: 'Pick your username', acc_choose_pseudo_p: 'This is the name other players will see on the leaderboard and live feed. You can change it once a month.', acc_login_to_open: 'Log in to open', acc_send_link: 'Get the link', acc_set_pass: 'Choose your new password',
    acc_code: 'Code from the email', acc_confirm: 'Confirm', acc_resend: 'Resend code', acc_resent: 'New code sent',
    acc_forgot_p: 'Enter your email: you’ll get a link to choose a new password.', acc_send_code: 'Get a code', acc_new_pass: 'New password',
    acc_my_account: 'My account', acc_me_p: 'Your pulls are saved online: history, Live and leaderboard.',
    err_credentials: 'Wrong email or password', err_not_confirmed: 'Account not confirmed yet: a new code was just sent.',
    err_email_used: 'This email already has an account', err_weak_pass: 'Password too short (6 characters minimum)', err_code: 'Wrong or expired code',
    err_rate: 'Too many attempts, try again in a few minutes', err_email: 'Invalid email address', err_generic: 'Something went wrong, try again',
    err_pseudo: 'Invalid username (3 to 16 characters: letters, digits, _ - .)', err_pseudo_taken: 'This username is taken',
    pseudo_free: '1 free change available', pseudo_month: '1 change every 30 days', pseudo_next: 'next change possible on {d}', pseudo_confirm: 'Change your username to “{n}”? You won’t be able to change it again for 30 days.', err_pseudo_cd: 'You already changed your username this month', pseudo_confirm_free: 'Change your username to “{n}”? (your free change)',
    price_down: 'Price drop!', price_up: 'A price changed', nav_friends: 'Friends', ann_title: 'Announcement', ann_ok: 'Got it!', ann_missed: 'You missed {n} other announcement(s):', ann_hist: 'Announcements', ann_none: 'No announcements yet', new: 'new',
    fr_title: 'Your friends', fr_add_ph: 'Your friend’s username…', fr_add: 'Add friend', fr_requests: 'Requests received', fr_list: 'Friends', fr_pending: 'Requests sent',
    fr_accept: 'Accept', fr_chat: 'Chat', fr_remove: 'Remove friend', fr_remove_q: 'Remove {n} from your friends?', fr_empty: 'No friends yet. Add someone with their username!',
    fr_wants: 'wants to be your friend', fr_sent: 'Request sent', fr_last: 'last message: {d}', fr_no_msg: 'no messages', fr_chats: 'Messages', fr_write: 'Message {n}…',
    fr_first: 'Say hi 👋', fr_res_sent: 'Request sent to {n}', fr_res_accepted: 'You and {n} are now friends!', fr_res_pending: 'Request already sent to {n}', fr_res_already: '{n} is already your friend',
    fr_now: 'You and {n} are now friends!', fr_got: '{n} wants to be your friend', send: 'Send', back: 'Back',
    err_banned: 'Your account is suspended', err_not_friends: 'You are not friends', err_slow: 'Slow down! Wait a bit before writing again', err_unknown: 'No player with that username', err_self: 'That’s you 😄',
    banned_bar: 'Your account was suspended by an admin: you can’t open, buy, sell or write anymore.',
    u_pulls: '{n} pulls', u_tokens: '{n} tokens', u_collec: '{n} / {t} tokens', you_tag: 'you',
  },
};
// Étincelles en pixel art, dessinées ici même : X = couleur, o = blanc (petit reflet). Chaque forme est
// rendue une fois par couleur sur un mini-canvas, puis affichée agrandie sans lissage.
const SPARK_SHAPES = [
  ['...X...', '...X...', '..XoX..', 'XXXoXXX', '..XoX..', '...X...', '...X...'], // étoile à 4 branches
  ['..X..', '.XoX.', 'XoooX', '.XoX.', '..X..'],                                     // losange
  ['.X.', 'XoX', '.X.'],                                                             // petite croix
  ['X...X', '.X.X.', '..o..', '.X.X.', 'X...X'],                                     // éclat en X
];
const sparkCache = {};
function sparkURL(color, k) {
  const key = color + k;
  if (sparkCache[key]) return sparkCache[key];
  const rows = SPARK_SHAPES[k], c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const x = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, i) => { if (ch === '.') return; x.fillStyle = ch === 'o' ? '#fff' : color; x.fillRect(i, y, 1, 1); }));
  return (sparkCache[key] = c.toDataURL());
}
// Style d'une étincelle : forme au hasard, taille = nb de pixels × taille d'un pixel
function sparkStyle(color, px = 2 + Math.floor(Math.random() * 2)) {
  const k = Math.floor(Math.random() * SPARK_SHAPES.length), n = SPARK_SHAPES[k][0].length * px;
  return `width:${n}px;height:${n}px;background:url(${sparkURL(color, k)}) center / 100% 100% no-repeat;image-rendering:pixelated`;
}

// Nom affiché d'un jeton (les noms de la base restent en français, on ne traduit que l'affichage)
const JETON_EN = { 'Givre': 'Frost', 'Rouillé': 'Rusty', 'Carmin': 'Crimson', 'Zénith': 'Zenith' };
const jn = name => (SETTINGS.lang === 'en' && JETON_EN[name]) || name;
// Pareil en HTML : le jeton ultime « Takoras » (1/1 000 000) a sa police angélique qui « glitche » doucement
const jnH = name => name === 'Takoras' ? '<span class="goth">Takoras</span>' : String(jn(name)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function t(key, vars = {}) {
  let s = (I18N[SETTINGS.lang] || I18N.fr)[key] ?? I18N.fr[key] ?? key;
  for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
document.documentElement.lang = SETTINGS.lang;

// Textes fixes de la page : <x data-i18n="clé">
function applyI18n() { document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); }); }
applyI18n();

// Fenêtre des paramètres
(function () {
  const panel = document.getElementById('settings');
  const seg = (key, opts) => `<div class="seg set-seg" data-key="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${SETTINGS[key] === v ? 'on' : ''}">${t(l)}</button>`).join('')}</div>`;
  function render() {
    panel.querySelector('.set-body').innerHTML = `
      <div class="set-row"><b>${t('set_speed')}</b>${seg('speed', [['normal', 'sp_normal'], ['rapide', 'sp_fast'], ['instant', 'sp_instant']])}</div>
      <div class="set-row"><b>${t('set_lang')}</b>${seg('lang', [['fr', 'Français'], ['en', 'English']])}</div>
      <div class="set-row"><b>${t('set_volume')}</b><input type="range" id="set-volume" min="0" max="100" step="1" value="${SETTINGS.volume}"><span class="muted" id="set-vol-val">${SETTINGS.volume} %</span></div>
      <div class="set-row"><b>${t('set_fx')}</b>${seg('fx', [['full', 'fx_full'], ['reduced', 'fx_reduced']])}<small class="muted">${t('fx_hint')}</small></div>`;
    panel.querySelector('.set-title').textContent = t('settings');
  }
  panel.addEventListener('click', e => {
    if (e.target === panel || e.target.closest('.set-close')) return panel.classList.remove('on');
    const b = e.target.closest('.set-seg button'); if (!b) return;
    const key = b.closest('.set-seg').dataset.key;
    SETTINGS[key] = b.dataset.v;
    saveSettings();
    if (key === 'lang') return location.reload(); // tout le site se retraduit
    if (key === 'fx') document.documentElement.classList.toggle('reduce-fx', reducedFx());
    render();
  });
  panel.addEventListener('input', e => {
    if (e.target.id !== 'set-volume') return;
    SETTINGS.volume = +e.target.value;
    panel.querySelector('#set-vol-val').textContent = SETTINGS.volume + ' %';
    saveSettings();
    if (typeof sfx !== 'undefined') sfx.setVolume(SETTINGS.volume / 100);
  });
  document.getElementById('open-settings').addEventListener('click', () => { render(); panel.classList.add('on'); });
  addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('on'); });
  document.documentElement.classList.toggle('reduce-fx', reducedFx());
})();
