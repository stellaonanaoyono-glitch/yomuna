// netlify/functions/stripe-verify.js
// Vérifie la session Stripe et crée l'abonnement + enfants dans Supabase

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Clé service role Supabase
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const PLAN_AMOUNTS = { solo: 2500, fam: 4000, ann: 20000 };
const PLAN_NAMES = { solo: 'Plan Solo', fam: 'Plan Famille', ann: 'Plan Annuel' };

async function supabaseInsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  return r.status;
}

async function supabaseSelect(table, query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  return r.json();
}

async function sendConfirmationEmail(email, firstName, plan, amount) {
  if (!BREVO_API_KEY) return;
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'YoMuna', email: 'yomuna237@gmail.com' },
      to: [{ email, name: firstName }],
      subject: `🎉 Paiement confirmé — Bienvenue sur YoMuna, ${firstName} !`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FFF8F0;padding:2rem;border-radius:16px;">
          <h1 style="color:#E06840;">Yo<span style="color:#FFD166">●</span>Muna</h1>
          <h2 style="color:#2D1B00;">Paiement confirmé ! 🎉</h2>
          <p style="color:#6B4226;line-height:1.7;">Bonjour ${firstName},<br>Votre abonnement YoMuna est maintenant actif. La magie peut commencer !</p>
          <div style="background:white;border-radius:12px;padding:1.5rem;margin:1.5rem 0;border-left:4px solid #FF8C69;">
            <p style="color:#6B4226;margin:0.3rem 0;">📦 <strong>${PLAN_NAMES[plan] || plan}</strong></p>
            <p style="color:#6B4226;margin:0.3rem 0;">💰 <strong>${amount} FCFA</strong></p>
            <p style="color:#6B4226;margin:0.3rem 0;">✅ <strong>Statut : Actif</strong></p>
            <p style="color:#6B4226;margin:0.3rem 0;">📅 <strong>Durée : ${plan === 'ann' ? '12 mois' : '30 jours'}</strong></p>
          </div>
          <div style="background:#F5F0EB;border-radius:12px;padding:1rem;margin-bottom:1.5rem;font-size:0.82rem;color:#6B4226;">
            ✅ En finalisant votre abonnement, vous avez accepté les CGU de YoMuna — AELI SERVICES SARL (RC/YAE/2020/A/2762), Yaoundé, Cameroun.
          </div>
          <a href="https://yo-muna.com" style="display:inline-block;background:#FF8C69;color:white;padding:1rem 2rem;border-radius:50px;text-decoration:none;font-weight:bold;">
            Accéder à mon espace YoMuna →
          </a>
          <p style="color:#A0714F;font-size:0.85rem;margin-top:1.5rem;">Questions ? yomuna237@gmail.com | +237 6 72 90 81 37</p>
          <p style="color:#A0714F;font-size:0.75rem;">© 2026 YoMuna — AELI SERVICES SARL • Yaoundé, Cameroun</p>
        </div>`
    })
  }).catch(e => console.error('Email error:', e));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { sessionId } = JSON.parse(event.body);
    if (!sessionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'sessionId requis' }) };
    }

    // 1 — Vérifier la session Stripe
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
    });
    const session = await stripeRes.json();

    if (session.error) {
      return { statusCode: 200, body: JSON.stringify({ error: session.error.message }) };
    }

    if (session.payment_status !== 'paid') {
      return { statusCode: 200, body: JSON.stringify({ error: 'Paiement non confirmé', status: session.payment_status }) };
    }

    // 2 — Récupérer les metadata
    const plan = session.metadata?.plan || 'solo';
    const userId = session.metadata?.userId;
    const childrenStr = session.metadata?.children || '[]';
    const customerEmail = session.customer_email || session.customer_details?.email || '';
    const amount = PLAN_AMOUNTS[plan] || 2500;

    if (!userId) {
      return { statusCode: 200, body: JSON.stringify({ error: 'userId manquant dans metadata' }) };
    }

    // 3 — Vérifier si l'abonnement existe déjà (éviter les doublons)
    const existingSubs = await supabaseSelect('subscriptions',
      `user_id=eq.${userId}&notchpay_ref=eq.stripe_${sessionId}`
    );
    if (Array.isArray(existingSubs) && existingSubs.length > 0) {
      return { statusCode: 200, body: JSON.stringify({ success: true, already_exists: true }) };
    }

    // 4 — Créer l'abonnement dans Supabase
    await supabaseInsert('subscriptions', {
      user_id: userId,
      plan,
      amount,
      status: 'active',
      notchpay_ref: `stripe_${sessionId}`
    });

    // 5 — Insérer les enfants
    let children = [];
    try { children = JSON.parse(childrenStr); } catch(e) {}
    for (const child of children) {
      if (!child.name) continue;
      const existing = await supabaseSelect('children',
        `user_id=eq.${userId}&name=eq.${encodeURIComponent(child.name)}`
      );
      if (!Array.isArray(existing) || existing.length === 0) {
        await supabaseInsert('children', { ...child, user_id: userId });
      }
    }

    // 6 — Récupérer le prénom depuis profiles
    let firstName = 'Cher parent';
    try {
      const profiles = await supabaseSelect('profiles', `id=eq.${userId}`);
      if (Array.isArray(profiles) && profiles[0]?.first_name) {
        firstName = profiles[0].first_name;
      }
    } catch(e) {}

    // 7 — Envoyer l'email de confirmation
    if (customerEmail) {
      await sendConfirmationEmail(customerEmail, firstName, plan, amount);
    }

    // 8 — Notifier l'admin
    if (BREVO_API_KEY) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'YoMuna System', email: 'yomuna237@gmail.com' },
          to: [{ email: 'yomuna237@gmail.com' }],
          subject: `💳 Nouveau paiement Stripe — ${firstName} — ${PLAN_NAMES[plan]}`,
          htmlContent: `<p>Nouveau paiement Stripe confirmé :<br>
            Email : ${customerEmail}<br>
            Plan : ${PLAN_NAMES[plan]}<br>
            Montant : ${amount} FCFA<br>
            Session : ${sessionId}<br>
            User ID : ${userId}</p>`
        })
      }).catch(() => {});
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, plan, amount, email: customerEmail })
    };

  } catch(e) {
    console.error('stripe-verify error:', e);
    return {
      statusCode: 200,
      body: JSON.stringify({ error: e.message })
    };
  }
};
