import nodemailer, { type SendMailOptions } from "nodemailer";

type EmailContent = {
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
  const text = [content.heading, ...content.paragraphs, content.action ? `${content.action.label}: ${content.action.href}` : "", "SardiniaFestival · Tutta l'isola, un calendario."].filter(Boolean).join("\n\n");
  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#f6f7f4;padding:32px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #e2e8ed;border-radius:20px;background:#fff"><tr><td style="padding:32px 32px 16px"><div style="color:#087567;font:bold 10px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase">SardiniaFestival</div><div style="margin-top:28px;color:#ef7355;font:bold 10px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase">${escapeHtml(content.eyebrow)}</div><h1 style="margin:10px 0 22px;color:#082848;font:600 28px/1.2 Arial,sans-serif">${escapeHtml(content.heading)}</h1>${paragraphs}${action}<hr style="margin:30px 0 20px;border:0;border-top:1px solid #edf0f2"><p style="margin:0;color:#718394;font:11px/1.6 Arial,sans-serif">SardiniaFestival · Tutta l'isola, un calendario.</p></td></tr></table></td></tr></table></body></html>`;
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

export async function sendVerificationEmail(to: string, name: string, verificationUrl: string) {
  await send(to, {
    subject: "Conferma il tuo account SardiniaFestival",
    eyebrow: "Verifica email",
    heading: "Confermiamo che sei tu?",
    paragraphs: [`Ciao ${name}, conferma il tuo indirizzo email per attivare l'account e inviare segnalazioni su SardiniaFestival.`, "Il link resta valido per 24 ore. Se non hai creato tu l'account, puoi ignorare questa email."],
    action: { label: "Verifica il mio account", href: verificationUrl },
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
