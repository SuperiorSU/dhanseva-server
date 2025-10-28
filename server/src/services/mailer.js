
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NODE_ENV } = process.env;

let transporter;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
	transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT) || 587,
		secure: false,
		auth: { user: SMTP_USER, pass: SMTP_PASS }
	});
} else {
	// fallback: console logger
	transporter = null;
}

export async function sendMail({ to, subject, text, html }) {
	if (transporter) {
		await transporter.sendMail({ from: SMTP_USER, to, subject, text, html });
	} else {
		if (NODE_ENV !== 'production') {
			console.log('[mailer] simulated send to:', to, subject, text || html);
		}
	}
}
