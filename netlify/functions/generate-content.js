exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  try {
    const { prompt } = JSON.parse(event.body);
    console.log('Prompt received, length:', prompt?.length);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 800,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const responseText = await response.text();
    console.log('Gemini status:', response.status);
    console.log('Gemini response length:', responseText.length);
    console.log('Gemini response:', responseText.substring(0, 500));

    if (!responseText || responseText.trim() === '') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{ text: '{"title":"Contenu temporairement indisponible","content":"Veuillez régénérer le contenu."}' }]
            }
          }]
        })
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch(e) {
      console.log('Parse error:', e.message);
      data = {
        candidates: [{
          content: {
            parts: [{ text: '{"title":"Erreur de génération","content":"Cliquez sur Régénérer pour réessayer."}' }]
          }
        }]
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.log('Function error:', error.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: '{"title":"Erreur de connexion","content":"Vérifiez votre connexion et cliquez sur Régénérer."}' }]
          }
        }]
      })
    };
  }
};
