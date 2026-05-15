// Netlify Function: subscription-reminder.js
// Cron : tous les jours à 9h WAT (8h UTC)
// netlify.toml : [functions."subscription-reminder"] schedule = "0 8 * * *"

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = 'yomuna237@gmail.com';

async function supabase(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  return res.json();
}

async function sendEmail(to, name, subject, html) {
  return fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'YoMuna', email: ADMIN_EMAIL },
      to: [{ email: to, name }],
      subject,
      htmlContent: html
    })
  });
}

function emailBase(content) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#FFF8F0;border-radius:16px;overflow:hidden;">
      <div style="background:#2D1B00;padding:1.25rem 2rem;">
        <span style="font-size:1.6rem;font-weight:900;color:#FF8C69;">Yo</span>
        <span style="font-size:1.6rem;font-weight:900;color:#FFD166;">●</span>
        <span style="font-size:1.6rem;font-weight:900;color:white;">Muna</span>
      </div>
      <div style="padding:2rem;background:white;border:1px solid #F0DCCC;">
        ${content}
        <p style="color:#A0714F;font-size:0.8rem;text-align:center;margin-top:2rem;border-top:1px solid #F0DCCC;padding-top:1rem;">
          YoMuna · yo-muna.com · yomuna237@gmail.com
        </p>
      </div>
    </div>`;
}

function btnPay(text = 'Renouveler maintenant') {
  return `
    <div style="text-align:center;margin:1.5rem 0;">
      <a href="https://yo-muna.com" style="display:inline-block;background:#FF8C69;color:white;padding:0.95rem 2.5rem;border-radius:50px;text-decoration:none;font-weight:800;font-size:1rem;box-shadow:0 4px 15px rgba(255,140,105,0.4);">
        ${text} →
      </a>
    </div>`;
}

exports.handler = async () => {
  try {
    const today = new Date();
    const subs = await supabase('subscriptions', 'select=*&status=neq.expired');
    const profiles = await supabase('profiles', 'select=*');

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    let sent = 0;

    for (const sub of (subs || [])) {
      const profile = profileMap[sub.user_id];
      if (!profile?.email) continue;

      const name = profile.first_name || 'Cher parent';
      const start = new Date(sub.created_at);
      const days = sub.plan === 'ann' ? 365 : 30;
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      const planNames = { solo: 'Solo (2 500 FCFA/mois)', fam: 'Famille (4 000 FCFA/mois)', ann: 'Annuel (20 000 FCFA/an)' };
      const planName = planNames[sub.plan] || sub.plan;

      // J-7
      if (daysLeft === 7) {
        await sendEmail(profile.email, name,
          `🌙 ${name}, votre abonnement YoMuna expire dans 7 jours`,
          emailBase(`
            <h2 style="color:#2D1B00;">Bonsoir ${name} 🌙</h2>
            <p style="color:#6B4226;line-height:1.7;">Votre abonnement YoMuna <strong>${planName}</strong> expire dans <strong>7 jours</strong>, le <strong>${end.toLocaleDateString('fr-FR')}</strong>.</p>
            <p style="color:#6B4226;line-height:1.7;">Pour continuer à profiter des histoires du soir, activités et apprentissages de vos enfants, renouvelez dès maintenant.</p>
            ${btnPay('Renouveler mon abonnement')}
            <p style="color:#A0714F;font-size:0.88rem;text-align:center;">Vous avez encore 7 jours — mais mieux vaut anticiper 😊</p>
          `)
        );
        sent++;
      }

      // J-3
      else if (daysLeft === 3) {
        await sendEmail(profile.email, name,
          `⚠️ ${name}, plus que 3 jours sur YoMuna`,
          emailBase(`
            <h2 style="color:#E06840;">Attention ${name} ⚠️</h2>
            <p style="color:#6B4226;line-height:1.7;">Il ne reste plus que <strong>3 jours</strong> sur votre abonnement YoMuna <strong>${planName}</strong>.</p>
            <p style="color:#6B4226;line-height:1.7;">Après le <strong>${end.toLocaleDateString('fr-FR')}</strong>, vos enfants n'auront plus accès à leurs histoires du soir et apprentissages quotidiens.</p>
            ${btnPay('Renouveler maintenant — 3 jours restants')}
          `)
        );
        sent++;
      }

      // J-1
      else if (daysLeft === 1) {
        await sendEmail(profile.email, name,
          `🚨 ${name}, votre abonnement YoMuna expire demain`,
          emailBase(`
            <h2 style="color:#E06840;">Plus qu'un jour ${name} 🚨</h2>
            <p style="color:#6B4226;line-height:1.7;">Votre abonnement YoMuna expire <strong>demain</strong>.</p>
            <p style="color:#6B4226;line-height:1.7;">Pour ne pas interrompre le rituel du soir de ${profile.first_name ? 'vos enfants' : 'votre enfant'}, renouvelez maintenant en quelques secondes.</p>
            <div style="background:#FFF0E8;border-radius:12px;padding:1rem;margin:1rem 0;border-left:4px solid #FF8C69;">
              <p style="margin:0;color:#2D1B00;font-weight:700;">💡 Astuce : le plan Annuel vous fait économiser jusqu'à 28 000 FCFA sur l'année !</p>
            </div>
            ${btnPay('🚀 Renouveler maintenant')}
          `)
        );
        sent++;
      }

      // J+0 (expiré aujourd'hui)
      else if (daysLeft === 0) {
        // Mettre à jour le statut dans Supabase
        await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${sub.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ status: 'expired' })
        });

        await sendEmail(profile.email, name,
          `😔 ${name}, votre abonnement YoMuna a expiré`,
          emailBase(`
            <h2 style="color:#2D1B00;">Votre abonnement a expiré ${name} 😔</h2>
            <p style="color:#6B4226;line-height:1.7;">Votre abonnement YoMuna <strong>${planName}</strong> a expiré aujourd'hui.</p>
            <p style="color:#6B4226;line-height:1.7;">Vos enfants n'ont plus accès aux histoires du soir, activités et apprentissages. Mais tout est encore là — il suffit de renouveler pour retrouver votre espace en quelques secondes.</p>
            ${btnPay('Réactiver mon abonnement')}
            <p style="color:#A0714F;font-size:0.88rem;text-align:center;">Votre historique et vos favoris sont conservés. Rien n'est perdu.</p>
          `)
        );
        sent++;
      }

      // J+3 (relance après expiration)
      else if (daysLeft === -3) {
        await sendEmail(profile.email, name,
          `🌙 ${name}, vos enfants vous attendent sur YoMuna`,
          emailBase(`
            <h2 style="color:#2D1B00;">Vos enfants vous attendent ${name} 🌙</h2>
            <p style="color:#6B4226;line-height:1.7;">Cela fait 3 jours que votre abonnement YoMuna a expiré. Vos histoires du soir vous manquent ?</p>
            <div style="background:#FFF8F0;border-radius:12px;padding:1.25rem;margin:1.25rem 0;border-left:4px solid #FFD166;">
              <p style="margin:0;color:#2D1B00;font-weight:700;margin-bottom:0.5rem;">✨ Votre espace vous attend :</p>
              <p style="margin:0.3rem 0;color:#6B4226;">📚 Votre historique complet est conservé</p>
              <p style="margin:0.3rem 0;color:#6B4226;">❤️ Vos favoris sont toujours là</p>
              <p style="margin:0.3rem 0;color:#6B4226;">👶 Les profils de vos enfants sont préservés</p>
            </div>
            <p style="color:#6B4226;line-height:1.7;">Revenez quand vous voulez — YoMuna reprend exactement là où vous vous êtes arrêté(e).</p>
            ${btnPay('Reprendre mes rituels du soir')}
          `)
        );
        sent++;
      }

      // J+7 (dernière relance)
      else if (daysLeft === -7) {
        await sendEmail(profile.email, name,
          `💌 Un dernier mot de YoMuna, ${name}`,
          emailBase(`
            <h2 style="color:#2D1B00;">On pense à vous ${name} 💌</h2>
            <p style="color:#6B4226;line-height:1.7;">Votre abonnement YoMuna a expiré il y a une semaine. On espère que tout va bien pour vous et vos enfants.</p>
            <p style="color:#6B4226;line-height:1.7;">Si vous souhaitez revenir, c'est simple et rapide. Tout votre espace est intact.</p>
            <p style="color:#6B4226;line-height:1.7;">Et si vous avez des questions ou des remarques, répondez directement à cet email — on est là.</p>
            ${btnPay('Revenir sur YoMuna')}
            <p style="color:#A0714F;font-size:0.85rem;text-align:center;font-style:italic;">"Parce que la magie parentale ne devrait pas dépendre de l'énergie qu'il te reste." 🌙</p>
          `)
        );
        sent++;
      }

      // Pause entre les envois
      await new Promise(r => setTimeout(r, 150));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sent, total: subs?.length || 0 })
    };

  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
