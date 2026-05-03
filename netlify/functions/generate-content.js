exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  try {
    const { prompt } = JSON.parse(event.body);
    console.log('Prompt length:', prompt?.length);

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
            content: 'Tu es un assistant parental expert. Tu réponds UNIQUEMENT avec du JSON valide, sans markdown, sans explication, sans texte avant ou après le JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 800
      })
    });

    const data = await response.json();
    console.log('Groq status:', response.status);

    const text = data.choices?.[0]?.message?.content || '';
    console.log('Text extracted:', text.substring(0, 300));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    };

  } catch (error) {
    console.log('Function error:', error.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' })
    };
  }
};
