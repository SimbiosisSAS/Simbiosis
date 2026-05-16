export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { code } = req.body;
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!adminNumber || !accountSid || !authToken) {
    return res.status(500).json({ error: 'Configuración incompleta' });
  }

  const message = `🔐 *Simbiosis Core Bancario*\n\nTu código de acceso es:\n\n*${code}*\n\nVigente por 15 minutos. No compartas este código con nadie.`;

  try {
    const credentials = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: from,
          To: `whatsapp:${adminNumber.startsWith('+') ? adminNumber : '+' + adminNumber}`,
          Body: message,
        }).toString(),
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.message });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}