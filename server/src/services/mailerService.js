import { sendMail as simpleSend } from './mailer.js';

// Wrapper to keep API consistent: sendEmail({ to, subject, html, text, attachments })
export async function sendEmail({ to, subject, html, text, attachments = [] }) {
  // attachments: [{ filename, content, path, href }]
  return simpleSend({ to, subject, text: text || html, html });
}
