// Ancien combat entre amis : retiré (remplacé par le Ring). Cette fonction ne fait plus rien et répond 410.
// À supprimer par le propriétaire du projet (Supabase > Edge Functions > battle).
Deno.serve(() => new Response(JSON.stringify({ error: 'gone' }), { status: 410, headers: { 'Content-Type': 'application/json' } }));
