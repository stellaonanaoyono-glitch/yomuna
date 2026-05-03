exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;

  try {
    const body = JSON.parse(event.body);
    const { amount, email, phone, description, reference, callback } = body;

    const response = await fetch('https://api.notchpay.co/payments/initialize', {
      method: 'POST',
      headers: {
        'Authorization': NOTCHPAY_PUBLIC_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        currency: 'XAF',
        amount: parseInt(amount),
        email: email,
        phone: phone,
        description: description,
        reference: reference,
        callback: callback
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
