import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText } from 'lucide-react';

// ── NÚMERO A PALABRAS EN ESPAÑOL ─────────────────────────────────────────
const ones = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
  'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE',
  'VEINTE','VEINTIUNO','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
const tens = ['','DIEZ','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
const hundreds = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];

function numToWords(num: number): string {
  if (num === 0) return 'CERO';
  let n = Math.round(num);
  let r = '';
  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    r += m === 1 ? 'UN MILLÓN' : numToWords(m) + ' MILLONES';
    n %= 1000000;
    if (n > 0) r += ' ';
  }
  if (n >= 1000) {
    const t = Math.floor(n / 1000);
    r += t === 1 ? 'MIL' : numToWords(t) + ' MIL';
    n %= 1000;
    if (n > 0) r += ' ';
  }
  if (n >= 100) {
    if (n === 100) { r += 'CIEN'; n = 0; }
    else { r += hundreds[Math.floor(n / 100)]; n %= 100; if (n > 0) r += ' '; }
  }
  if (n > 0) {
    if (n < 30) r += ones[n];
    else { r += tens[Math.floor(n / 10)]; if (n % 10 > 0) r += ' Y ' + ones[n % 10]; }
  }
  return r.trim();
}

function enPesos(amount: number): string {
  return numToWords(Math.round(amount)) + ' PESOS MONEDA CORRIENTE (M/CTE)';
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export default function GeneradorPagare({ loan, installments }: { loan: any; installments: any[] }) {
  const [generating, setGenerating] = useState(false);

  const generar = async () => {
    setGenerating(true);
    try {
      // Buscar teléfono y email del cliente
      let phone = loan.client_phone || '';
      let email = '';
      if (!phone || !email) {
        const { data: apps } = await supabase
          .from('credit_applications')
          .select('phone, email')
          .eq('id_number', loan.client_id_number)
          .order('created_at', { ascending: false })
          .limit(1);
        if (apps && apps.length > 0) {
          if (!phone) phone = apps[0].phone || '';
          email = apps[0].email || '';
        }
      }

      const monto = Number(loan.principal_amount || loan.loan_amount);
      const cuota = Number(loan.fixed_quota_amount);
      const hoy = new Date();
      const primerasCuotas = [...installments].filter(i => i.status !== 'PAID_EARLY').sort((a, b) => a.installment_number - b.installment_number);
      const primeraCuota = primerasCuotas[0];
      const fechaPrimerPago = primeraCuota ? new Date(primeraCuota.expected_payment_date) : hoy;
      const diaPago = fechaPrimerPago.getDate();

      const fecha = `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;
      const fechaPago1 = `${fechaPrimerPago.getDate()} de ${MESES[fechaPrimerPago.getMonth()]} de ${fechaPrimerPago.getFullYear()}`;

      const styles = `
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Times New Roman',serif; font-size:12px; color:#000; padding:40px 60px; line-height:1.6; }
        .page { page-break-after:always; padding-bottom:40px; }
        .header { text-align:center; margin-bottom:24px; }
        .logo { font-size:20px; font-weight:bold; color:#059669; margin-bottom:4px; }
        .nit { font-size:11px; color:#374151; }
        h1 { font-size:16px; font-weight:bold; text-align:center; margin:20px 0; text-decoration:underline; }
        h2 { font-size:13px; font-weight:bold; margin:16px 0 8px; }
        p { margin-bottom:10px; text-align:justify; }
        .dato { font-weight:bold; text-decoration:underline; }
        .firma-grid { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:40px; }
        .firma-box { text-align:center; }
        .firma-line { border-top:1px solid #000; margin-top:60px; padding-top:8px; font-size:11px; }
        .aprobacion { margin-top:32px; border:1px solid #000; padding:16px; }
        table { width:100%; border-collapse:collapse; margin:12px 0; }
        td, th { border:1px solid #000; padding:6px 8px; font-size:11px; }
        th { background:#f3f4f6; font-weight:bold; }
        @media print { body { padding:20px 40px; } button { display:none!important; } }
      `;

      const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Pagaré No. ${loan.loan_number} — ${loan.client_name}</title>
<style>${styles}</style></head>
<body>

<button onclick="window.print()" style="position:fixed;top:16px;right:16px;padding:10px 20px;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;z-index:999;">🖨 Imprimir / Guardar PDF</button>

<!-- DOCUMENTO 1: PAGARÉ -->
<div class="page">
  <div class="header">
    <div class="logo">SOMOS SIMBIOSIS S.A.S.</div>
    <div class="nit">N.I.T. 901.276.516-1</div>
  </div>
  <h1>PAGARÉ No. ${loan.loan_number || '___'}</h1>

  <p><strong>Lugar y fecha de celebración del contrato:</strong> Bogotá D.C., <span class="dato">${fecha}</span></p>
  <p><strong>Valor:</strong> <span class="dato">${enPesos(monto)}</span><br/>
  <strong>($</strong> <span class="dato">${Math.round(monto).toLocaleString('es-CO')}</span><strong>) moneda legal</strong></p>
  <p><strong>Ciudad y dirección donde se efectuará el pago:</strong> Bogotá D.C.</p>

  <p>Nosotros, <span class="dato">${loan.client_name}</span>, mayor de edad, domiciliado y residente en la ciudad de Bogotá D.C., identificado con la cédula de ciudadanía No. <span class="dato">${loan.client_id_number}</span>, correo electrónico <span class="dato">${email || '[COMPLETAR EMAIL]'}</span> y teléfono celular No. (+57) <span class="dato">${phone || '[COMPLETAR TELÉFONO]'}</span> (en adelante, el <strong>"Deudor"</strong>) y, <span class="dato">[NOMBRE CODEUDOR SOLIDARIO]</span>, mayor de edad, domiciliado y residente en la ciudad de Bogotá D.C., identificado con la cédula de ciudadanía No. <span class="dato">[C.C. CODEUDOR]</span>, correo electrónico <span class="dato">[EMAIL CODEUDOR]</span> y teléfono celular No. (+57) <span class="dato">[TEL. CODEUDOR]</span> (en adelante, el <strong>"Codeudor Solidario"</strong>), por medio del presente documento, manifestamos que suscribimos el Pagaré No. <span class="dato">${loan.loan_number || '___'}</span>, junto con sus anexos (en adelante, el <strong>"Pagaré"</strong>).</p>

  <h2>CLÁUSULA PRIMERA — OBJETO</h2>
  <p>Por virtud del presente título valor, pagaremos incondicionalmente, a la orden de la empresa <strong>SOMOS SIMBIOSIS S.A.S.</strong>, domiciliada en la ciudad de Bogotá D.C., identificada con N.I.T. 901.276.516-1, representada legalmente por el señor <strong>ANDRES LEONARDO CASTAÑEDA LOZANO</strong>, mayor de edad, identificado con la cédula de ciudadanía No. 80.220.919 de Bogotá D.C., o a quien represente sus derechos, la suma de <span class="dato">${enPesos(monto)}</span> (<strong>$${Math.round(monto).toLocaleString('es-CO')}</strong>) moneda legal, más los intereses señalados en la cláusula tercera de este documento.</p>

  <h2>CLÁUSULA SEGUNDA — PLAZO</h2>
  <p>Pagaremos la suma indicada en la cláusula anterior mediante <strong>cuotas mensuales sucesivas</strong> correspondientes cada una a la cantidad de <span class="dato">${enPesos(cuota)}</span> pesos (<strong>$${Math.round(cuota).toLocaleString('es-CO')}</strong>) moneda legal.</p>
  <p>El primer pago se efectuará el día <span class="dato">${fechaPago1}</span>; y las demás cuotas serán canceladas a más tardar los días <span class="dato">${diaPago}</span> (<span class="dato">${numToWords(diaPago)}</span>) de cada mes.</p>

  <h2>CLÁUSULA TERCERA — INTERESES</h2>
  <p>El Deudor reconocerá y pagará sobre el saldo insoluto de capital una tasa de interés del <span class="dato">${loan.interest_rate_monthly ?? loan.nominal_rate_mv ?? '__'}%</span> mensual vencido (<span class="dato">${numToWords(loan.interest_rate_monthly ?? loan.nominal_rate_mv ?? 0)} POR CIENTO</span> mensual vencido).</p>
  <p>En caso de mora, el Deudor reconocerá intereses moratorios a la tasa máxima legal permitida vigente certificada por la Superintendencia Financiera de Colombia.</p>

  <h2>CLÁUSULA CUARTA — EXIGIBILIDAD</h2>
  <p>El presente Pagaré será exigible en su totalidad en caso de: (i) incumplimiento en el pago de cualquier cuota; (ii) declaratoria de insolvencia del Deudor; (iii) cualquier otra causal de aceleración prevista en la ley.</p>

  <h2>CLÁUSULA QUINTA — MÉRITO EJECUTIVO</h2>
  <p>El presente Pagaré presta mérito ejecutivo de conformidad con lo establecido en el artículo 488 del Código General del Proceso y las normas concordantes del Código de Comercio.</p>

  <div class="firma-grid">
    <div class="firma-box">
      <div class="firma-line">
        <strong>DEUDOR</strong><br/>
        Nombre: ${loan.client_name}<br/>
        C.C. No. ${loan.client_id_number}
      </div>
    </div>
    <div class="firma-box">
      <div class="firma-line">
        <strong>CODEUDOR SOLIDARIO</strong><br/>
        Nombre: _______________________<br/>
        C.C. No. ___________
      </div>
    </div>
  </div>

  <div class="aprobacion" style="margin-top:40px;">
    <strong>Aprobó:</strong> ______________________________<br/>
    Somos Simbiosis S.A.S. — N.I.T. 901.276.516-1
  </div>
</div>

<!-- DOCUMENTO 2: CARTA DE INSTRUCCIONES -->
<div class="page">
  <div class="header">
    <div class="logo">SOMOS SIMBIOSIS S.A.S.</div>
    <div class="nit">N.I.T. 901.276.516-1</div>
  </div>
  <h1>CARTA DE INSTRUCCIONES ANEXA A PAGARÉ No. ${loan.loan_number || '___'}<br/>CON ESPACIOS EN BLANCO</h1>

  <p>Nosotros, <span class="dato">${loan.client_name}</span>, identificado con cédula No. <span class="dato">${loan.client_id_number}</span>, correo electrónico <span class="dato">${email || '[COMPLETAR]'}</span>, teléfono celular No. (+57) <span class="dato">${phone || '[COMPLETAR]'}</span> (en adelante, el <strong>"Deudor"</strong>) y, <span class="dato">[NOMBRE CODEUDOR]</span>, identificado con cédula No. <span class="dato">[C.C. CODEUDOR]</span> (en adelante, el <strong>"Codeudor Solidario"</strong>), autorizamos a <strong>SOMOS SIMBIOSIS S.A.S.</strong>, representada legalmente por el señor <strong>ANDRES LEONARDO CASTAÑEDA LOZANO</strong>, identificado con la cédula de ciudadanía No. 80.220.919 de Bogotá D.C., para que, haciendo uso de las facultades conferidas por el artículo 622 del Código de Comercio, llene los espacios que se han dejado en blanco en el Pagaré Nº <span class="dato">${loan.loan_number || '___'}</span>, de acuerdo con las siguientes instrucciones:</p>

  <p><strong>PRIMERA:</strong> El monto será igual al valor de todas las obligaciones exigibles que a cargo nuestro y en favor de SOMOS SIMBIOSIS S.A.S. existan al momento de ser llenados los espacios, el cual no podrá superar la suma de <span class="dato">${enPesos(monto)}</span> (<strong>$${Math.round(monto).toLocaleString('es-CO')}</strong>) moneda legal.</p>

  <p><strong>SEGUNDA:</strong> El Pagaré será llenado de acuerdo con estas instrucciones, si después de vencido el plazo o ante retrasos en el pago de las cuotas, los excedentes no han sido pagados en su totalidad o por el saldo en caso de que se haya hecho algún abono.</p>

  <p><strong>TERCERA:</strong> La fecha de exigibilidad será la correspondiente al incumplimiento de cualquiera de las obligaciones pactadas.</p>

  <div class="firma-grid">
    <div class="firma-box">
      <div class="firma-line">
        <strong>DEUDOR</strong><br/>
        Nombre: ${loan.client_name}<br/>
        C.C. No. ${loan.client_id_number}
      </div>
    </div>
    <div class="firma-box">
      <div class="firma-line">
        <strong>CODEUDOR SOLIDARIO</strong><br/>
        Nombre: _______________________<br/>
        C.C. No. ___________
      </div>
    </div>
  </div>
</div>

<!-- DOCUMENTO 3: AUTORIZACIÓN DATOS PERSONALES -->
<div class="page">
  <div class="header">
    <div class="logo">SOMOS SIMBIOSIS S.A.S.</div>
    <div class="nit">N.I.T. 901.276.516-1</div>
  </div>
  <h1>FORMATO DE AUTORIZACIÓN DE USO DE MATERIAL FOTOGRÁFICO,<br/>DOCUMENTACIÓN Y DATOS PERSONALES</h1>

  <p>Yo, <span class="dato">${loan.client_name}</span>, mayor de edad, identificado(a) con C.C. No. <span class="dato">${loan.client_id_number}</span>, suscribo mi consentimiento expreso a <strong>SOMOS SIMBIOSIS S.A.S.</strong>, para que utilice las imágenes, información personal, información sensible y documentos donde yo figure; las cuales se regirán por las normas legales aplicables y sujetas a las siguientes:</p>

  <h2>CLÁUSULAS</h2>
  <p><strong>PRIMERA — AUTORIZACIÓN:</strong> Mediante el presente documento autorizo la utilización de los derechos de imagen sobre fotografías y/o documentación requerida de carácter personal y sensible a SOMOS SIMBIOSIS S.A.S., para realizar todos y cada uno de los trámites necesarios para la suscripción del Pagaré No. <span class="dato">${loan.loan_number || '___'}</span>.</p>

  <p><strong>SEGUNDA — FINALIDAD:</strong> Los datos personales serán utilizados únicamente para: (i) verificación de identidad; (ii) análisis de crédito; (iii) gestión del contrato de crédito; (iv) cumplimiento de obligaciones legales y regulatorias.</p>

  <p><strong>TERCERA — DERECHOS:</strong> El titular de los datos podrá ejercer los derechos de acceso, corrección, supresión, revocación y portabilidad de sus datos personales, comunicándose con SOMOS SIMBIOSIS S.A.S. al correo electrónico de atención al cliente.</p>

  <p><strong>CUARTA — VIGENCIA:</strong> La presente autorización tiene vigencia desde la fecha de suscripción y durante todo el término de la relación contractual, y hasta cinco (5) años después de la terminación de la misma.</p>

  <p><strong>PARÁGRAFO:</strong> Tal uso se realizará por parte de SOMOS SIMBIOSIS S.A.S. para efectos de la suscripción del Pagaré No. <span class="dato">${loan.loan_number || '___'}</span>, junto con sus anexos.</p>

  <div class="firma-grid">
    <div class="firma-box">
      <div class="firma-line">
        <strong>AUTORIZANTE</strong><br/>
        Nombre: ${loan.client_name}<br/>
        C.C. No. ${loan.client_id_number}
      </div>
    </div>
    <div class="firma-box">
      <div class="firma-line">
        <strong>SOMOS SIMBIOSIS S.A.S.</strong><br/>
        Representante Legal<br/>
        Andrés Castañeda — C.C. 80.220.919
      </div>
    </div>
  </div>

  <p style="margin-top:24px;font-size:10px;color:#6b7280;text-align:center;">
    Documento generado el ${fecha} — Pagaré No. ${loan.loan_number || '___'} — Somos Simbiosis S.A.S.
  </p>
</div>

</body></html>`;

      const w = window.open('', '_blank', 'width=900,height=800');
      if (w) { w.document.write(html); w.document.close(); }

    } catch (err: any) {
      alert('Error generando el pagaré: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generar}
      disabled={generating}
      className="text-purple-400 hover:text-white px-3 py-1.5 bg-purple-900/20 hover:bg-purple-600 rounded-lg text-sm border border-purple-900/50 transition-colors flex items-center gap-1 disabled:opacity-50"
    >
      <FileText size={14} /> {generating ? 'Generando...' : 'Pagaré'}
    </button>
  );
}