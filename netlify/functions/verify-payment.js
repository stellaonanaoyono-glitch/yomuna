// netlify/functions/verify-payment.js
// Vérifie le statut d'un paiement NotchPay côté serveur avant d'activer l'abonnement

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { reference, plan, amount, userId, email, children: childrenStr } = JSON.parse(event.body);

    if (!reference) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Référence manquante' })
      };
    }

    // 1 — Vérifier le paiement côté NotchPay
    const verifyRes = await fetch(`https://api.notchpay.co/payments/${reference}`, {
      headers: {
        'Authorization': NOTCHPAY_PRIVATE_KEY,
        'Accept': 'application/json'
      }
    });

    const verifyData = await verifyRes.json();
    console.log('NotchPay verify response:', JSON.stringify(verifyData));

    // NotchPay retourne transaction.status = "complete" ou "failed" ou "pending"
    const txStatus = verifyData?.transaction?.status || verifyData?.status || '';

    if (txStatus !== 'complete') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified: false,
          status: txStatus,
          message: `Paiement non confirmé (statut: ${txStatus})`
        })
      };
    }

    // 2 — Paiement confirmé — vérifier si abonnement déjà créé
    const existingSubs = await supabaseSelect('subscriptions',
      `user_id=eq.${userId}&notchpay_ref=eq.${encodeURIComponent(reference)}`
    );
    if (Array.isArray(existingSubs) && existingSubs.length > 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: true, already_exists: true })
      };
    }

    // 3 — Créer l'abonnement
    await supabaseInsert('subscriptions', {
      user_id: userId,
      plan: plan || 'solo',
      amount: parseInt(amount) || 2500,
      status: 'active',
      notchpay_ref: reference
    });

    // 4 — Insérer les enfants
    let children = [];
    try { children = typeof childrenStr === 'string' ? JSON.parse(childrenStr) : (childrenStr || []); } catch(e) {}

    for (const child of children) {
      if (!child.name) continue;
      const existing = await supabaseSelect('children',
        `user_id=eq.${userId}&name=eq.${encodeURIComponent(child.name)}`
      );
      if (!Array.isArray(existing) || existing.length === 0) {
        await supabaseInsert('children', { ...child, user_id: userId });
      }
    }

    // 5 — Récupérer le prénom
    let firstName = 'Cher parent';
    try {
      const profiles = await supabaseSelect('profiles', `id=eq.${userId}`);
      if (Array.isArray(profiles) && profiles[0]?.first_name) {
        firstName = profiles[0].first_name;
      }
    } catch(e) {}

    // 6 — Email de confirmation
    if (email && BREVO_API_KEY) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'YoMuna', email: 'yomuna237@gmail.com' },
          to: [{ email, name: firstName }],
          subject: `🎉 Paiement confirmé — Bienvenue sur YoMuna, ${firstName} !`,
          htmlContent: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FFF8F0;padding:2rem;border-radius:16px;">
              <h1 style="color:#E06840;">Yo<span style="color:#FFD166">●</span>Muna</h1>
              <h2 style="color:#2D1B00;">Paiement confirmé ! 🎉</h2>
              <p style="color:#6B4226;line-height:1.7;">Bonjour ${firstName},<br>Votre abonnement YoMuna est maintenant actif.</p>
              <div style="background:white;border-radius:12px;padding:1.5rem;margin:1.5rem 0;border-left:4px solid #FF8C69;">
                <p style="color:#6B4226;margin:0.3rem 0;">📦 <strong>${PLAN_NAMES[plan] || plan}</strong></p>
                <p style="color:#6B4226;margin:0.3rem 0;">💰 <strong>${amount} FCFA</strong></p>
                <p style="color:#6B4226;margin:0.3rem 0;">✅ <strong>Statut : Actif</strong></p>
                <p style="color:#6B4226;margin:0.3rem 0;">📅 <strong>Durée : ${plan === 'ann' ? '12 mois' : '30 jours'}</strong></p>
              </div>
              <a href="https://yo-muna.com" style="display:inline-block;background:#FF8C69;color:white;padding:1rem 2rem;border-radius:50px;text-decoration:none;font-weight:bold;">
                Accéder à mon espace YoMuna →
              </a>
              <p style="color:#A0714F;font-size:0.75rem;margin-top:1.5rem;">© 2026 YoMuna — AELI SERVICES SARL • Yaoundé, Cameroun</p>
            </div>`
        })
      }).catch(e => console.error('Email error:', e));

      // Notif admin
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'YoMuna System', email: 'yomuna237@gmail.com' },
          to: [{ email: 'yomuna237@gmail.com' }],
          subject: `💳 Nouveau paiement NotchPay — ${firstName} — ${PLAN_NAMES[plan] || plan}`,
          htmlContent: `<p>Paiement NotchPay vérifié et confirmé :<br>
            Nom : ${firstName}<br>
            Email : ${email}<br>
            Plan : ${PLAN_NAMES[plan] || plan}<br>
            Montant : ${amount} FCFA<br>
            Référence : ${reference}<br>
            User ID : ${userId}</p>`
        })
      }).catch(() => {});
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: true, plan, amount, email })
    };

  } catch(e) {
    console.error('verify-payment error:', e);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
