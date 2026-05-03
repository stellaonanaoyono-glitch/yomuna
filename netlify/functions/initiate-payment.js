exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;

  try {
    const body = JSON.parse(event.body);
    console.log('Request body:', JSON.stringify(body));
    console.log('NotchPay key exists:', !!NOTCHPAY_PUBLIC_KEY);
    console.log('NotchPay key prefix:', NOTCHPAY_PUBLIC_KEY ? NOTCHPAY_PUBLIC_KEY.substring(0, 5) : 'MISSING');

    const { amount, email, phone, description, reference, callback } = body;

    const payload = {
      currency: 'XAF',
      amount: parseInt(amount),
      email: email,
      phone: phone,
      description: description,
      reference: reference,
      callback: callback
    };

    console.log('Payload to NotchPay:', JSON.stringify(payload));

    const response = await fetch('https://api.notchpay.co/payments/initialize', {
      method: 'POST',
      headers: {
        'Authorization': NOTCHPAY_PUBLIC_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('NotchPay status:', response.status);
    console.log('NotchPay response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch(e) {
      data = { error: responseText };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.log('Function error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
