import nodemailer, { type SendMailOptions } from "nodemailer";

type EmailContent = {
  locale?: "it" | "en";
  subject: string;
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; href: string };
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function renderEmail(content: EmailContent) {
  const paragraphs = content.paragraphs.map((paragraph) => `<p style="margin:0 0 16px;color:#39556c;font:15px/1.7 Arial,sans-serif">${escapeHtml(paragraph)}</p>`).join("");
  const action = content.action
    ? `<p style="margin:28px 0"><a href="${escapeHtml(content.action.href)}" style="display:inline-block;border-radius:10px;background:#20b6a7;padding:14px 22px;color:#082848;font:bold 14px Arial,sans-serif;text-decoration:none">${escapeHtml(content.action.label)}</a></p>`
    : "";
  const footer = content.locale === "en" ? "SardiniaFestival · The whole island, one calendar." : "SardiniaFestival · Tutta l'isola, un calendario.";
  const text = [content.heading, ...content.paragraphs, content.action ? `${content.action.label}: ${content.action.href}` : "", footer].filter(Boolean).join("\n\n");
  const html = `<!doctype html><html lang="${content.locale === "en" ? "en" : "it"}"><body style="margin:0;background:#f6f7f4;padding:32px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #e2e8ed;border-radius:20px;background:#fff"><tr><td style="padding:32px 32px 16px"><div style="color:#087567;font:bold 10px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase">SardiniaFestival</div><div style="margin-top:28px;color:#ef7355;font:bold 10px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase">${escapeHtml(content.eyebrow)}</div><h1 style="margin:10px 0 22px;color:#082848;font:600 28px/1.2 Arial,sans-serif">${escapeHtml(content.heading)}</h1>${paragraphs}${action}<hr style="margin:30px 0 20px;border:0;border-top:1px solid #edf0f2"><p style="margin:0;color:#718394;font:11px/1.6 Arial,sans-serif">${escapeHtml(footer)}</p></td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM);
}

function createTransport() {
  if (!smtpConfigured()) throw new Error("SMTP non configurato.");
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP_PORT non valido.");
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: user && password ? { user, pass: password } : undefined,
  });
}

async function send(to: string, content: EmailContent) {
  const rendered = renderEmail(content);
  const options: SendMailOptions = {
    from: process.env.SMTP_FROM,
    to,
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    subject: content.subject,
    text: rendered.text,
    html: rendered.html,
  };
  await createTransport().sendMail(options);
}

export async function sendVerificationEmail(to: string, name: string, verificationUrl: string, locale: "it" | "en" = "it") {
  await send(to, locale === "en" ? {
    locale: "en",
    subject: "Verify your SardiniaFestival account",
    eyebrow: "Email verification",
    heading: "Confirm your email",
    paragraphs: [`Hello ${name}, confirm your email address to activate your SardiniaFestival account.`, "This link is valid for 24 hours. If you did not create an account, you can ignore this email."],
    action: { label: "Verify my account", href: verificationUrl },
  } : {
    subject: "Conferma il tuo account SardiniaFestival",
    eyebrow: "Verifica email",
    heading: "Confermiamo che sei tu?",
    paragraphs: [`Ciao ${name}, conferma il tuo indirizzo email per attivare l'account e inviare segnalazioni su SardiniaFestival.`, "Il link resta valido per 24 ore. Se non hai creato tu l'account, puoi ignorare questa email."],
    action: { label: "Verifica il mio account", href: verificationUrl },
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, locale: "it" | "en") {
  await send(to, locale === "en" ? {
    locale: "en",
    subject: "Reset your SardiniaFestival password",
    eyebrow: "Password reset",
    heading: "Choose a new password",
    paragraphs: ["We received a request to reset your password. This link is valid for one hour.", "If you did not request it, you can ignore this email."],
    action: { label: "Reset password", href: resetUrl },
  } : {
    subject: "Reimposta la password di SardiniaFestival",
    eyebrow: "Recupero password",
    heading: "Scegli una nuova password",
    paragraphs: ["Abbiamo ricevuto una richiesta per reimpostare la password. Il link è valido per un'ora.", "Se non hai effettuato questa richiesta, puoi ignorare questa email."],
    action: { label: "Reimposta la password", href: resetUrl },
  });
}

export async function sendEventReceivedEmail(to: string, name: string, eventTitle: string) {
  await send(to, {
    subject: `Abbiamo ricevuto “${eventTitle}”`,
    eyebrow: "Segnalazione ricevuta",
    heading: "Grazie per aver condiviso la festa.",
    paragraphs: [`Ciao ${name}, abbiamo ricevuto la segnalazione di “${eventTitle}”.`, "La revisione editoriale è in corso. Ti scriveremo quando lo stato dell'evento cambierà."],
  });
}

export async function sendEventStatusEmail(to: string, name: string, eventTitle: string, published: boolean, eventUrl: string) {
  await send(to, {
    subject: published ? `“${eventTitle}” è online` : `Aggiornamento sulla segnalazione “${eventTitle}”`,
    eyebrow: published ? "Evento pubblicato" : "Aggiornamento evento",
    heading: published ? "La tua festa è online." : "La segnalazione è stata aggiornata.",
    paragraphs: published
      ? [`Ciao ${name}, “${eventTitle}” è stato verificato e ora compare nel calendario SardiniaFestival.`]
      : [`Ciao ${name}, la segnalazione di “${eventTitle}” non è stata approvata per la pubblicazione. Puoi contattarci se vuoi aggiungere informazioni o correggere i dettagli.`],
    action: published ? { label: "Apri la pagina evento", href: eventUrl } : undefined,
  });
}
