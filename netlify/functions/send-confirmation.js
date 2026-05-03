exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  try {
    const { email, firstName, plan, amount, type } = JSON.parse(event.body);

    const planNames = {
      solo: 'Plan Solo — 1 enfant • 2 500 FCFA/mois',
      fam: 'Plan Famille — jusqu\'à 4 enfants • 4 000 FCFA/mois',
      ann: 'Plan Annuel — jusqu\'à 4 enfants • 20 000 FCFA/an',
      welcome: 'Bienvenue'
    };

    let subject, htmlContent;

    if (type === 'welcome') {
      subject = '🌙 Bienvenue sur YoMuna — Votre compte est créé !';
      htmlContent = `
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
          <a href="https://yo-muna.com" style="display:inline-block;background:#FF8C69;color:white;padding:1rem 2rem;border-radius:50px;text-decoration:none;font-weight:bold;">
            Accéder à YoMuna →
          </a>
          <p style="color:#A0714F;font-size:0.85rem;margin-top:2rem;">Des questions ? WhatsApp : +226 03 11 88 88 ou yomuna237@gmail.com</p>
          <p style="color:#A0714F;font-size:0.75rem;">© 2025 YoMuna • Yaoundé, Cameroun</p>
        </div>`;
    } else {
      subject = '✅ YoMuna — Votre paiement est confirmé !';
      htmlContent = `
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
        </div>`;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'YoMuna', email: 'yomuna237@gmail.com' },
        to: [{ email: email, name: firstName }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    const data = await response.json();
    console.log('Brevo response:', JSON.stringify(data));

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
