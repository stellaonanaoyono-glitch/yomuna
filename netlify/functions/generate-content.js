exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', error: 'GROQ_API_KEY manquante dans les variables Netlify' })
    };
  }

  try {
    const { prompt, type } = JSON.parse(event.body);

    // Modèle puissant pour les histoires avec limites séparées
    const model = (type === 'story')
      ? 'mixtral-8x7b-32768'
      : 'llama-3.1-8b-instant';

    const maxTokens = (type === 'story') ? 2000 : 1200;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant parental expert. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: maxTokens
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Groq error:', data.error.message);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '', error: data.error.message })
      };
    }

    const text = data.choices?.[0]?.message?.content || '';
    console.log(`Groq OK [${model}], length:`, text.length);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    };

  } catch (error) {
    console.error('Function error:', error.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', error: error.message })
    };
  }
};
