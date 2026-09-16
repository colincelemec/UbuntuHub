// ============================================
// Email service — Nodemailer
// Sends the transactional emails (welcome, listing status).
// When SMTP is not configured (dev), the email is printed to the console
// instead of being sent, so development is never blocked.
// ============================================

const nodemailer = require('nodemailer');

const BRAND = 'UbuntuHub';
const PRIMARY = '#e8a33d';

// --- SMTP configuration detection ---
// The example values in .env.example are NOT empty: without this check
// the service believed it was configured, opened a real connection with
// fake credentials, failed, and the error went unnoticed. They are
// therefore treated as "not configured", falling back to the console.
const PLACEHOLDERS = [
  'your-email@gmail.com',
  'your-app-password',
  'your-smtp-user',
  'votre-email',
  'changeme',
];

const isPlaceholder = (value) =>
  !value || PLACEHOLDERS.some(p => String(value).toLowerCase().includes(p.toLowerCase()));

const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const isConfigured = Boolean(
  smtpHost && !isPlaceholder(smtpUser) && !isPlaceholder(smtpPass)
);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true', // true = 465
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
} else if (smtpHost && (isPlaceholder(smtpUser) || isPlaceholder(smtpPass))) {
  // Tricky case: the variables exist but still hold the example values
  console.warn(
    '\n⚠️  SMTP ignoré : SMTP_USER/SMTP_PASS contiennent encore les valeurs ' +
    'd\'exemple de .env.example.\n   Les emails seront affichés dans la console. ' +
    'Renseignez de vrais identifiants pour les envoyer.\n'
  );
}

/**
 * Tests the connection to the SMTP server.
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
async function verifyConnection() {
  if (!isConfigured) {
    return { ok: false, reason: 'SMTP non configuré (ou valeurs d\'exemple)' };
  }
  try {
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

const FROM = process.env.EMAIL_FROM || `${BRAND} <no-reply@ubuntuhub.com>`;

/**
 * Shared HTML wrapper (responsive, compatible with mail clients)
 */
