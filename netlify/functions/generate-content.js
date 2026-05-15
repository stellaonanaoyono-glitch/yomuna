exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Rotation automatique des clés Groq
  const keys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY, // clé principale en dernier recours
  ].filter(Boolean);

  if (keys.length === 0) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', error: 'Aucune clé GROQ configurée dans Netlify' })
    };
  }

  try {
    const { prompt, type } = JSON.parse(event.body);
    const model = 'llama-3.3-70b-versatile';
    const maxTokens = (type === 'story') ? 2000 : 1000;

    // Essayer chaque clé jusqu'à ce qu'une fonctionne
    let lastError = '';
    for (const apiKey of keys) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'Tu es un assistant parental expert. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après.'
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: maxTokens
          })
        });

        const data = await response.json();

        // Si rate limit — essayer la clé suivante
        if (data.error && data.error.code === 'rate_limit_exceeded') {
          lastError = data.error.message;
          console.log('Rate limit sur cette clé, essai suivant...');
          continue;
        }

        if (data.error) {
          lastError = data.error.message;
          continue;
        }

        const text = data.choices?.[0]?.message?.content || '';
        if (!text) {
          lastError = 'Réponse vide';
          continue;
        }

        console.log('Groq OK, length:', text.length);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        };

      } catch (e) {
        lastError = e.message;
        continue;
      }
    }

    // Toutes les clés épuisées
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', error: `Toutes les clés sont à la limite. Réessaie dans quelques heures. (${lastError})` })
    };

  } catch (error) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', error: error.message })
    };
  }
};
