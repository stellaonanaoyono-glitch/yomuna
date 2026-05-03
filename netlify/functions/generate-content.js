exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Liste de modèles à essayer dans l'ordre
  const models = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro'
  ];

  try {
    const { prompt } = JSON.parse(event.body);
    console.log('Prompt length:', prompt?.length);

    let text = '';
    let lastError = '';

    for (const model of models) {
      try {
        console.log('Trying model:', model);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 800
              }
            })
          }
        );

        const data = await response.json();
        console.log('Model:', model, 'Status:', response.status);

        if (response.status === 200) {
          text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          console.log('Success with model:', model);
          console.log('Text:', text.substring(0, 200));
          break;
        } else {
          lastError = JSON.stringify(data.error || data);
          console.log('Error with model:', model, lastError.substring(0, 100));
        }
      } catch(e) {
        console.log('Exception with model:', model, e.message);
        lastError = e.message;
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, error: text ? null : lastError })
    };

  } catch (error) {
    console.log('Function error:', error.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', error: error.message })
    };
  }
};