function layout({ title, body }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#2d2118;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e0d6;">
          <tr>
            <td style="background:${PRIMARY};padding:22px 28px;">
              <span style="font-size:20px;font-weight:bold;color:#2d2118;">🌍 ${BRAND}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <h1 style="margin:0 0 16px;font-size:21px;color:#2d2118;">${title}</h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#faf8f5;border-top:1px solid #e8e0d6;">
              <p style="margin:0;font-size:12px;color:#7a6a5c;">
                © ${new Date().getFullYear()} ${BRAND} — ${tr('footer', 'it')}
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function button(url, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:10px;background:${PRIMARY};">
      <a href="${url}" target="_blank"
         style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:#2d2118;text-decoration:none;border-radius:10px;">
        ${label}
      </a>
    </td></tr>
  </table>`;
}

// --- Small internal translations for the footer and fallbacks ---
function tr(key, lang) {
  const dict = {
    footer: {
      en: 'Discover the African diaspora businesses in Italy.',
      fr: 'Découvrez les entreprises de la diaspora africaine en Italie.',
      it: 'Scopri le attività della diaspora africana in Italia.',
    },
  };
  return (dict[key] && (dict[key][lang] || dict[key].en)) || '';
}

/**
 * Low-level send. Returns true when sent or printed without error.
 */
async function send({ to, subject, html, text }) {
  if (!isConfigured) {
    // Dev mode: no SMTP → log the email instead of sending it
    console.log('\n📧 [EMAIL - mode dev, SMTP non configuré]');
    console.log('   To:', to);
    console.log('   Subject:', subject);
    if (text) console.log('   Text:', text);
    console.log('   (Configurez SMTP_* dans .env pour un envoi réel)\n');
    return false;
  }
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html, text });
    console.log(`📧 Email envoyé à ${to} — « ${subject} » (id: ${info.messageId})`);
    return true;
  } catch (error) {
    // A send failure must not fail the sign-up, but it must be clearly
    // visible in the logs: otherwise the problem goes unnoticed.
    console.error(`\n❌ Échec de l'envoi de l'email à ${to}`);
    console.error(`   Sujet : ${subject}`);
    console.error(`   Cause : ${error.message}`);
    if (/auth|credential|username|password/i.test(error.message)) {
      console.error('   → Identifiants SMTP refusés. Avec Gmail, un mot de passe');
      console.error('     d\'application est obligatoire (pas le mot de passe du compte).\n');
    } else {
      console.error('');
    }
    throw error;
  }
}

// ============================================
// TEMPLATES
// ============================================

const T = {
  welcome: {
    subject: {
      en: `Welcome to ${BRAND}!`,
      fr: `Bienvenue sur ${BRAND} !`,
      it: `Benvenuto su ${BRAND}!`,
    },
    title: {
      en: 'Welcome aboard 🎉',
      fr: 'Bienvenue à bord 🎉',
      it: 'Benvenuto a bordo 🎉',
    },
    intro: {
      en: (name) => `Hi ${name}, your account has been created successfully. You can now explore businesses, save your favorites, leave reviews, and publish your own service.`,
      fr: (name) => `Bonjour ${name}, votre compte a été créé avec succès. Vous pouvez désormais explorer les activités, enregistrer vos favoris, laisser des avis et publier votre propre service.`,
      it: (name) => `Ciao ${name}, il tuo account è stato creato con successo. Ora puoi esplorare le attività, salvare i preferiti, lasciare recensioni e pubblicare il tuo servizio.`,
    },
    cta: { en: 'Go to my dashboard', fr: 'Accéder à mon espace', it: 'Vai alla mia dashboard' },
  },
  bizApproved: {
    subject: {
      en: `Your business has been approved on ${BRAND} ✅`,
      fr: `Votre activité a été approuvée sur ${BRAND} ✅`,
      it: `La tua attività è stata approvata su ${BRAND} ✅`,
    },
    title: {
      en: 'Business approved',
      fr: 'Activité approuvée',
      it: 'Attività approvata',
    },
    intro: {
      en: (biz) => `Good news! "${biz}" has been reviewed and approved by our team. It is now visible in the UbuntuHub directory with a verified badge.`,
      fr: (biz) => `Bonne nouvelle ! « ${biz} » a été vérifiée et approuvée par notre équipe. Elle est désormais visible dans l'annuaire UbuntuHub avec un badge vérifié.`,
      it: (biz) => `Ottima notizia! "${biz}" è stata verificata e approvata dal nostro team. Ora è visibile nella directory UbuntuHub con il badge di verifica.`,
    },
    cta: { en: 'View my business', fr: 'Voir mon activité', it: 'Vedi la mia attività' },
  },
  bizRejected: {
    subject: {
      en: `Update about your business on ${BRAND}`,
      fr: `Mise à jour concernant votre activité sur ${BRAND}`,
      it: `Aggiornamento sulla tua attività su ${BRAND}`,
    },
    title: {
      en: 'Business not approved',
      fr: 'Activité non approuvée',
      it: 'Attività non approvata',
    },
    intro: {
      en: (biz) => `Unfortunately "${biz}" could not be approved at this time. Please review the information provided (address, category, photos) and update your listing. Our team will review it again.`,
      fr: (biz) => `Malheureusement, « ${biz} » n'a pas pu être approuvée pour le moment. Vérifiez les informations fournies (adresse, catégorie, photos) et mettez à jour votre fiche. Notre équipe la réexaminera.`,
      it: (biz) => `Purtroppo "${biz}" non è stata approvata per il momento. Controlla le informazioni fornite (indirizzo, categoria, foto) e aggiorna la tua scheda. Il nostro team la riesaminerà.`,
    },
    cta: { en: 'Update my listing', fr: 'Mettre à jour ma fiche', it: 'Aggiorna la mia scheda' },
  },
};

const pick = (obj, lang) => obj[lang] || obj.en;

/**
 * Welcome email sent after registration
 */
async function sendWelcomeEmail(user, lang = 'it') {
  const name = user.firstName || (user.email ? user.email.split('@')[0] : '');
  const dashUrl = `${process.env.CLIENT_URL || ''}/dashboard`;
  const body = `
    <p style="font-size:15px;line-height:1.7;color:#2d2118;">${pick(T.welcome.intro, lang)(name)}</p>
    ${button(dashUrl, pick(T.welcome.cta, lang))}
  `;
  return send({
    to: user.email,
    subject: pick(T.welcome.subject, lang),
    html: layout({ title: pick(T.welcome.title, lang), body }),
    text: `${pick(T.welcome.title, lang)} — ${pick(T.welcome.intro, lang)(name)} ${dashUrl}`,
  });
}

/**
 * Notifies an owner that their listing was approved or rejected
 */
async function sendBusinessStatusEmail(owner, business, status, lang = 'it') {
  if (!owner?.email) return false;
  const tpl = status === 'VERIFIED' ? T.bizApproved : T.bizRejected;
  const url = status === 'VERIFIED'
    ? `${process.env.CLIENT_URL || ''}/businesses/${business.slug}`
    : `${process.env.CLIENT_URL || ''}/edit-service/${business.id}`;
  const body = `
    <p style="font-size:15px;line-height:1.7;color:#2d2118;">${pick(tpl.intro, lang)(business.name)}</p>
    ${button(url, pick(tpl.cta, lang))}
  `;
  return send({
    to: owner.email,
    subject: pick(tpl.subject, lang),
    html: layout({ title: pick(tpl.title, lang), body }),
    text: `${pick(tpl.title, lang)} — ${pick(tpl.intro, lang)(business.name)} ${url}`,
  });
}

module.exports = {
  isConfigured,
  verifyConnection,
  sendWelcomeEmail,
  sendBusinessStatusEmail,
};
