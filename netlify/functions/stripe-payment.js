// netlify/functions/stripe-payment.js
// Crée une session de paiement Stripe et retourne l'URL de checkout

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

const PRICE_IDS = {
  solo: 'price_1TXeylDHkPqETJlaTAsUVtT0',
  fam:  'price_1TXf0xDHkPqETJlalsgNP2qZ',
  ann:  'price_1TXf2VDHkPqETJlaBjYjVVuu'
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!STRIPE_SECRET_KEY) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'STRIPE_SECRET_KEY manquante dans les variables Netlify' })
    };
  }

  try {
    const { plan, email, userId, children } = JSON.parse(event.body);

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Plan invalide : ' + plan })
      };
    }

    const origin = event.headers.origin || 'https://yo-muna.com';

    // Encoder les données pour les récupérer au retour
    const metadata = {
      plan,
      userId,
      children: typeof children === 'string' ? children : JSON.stringify(children || [])
    };

    // Créer la session Stripe Checkout
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'customer_email': email,
        'success_url': `${origin}/?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${origin}/?stripe=cancel`,
        'metadata[plan]': metadata.plan,
        'metadata[userId]': metadata.userId,
        'metadata[children]': metadata.children.substring(0, 500), // Stripe limit 500 chars
        'allow_promotion_codes': 'true',
        'billing_address_collection': 'auto',
      }).toString()
    });

    const session = await response.json();

    if (session.error) {
      console.error('Stripe error:', session.error);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: session.error.message })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, sessionId: session.id })
    };

  } catch (error) {
    console.error('Stripe function error:', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
