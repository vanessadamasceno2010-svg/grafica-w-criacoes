import nodemailer from 'nodemailer';
import { config } from '../config.js';

export async function sendMail(to: string, subject: string, html: string) {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    console.log('[email]', { to, subject, html: html.slice(0, 120) });
    return { preview: true };
  }
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass }
  });
  return transporter.sendMail({ from: config.smtp.from, to, subject, html });
}
