export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { to, clientName, installmentNumber, amount, dueDate } = req.body;
  if (!to || !amount || !dueDate) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  if (!accountSid || !authToken) {
    return res.status(500).json({ error: 'Credenciales de Twilio no configuradas' });
  }
  const credentials = btoa(`${accountSid}:${authToken}`);
  const message = `Hola ${clientName}, te recordamos que tu cuota #${installmentNumber} de *Simbiosis* por *$${Number(amount).toLocaleString('es-CO')}* vence el *${dueDate}*. Evita intereses de mora pagando a tiempo.`;
  try {
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
          To: `whatsapp:${to.startsWith('+') ? to : '+' + to}`,
          Body: message,
        }).toString(),
      }
    );
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.message || 'Error de Twilio' });
    return res.status(200).json({ success: true, sid: data.sid });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}