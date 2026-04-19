/**
 * 邮件服务 — Resend API
 *
 * 免费额度：100 封/天
 * 文档：https://resend.com/docs/api-reference/emails/send-email
 */
import https from 'https';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'LeyoAI <noreply@leyoai.com>';

interface EmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}

/** 发送邮件（通过 Resend REST API） */
export async function sendQuotaAlert(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured, skipping alert');
    return false;
  }

  const payload: EmailPayload = {
    from: FROM_EMAIL,
    to,
    subject,
    html,
  };

  try {
    const result = await resendRequest('/emails', 'POST', payload);
    return !!result?.id;
  } catch (err) {
    console.error('[email] Failed to send:', err);
    return false;
  }
}

/** Resend API 请求封装 */
function resendRequest(
  path: string,
  method: string,
  body?: unknown,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;

    const req = https.request(
      {
        hostname: 'api.resend.com',
        path,
        method,
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(chunks);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Resend ${res.statusCode}: ${JSON.stringify(json)}`));
            } else {
              resolve(json);
            }
          } catch {
            reject(new Error(`Invalid JSON: ${chunks.slice(0, 200)}`));
          }
        });
      },
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
