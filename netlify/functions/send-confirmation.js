exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const ADMIN_EMAIL = 'yomuna237@gmail.com';

  try {
    const { email, firstName, lastName, country, plan, amount, type } = JSON.parse(event.body);

    const planNames = {
      solo: 'Plan Solo — 1 enfant • 2 500 FCFA/mois',
      fam: 'Plan Famille — jusqu\'à 4 enfants • 4 000 FCFA/mois',
      ann: 'Plan Annuel — jusqu\'à 4 enfants • 20 000 FCFA/an',
    };

    const countryNames = {
      CM:'Cameroun', FR:'France', CA:'Canada', GB:'Royaume-Uni',
      US:'États-Unis', GA:'Gabon', CG:'Congo', CI:"Côte d'Ivoire",
      SN:'Sénégal', NG:'Nigeria'
    };

    const emails = [];

    // ===== EMAIL À L'UTILISATEUR =====
    if (type === 'welcome') {
      // Email de bienvenue à l'utilisateur
      emails.push({
        to: [{ email, name: firstName }],
        subject: '🌙 Bienvenue sur YoMuna — Votre compte est créé !',
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FFF8F0;padding:2rem;border-radius:16px;">
            <h1 style="color:#E06840;font-size:2rem;margin-bottom:0.5rem;">Yo<span style="color:#FFD166">●</span>Muna</h1>
            <h2 style="color:#2D1B00;">Bienvenue ${firstName} ! 🎉</h2>
            <p style="color:#6B4226;line-height:1.7;">Votre compte YoMuna a été créé avec succès. Vous êtes maintenant à un pas de découvrir la magie parentale !</p>
            <div style="background:white;border-radius:12px;padding:1.5rem;margin:1.5rem 0;border-left:4px solid #FFD166;">
              <h3 style="color:#2D1B00;margin-bottom:0.75rem;">Prochaines étapes :</h3>
              <p style="color:#6B4226;margin:0.4rem 0;">1️⃣ Renseignez le profil de vos enfants</p>
              <p style="color:#6B4226;margin:0.4rem 0;">2️⃣ Choisissez votre abonnement</p>
              <p style="color:#6B4226;margin:0.4rem 0;">3️⃣ Découvrez des histoires, activités et conseils personnalisés</p>
            </div>
            <a href="https://yo-muna.com" style="display:inline-block;background:#FF8C69;color:white;padding:1rem 2rem;border-radius:50px;text-decoration:none;font-weight:bold;margin:1rem 0;">
              Accéder à YoMuna →
            </a>
            <p style="color:#A0714F;font-size:0.85rem;margin-top:2rem;">Des questions ? WhatsApp : +226 03 11 88 88 ou yomuna237@gmail.com</p>
            <p style="color:#A0714F;font-size:0.75rem;">© 2025 YoMuna • Yaoundé, Cameroun</p>
          </div>`
      });

      // ===== NOTIFICATION ADMIN — NOUVELLE INSCRIPTION =====
      emails.push({
        to: [{ email: ADMIN_EMAIL, name: 'Admin YoMuna' }],
        subject: `🔔 Nouvelle inscription — ${firstName} ${lastName || ''}`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#2D1B00;padding:2rem;border-radius:16px;">
            <h1 style="color:#FFD166;font-size:1.8rem;margin-bottom:1rem;">🔔 Nouvelle inscription YoMuna</h1>
            <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:1.5rem;margin-bottom:1rem;">
              <p style="color:white;margin:0.5rem 0;">👤 <strong style="color:#FFD166;">Nom :</strong> ${firstName} ${lastName || ''}</p>
              <p style="color:white;margin:0.5rem 0;">📧 <strong style="color:#FFD166;">Email :</strong> ${email}</p>
              <p style="color:white;margin:0.5rem 0;">🌍 <strong style="color:#FFD166;">Pays :</strong> ${countryNames[country] || country || 'Non renseigné'}</p>
              <p style="color:white;margin:0.5rem 0;">📅 <strong style="color:#FFD166;">Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            </div>
            <a href="https://yo-muna.com/#admin" style="display:inline-block;background:#FF8C69;color:white;padding:0.85rem 1.5rem;border-radius:50px;text-decoration:none;font-weight:bold;">
              Voir le dashboard admin →
            </a>
          </div>`
      });

    } else {
      // ===== EMAIL DE CONFIRMATION PAIEMENT À L'UTILISATEUR =====
      emails.push({
        to: [{ email, name: firstName }],
        subject: '✅ YoMuna — Votre paiement est confirmé !',
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FFF8F0;padding:2rem;border-radius:16px;">
            <h1 style="color:#E06840;font-size:2rem;margin-bottom:0.5rem;">Yo<span style="color:#FFD166">●</span>Muna</h1>
            <h2 style="color:#2D1B00;">Paiement confirmé, ${firstName} ! 🎉</h2>
            <p style="color:#6B4226;line-height:1.7;">Votre abonnement YoMuna est maintenant actif. La magie peut commencer !</p>
            <div style="background:white;border-radius:12px;padding:1.5rem;margin:1.5rem 0;border-left:4px solid #FF8C69;">
              <h3 style="color:#2D1B00;margin-bottom:0.5rem;">Récapitulatif</h3>
              <p style="color:#6B4226;margin:0.3rem 0;">📦 <strong>${planNames[plan] || plan}</strong></p>
              <p style="color:#6B4226;margin:0.3rem 0;">💰 <strong>${amount} FCFA</strong></p>
              <p style="color:#6B4226;margin:0.3rem 0;">✅ <strong>Statut : Actif</strong></p>
              <p style="color:#6B4226;margin:0.3rem 0;">📅 <strong>Durée : ${plan === 'ann' ? '12 mois' : '30 jours'}</strong></p>
            </div>
            <div style="background:#CFFAEA;border-radius:12px;padding:1rem;margin-bottom:1.5rem;">
              <p style="color:#03A97A;font-weight:700;margin:0;">💡 Pensez à renseigner le profil de vos enfants pour obtenir des contenus personnalisés !</p>
            </div>
            <a href="https://yo-muna.com" style="display:inline-block;background:#FF8C69;color:white;padding:1rem 2rem;border-radius:50px;text-decoration:none;font-weight:bold;">
              Accéder à mon espace →
            </a>
            <p style="color:#A0714F;font-size:0.85rem;margin-top:2rem;">Questions ? WhatsApp : +226 03 11 88 88 ou yomuna237@gmail.com</p>
            <p style="color:#A0714F;font-size:0.75rem;">© 2025 YoMuna • Yaoundé, Cameroun</p>
          </div>`
      });

      // ===== NOTIFICATION ADMIN — NOUVEAU PAIEMENT =====
      emails.push({
        to: [{ email: ADMIN_EMAIL, name: 'Admin YoMuna' }],
        subject: `💰 Nouveau paiement — ${firstName} • ${amount} FCFA`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#2D1B00;padding:2rem;border-radius:16px;">
            <h1 style="color:#06D6A0;font-size:1.8rem;margin-bottom:1rem;">💰 Nouveau paiement YoMuna</h1>
            <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:1.5rem;margin-bottom:1rem;">
              <p style="color:white;margin:0.5rem 0;">👤 <strong style="color:#FFD166;">Client :</strong> ${firstName} ${lastName || ''}</p>
              <p style="color:white;margin:0.5rem 0;">📧 <strong style="color:#FFD166;">Email :</strong> ${email}</p>
              <p style="color:white;margin:0.5rem 0;">📦 <strong style="color:#FFD166;">Plan :</strong> ${planNames[plan] || plan}</p>
              <p style="color:white;margin:0.5rem 0;">💰 <strong style="color:#06D6A0;font-size:1.2rem;">${amount} FCFA</strong></p>
              <p style="color:white;margin:0.5rem 0;">📅 <strong style="color:#FFD166;">Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            </div>
            <a href="https://yo-muna.com/#admin" style="display:inline-block;background:#FF8C69;color:white;padding:0.85rem 1.5rem;border-radius:50px;text-decoration:none;font-weight:bold;">
              Voir le dashboard admin →
            </a>
          </div>`
      });
    }

    // Envoyer tous les emails
    for (const emailData of emails) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'YoMuna', email: ADMIN_EMAIL },
          ...emailData
        })
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.log('Email error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
