import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { action, cedula, otp: inputOtp } = req.body;
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
    'apikey': supabaseKey,
  };

  // ── ENVIAR OTP ──────────────────────────────────────────────────────────
  if (action === 'send') {
    const loansRes = await fetch(
      `${supabaseUrl}/rest/v1/active_loans?client_id_number=eq.${cedula}&select=id,client_name,client_phone`,
      { headers }
    );
    const loans = await loansRes.json();
    if (!loans || loans.length === 0)
      return res.status(404).json({ error: 'No encontramos ningún crédito con esa cédula.' });

    let phone = loans[0].client_phone || '';
    if (!phone) {
      const appsRes = await fetch(
        `${supabaseUrl}/rest/v1/credit_applications?id_number=eq.${cedula}&select=phone&order=created_at.desc&limit=1`,
        { headers }
      );
      const apps = await appsRes.json();
      if (apps && apps.length > 0) phone = apps[0].phone || '';
    }

    if (!phone)
      return res.status(404).json({ error: 'No encontramos teléfono registrado. Contacta a Simbiosis.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await fetch(`${supabaseUrl}/rest/v1/portal_otps`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ cedula, otp, used: false }),
    });

    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken  = process.env.TWILIO_AUTH_TOKEN!;
    const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    const to = `whatsapp:${phone.startsWith('+') ? phone : '+57' + phone}`;

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
          To: to,
          Body: `🔐 *Simbiosis — Portal de Clientes*\n\nHola ${loans[0].client_name} 👋\n\nTu código de acceso es:\n\n*${otp}*\n\nVigente por 10 minutos. No lo compartas con nadie.`,
        }).toString(),
      }
    );

    if (!twilioRes.ok) {
      const err = await twilioRes.json() as any;
      return res.status(400).json({ error: 'Error enviando mensaje: ' + err.message });
    }

    const masked = to.replace(/(\+\d{2})\d+(\d{4})/, '$1*****$2');
    return res.status(200).json({ success: true, clientName: loans[0].client_name, phoneMasked: masked });
  }

  // ── VERIFICAR OTP ───────────────────────────────────────────────────────
  if (action === 'verify') {
    const now = new Date().toISOString();
    const otpRes = await fetch(
      `${supabaseUrl}/rest/v1/portal_otps?cedula=eq.${cedula}&otp=eq.${inputOtp}&used=eq.false&expires_at=gt.${now}&select=id&order=created_at.desc&limit=1`,
      { headers }
    );
    const otps = await otpRes.json();
    if (!otps || otps.length === 0)
      return res.status(400).json({ error: 'Código incorrecto o expirado. Solicita uno nuevo.' });

    await fetch(`${supabaseUrl}/rest/v1/portal_otps?id=eq.${otps[0].id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ used: true }),
    });

    const loansRes = await fetch(
      `${supabaseUrl}/rest/v1/active_loans?client_id_number=eq.${cedula}&select=id,client_name`,
      { headers }
    );
    const loans = await loansRes.json();
    return res.status(200).json({ success: true, loanId: loans[0]?.id, clientName: loans[0]?.client_name });
  }

  return res.status(400).json({ error: 'Acción no válida' });
}