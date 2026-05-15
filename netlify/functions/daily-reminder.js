// Netlify Function: daily-reminder.js
// À appeler via un cron job Netlify à 18h00 chaque jour
// Dans netlify.toml : [functions."daily-reminder"] schedule = "0 17 * * *" (17h UTC = 18h WAT)

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = 'yomuna237@gmail.com';

async function supabaseQuery(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  });
  return res.json();
}

async function sendEmail(to, name, subject, html) {
  return fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'YoMuna', email: ADMIN_EMAIL },
      to: [{ email: to, name: name }],
      subject,
      htmlContent: html
    })
  });
}

exports.handler = async (event) => {
  try {
    // Récupérer tous les abonnés actifs avec leurs enfants
    const subs = await supabaseQuery('subscriptions', 'select=*&status=neq.expired');
    const activeSubs = (subs || []).filter(s => {
      const start = new Date(s.created_at);
      const days = s.plan === 'ann' ? 365 : 30;
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      return new Date() < end;
    });

    const activeUserIds = activeSubs.map(s => s.user_id);
    if (activeUserIds.length === 0) {
      return { statusCode: 200, body: 'Aucun abonné actif' };
    }

    const profiles = await supabaseQuery('profiles', 'select=*');
    const children = await supabaseQuery('children', 'select=*');

    let sent = 0;
    let errors = 0;

    for (const userId of activeUserIds) {
      const profile = (profiles || []).find(p => p.id === userId);
      if (!profile || !profile.email) continue;

      const userChildren = (children || []).filter(c => c.user_id === userId);
      const childNames = userChildren.map(c => c.name).join(', ');
      const firstName = profile.first_name || 'Cher parent';

      const childSection = userChildren.length > 0
        ? `<div style="background:#FFF8F0;border-radius:12px;padding:1rem;margin:1.25rem 0;border-left:4px solid #FFD166;">
            <p style="margin:0;font-weight:700;color:#2D1B00;">Ce soir pour <strong>${childNames}</strong> :</p>
            <p style="margin:0.5rem 0 0;color:#6B4226;font-size:0.9rem;">📖 Une histoire inédite avec ${userChildren.length > 1 ? 'leurs prénoms' : 'son prénom'}<br>🎮 Une activité créative adaptée<br>💡 Un conseil parental du soir</p>
           </div>`
        : '';

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#FFF8F0;">
          <div style="background:#2D1B00;padding:1.25rem 2rem;border-radius:12px 12px 0 0;">
            <span style="font-size:1.6rem;font-weight:900;color:#FF8C69;">Yo</span>
            <span style="font-size:1.6rem;font-weight:900;color:#FFD166;">●</span>
            <span style="font-size:1.6rem;font-weight:900;color:white;">Muna</span>
          </div>
          <div style="padding:2rem;background:white;border-radius:0 0 12px 12px;border:1px solid #F0DCCC;">
            <h2 style="color:#2D1B00;font-size:1.4rem;margin-bottom:0.5rem;">🌙 Bonsoir ${firstName} !</h2>
            <p style="color:#6B4226;line-height:1.7;">L'histoire du soir de ${childNames || 'vos enfants'} est prête. Prenez un moment magique ensemble ce soir ✨</p>
            ${childSection}
            <div style="text-align:center;margin:1.75rem 0;">
              <a href="https://yo-muna.com" style="display:inline-block;background:#FF8C69;color:white;padding:0.95rem 2.5rem;border-radius:50px;text-decoration:none;font-weight:800;font-size:1rem;box-shadow:0 4px 15px rgba(255,140,105,0.4);">
                🌙 Voir l'histoire du soir →
              </a>
            </div>
            <p style="color:#A0714F;font-size:0.82rem;text-align:center;margin-top:1.5rem;">YoMuna · yo-muna.com · Pour se désabonner : yomuna237@gmail.com</p>
          </div>
        </div>`;

      try {
        await sendEmail(profile.email, firstName, `🌙 ${firstName}, l'histoire du soir est prête !`, html);
        sent++;
      } catch(e) {
        errors++;
      }

      // Pause pour éviter de dépasser les limites Brevo
      await new Promise(r => setTimeout(r, 200));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sent, errors, total: activeUserIds.length })
    };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
