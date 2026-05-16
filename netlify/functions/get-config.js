// netlify/functions/get-config.js
// Expose les clés publiques au frontend sans les mettre dans le code source

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // Cache 1 heure
    },
    body: JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_ANON_KEY || '',
    })
  };
};
