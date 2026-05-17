import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { cedula, phone, clientName } = req.body;
  if (!phone) return res.status(400).json({ error: 'Teléfono no proporcionado' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken  = process.env.TWILIO_AUTH_TOKEN!;
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  const otp        = Math.floor(100000 + Math.random() * 900000).toString();

  // Guardar OTP en Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
  await fetch(`${supabaseUrl}/rest/v1/portal_otps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({ cedula, otp, used: false }),
  });

  // Enviar por WhatsApp
  const toPhone = phone.startsWith('+') ? phone : `+57${phone}`;
  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        From: from,
        To: `whatsapp:${toPhone}`,
        Body: `🔐 *Simbiosis — Portal de Clientes*\n\nHola ${clientName} 👋\n\nTu código de acceso es:\n\n*${otp}*\n\nVigente por 10 minutos. No lo compartas con nadie.`,
      }).toString(),
    }
  );

  if (!twilioRes.ok) {
    const err = await twilioRes.json() as any;
    return res.status(400).json({ error: 'Error enviando código: ' + err.message });
  }

  const masked = toPhone.replace(/(\+\d{2})\d+(\d{4})/, '$1*****$2');
  return res.status(200).json({ success: true, phoneMasked: masked });
}