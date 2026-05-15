exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', error: 'GROQ_API_KEY manquante dans les variables d\'environnement Netlify' })
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    const data = await response.json();

    // Log Groq errors
    if (data.error) {
      console.error('Groq API error:', JSON.stringify(data.error));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '', error: data.error.message || 'Groq API error' })
      };
    }

    const text = data.choices?.[0]?.message?.content || '';
    console.log('Groq response OK, length:', text.length, 'preview:', text.substring(0, 100));

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
