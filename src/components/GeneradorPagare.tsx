import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText } from 'lucide-react';

const ones = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIUNO','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
const tens = ['','DIEZ','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
const hundreds = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];

function numToWords(num: number): string {
  if (num === 0) return 'CERO';
  let n = Math.round(num); let r = '';
  if (n >= 1000000) { const m = Math.floor(n/1000000); r += m===1?'UN MILLÓN':numToWords(m)+' MILLONES'; n%=1000000; if(n>0)r+=' '; }
  if (n >= 1000) { const t = Math.floor(n/1000); r += t===1?'MIL':numToWords(t)+' MIL'; n%=1000; if(n>0)r+=' '; }
  if (n >= 100) { if(n===100){r+='CIEN';n=0;}else{r+=hundreds[Math.floor(n/100)];n%=100;if(n>0)r+=' ';} }
  if (n > 0) { if(n<30)r+=ones[n]; else{r+=tens[Math.floor(n/10)];if(n%10>0)r+=' Y '+ones[n%10];} }
  return r.trim();
}
function enPesos(amount: number): string { return numToWords(Math.round(amount))+' PESOS MONEDA CORRIENTE (M/CTE)'; }
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export default function GeneradorPagare({ loan, installments }: { loan: any; installments: any[] }) {
  const [generating, setGenerating] = useState(false);

  const generar = async () => {
    setGenerating(true);
    try {
      let phone = loan.client_phone || '';
      let email = '';
      const { data: apps } = await supabase.from('credit_applications').select('phone,email').eq('id_number', loan.client_id_number).order('created_at',{ascending:false}).limit(1);
      if (apps && apps.length > 0) { if (!phone) phone = apps[0].phone||''; email = apps[0].email||''; }

      const monto = Number(loan.principal_amount || loan.loan_amount);
      const cuota = Number(loan.fixed_quota_amount);
      const tasaMV = Number(loan.interest_rate_monthly ?? loan.nominal_rate_mv ?? 0);
      const tasaEA = (((1 + tasaMV/100)**12) - 1) * 100;
      const hoy = new Date();
      const primerasCuotas = [...installments].filter(i=>i.status!=='PAID_EARLY').sort((a,b)=>a.installment_number-b.installment_number);
      const primeraCuota = primerasCuotas[0];
      const fechaPrimerPago = primeraCuota ? new Date(primeraCuota.expected_payment_date) : hoy;
      const diaPago = fechaPrimerPago.getDate();
      const fecha = `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;
      const fechaPago1 = `${fechaPrimerPago.getDate()} de ${MESES[fechaPrimerPago.getMonth()]} de ${fechaPrimerPago.getFullYear()}`;
      const numCuotas = primerasCuotas.length;

      const css = `*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Times New Roman',serif;font-size:12px;color:#000;padding:40px 60px;line-height:1.7;}
      .page{page-break-after:always;padding-bottom:40px;}.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #059669;padding-bottom:12px;}
      .logo{font-size:22px;font-weight:bold;color:#059669;}.nit{font-size:11px;color:#374151;}
      h1{font-size:15px;font-weight:bold;text-align:center;margin:16px 0;text-decoration:underline;text-transform:uppercase;}
      h2{font-size:12px;font-weight:bold;margin:14px 0 6px;text-transform:uppercase;}
      p{margin-bottom:10px;text-align:justify;}.dato{font-weight:bold;text-decoration:underline;}
      .firma-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:50px;}
      .firma-box{text-align:center;}.firma-line{border-top:1px solid #000;margin-top:70px;padding-top:6px;font-size:11px;}
      .aprobacion{margin-top:28px;border:1px solid #000;padding:14px;text-align:center;}
      table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px;}td,th{border:1px solid #000;padding:6px 8px;}th{background:#f3f4f6;font-weight:bold;}
      .form-table td{padding:8px;border:1px solid #ccc;}
      @media print{body{padding:20px 40px;}button{display:none!important;}}`;

      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
      <title>Pagaré No. ${loan.loan_number} — ${loan.client_name}</title><style>${css}</style></head><body>
      <button onclick="window.print()" style="position:fixed;top:12px;right:12px;padding:8px 18px;background:#059669;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;z-index:999;">🖨 Imprimir / PDF</button>

      <!-- PAGARÉ -->
      <div class="page">
        <div class="header"><div class="logo">SOMOS SIMBIOSIS S.A.S.</div><div class="nit">N.I.T. 901.276.516-1</div></div>
        <h1>PAGARÉ No. ${loan.loan_number||'___'}</h1>

        <p><strong>Lugar y fecha:</strong> Bogotá D.C., <span class="dato">${fecha}</span></p>
        <p><strong>Valor:</strong> <span class="dato">${enPesos(monto)}</span> (<strong>$${Math.round(monto).toLocaleString('es-CO')}</strong>) moneda legal</p>
        <p><strong>Ciudad y dirección de pago:</strong> Bogotá D.C.</p>

        <p>Nosotros, <span class="dato">${loan.client_name}</span>, mayor de edad, domiciliado en Bogotá D.C., identificado con C.C. No. <span class="dato">${loan.client_id_number}</span>, correo <span class="dato">${email||'[COMPLETAR EMAIL]'}</span>, teléfono (+57) <span class="dato">${phone||'[COMPLETAR TELÉFONO]'}</span> (el <strong>"Deudor"</strong>) y <span class="dato">[NOMBRE CODEUDOR]</span>, identificado con C.C. No. <span class="dato">[C.C. CODEUDOR]</span>, correo <span class="dato">[EMAIL CODEUDOR]</span>, teléfono (+57) <span class="dato">[TEL. CODEUDOR]</span> (el <strong>"Codeudor Solidario"</strong>), suscribimos el Pagaré No. <span class="dato">${loan.loan_number||'___'}</span> junto con sus anexos.</p>

        <h2>Primera — Objeto</h2>
        <p>Por virtud del presente título valor, pagaremos incondicionalmente a la orden de <strong>SOMOS SIMBIOSIS S.A.S.</strong>, N.I.T. 901.276.516-1, representada por <strong>ANDRES LEONARDO CASTAÑEDA LOZANO</strong>, C.C. 80.220.919 de Bogotá D.C., o a quien represente sus derechos, la suma de <span class="dato">${enPesos(monto)}</span> (<strong>$${Math.round(monto).toLocaleString('es-CO')}</strong>) moneda legal, más los intereses señalados en la cláusula tercera.</p>

        <h2>Segunda — Plazo</h2>
        <p>Pagaremos la suma indicada mediante <span class="dato">${numCuotas} (${numToWords(numCuotas)})</span> cuotas mensuales sucesivas de <span class="dato">${enPesos(cuota)}</span> (<strong>$${Math.round(cuota).toLocaleString('es-CO')}</strong>) moneda legal cada una.</p>
        <p>El primer pago se efectuará el día <span class="dato">${fechaPago1}</span>; y las demás cuotas serán canceladas a más tardar los días <span class="dato">${diaPago} (${numToWords(diaPago)})</span> de cada mes.</p>

        <h2>Tercera — Intereses</h2>
        <p>Sobre la suma debida, reconoceremos intereses de plazo equivalentes al <span class="dato">${tasaEA.toFixed(2)}% efectivo anual (${tasaEA.toFixed(2)}% E.A.)</span>, equivalente al <span class="dato">${tasaMV}% mensual vencido (${tasaMV}% M.V.)</span>, sobre el capital o su saldo insoluto.</p>
        <p>En caso de mora, reconoceremos intereses iguales a la tasa máxima autorizada por la Superintendencia Financiera de Colombia. A partir de la fecha de la respectiva demanda judicial, sobre los intereses pendientes debidos con un (1) año de anterioridad o más, pagaremos intereses a la máxima tasa fijada para la mora.</p>
        <p>En caso de cobro judicial o extrajudicial de este pagaré, serán de nuestra cuenta los gastos y costas que se ocasionen, incluyendo honorarios de abogados y comisiones por concepto de seguros que se causen hasta el momento del pago.</p>

        <h2>Cuarta — Exigibilidad</h2>
        <p>Las obligaciones contenidas en este pagaré se entenderán de plazo vencido y serán exigibles en su totalidad cuando:</p>
        <p>(i) No se cumplan una cualquiera de las obligaciones derivadas del presente documento;</p>
        <p>(ii) Se inicien cualquier trámite de liquidación de alguno de los deudores, ya sea liquidación privada, judicial, obligatoria o administrativa, a menos que el otro o los otros deudores solidarios ofrezcan garantías suficientes a juicio de SOMOS SIMBIOSIS S.A.S.;</p>
        <p>(iii) Se presente cualquier otra causal de aceleración prevista en la ley o en los reglamentos aplicables.</p>

        <h2>Quinta — Firma Electrónica</h2>
        <p>Las Partes convienen suscribir este Pagaré mediante tecnologías de firma electrónica, reconociendo plena validez a su contenido, siendo este exigible y vinculante entre las Partes para todos los efectos legales. Este Pagaré será sellado por SOMOS SIMBIOSIS S.A.S. de conformidad con las instrucciones que en documento aparte hemos impartido, de conformidad con lo dispuesto en el artículo 622, inciso 2 del Código de Comercio.</p>
        <p>Con la suscripción del presente Pagaré, certificamos que la información y documentación brindada es cierta, legal y válida.</p>

        <div class="firma-grid">
          <div class="firma-box"><div class="firma-line"><strong>DEUDOR</strong><br/>Nombre: ${loan.client_name}<br/>C.C. No. ${loan.client_id_number}</div></div>
          <div class="firma-box"><div class="firma-line"><strong>CODEUDOR SOLIDARIO</strong><br/>Nombre: _______________________<br/>C.C. No. ___________</div></div>
        </div>
        <div class="aprobacion" style="margin-top:32px;">
          <strong>Aprobó:</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/>
          Somos Simbiosis S.A.S. — N.I.T. 901.276.516-1
        </div>
      </div>
${Number(loan.monthly_insurance||0) > 0 ? `
  <h2>Cuarta — Seguro</h2>
  <p>Adicionalmente, el Deudor reconocerá y pagará una prima mensual de seguro por valor de <span class="dato">${enPesos(Number(loan.monthly_insurance))}</span> (<strong>$${Math.round(Number(loan.monthly_insurance)).toLocaleString('es-CO')}</strong>) moneda legal, la cual se causará mensualmente de forma vencida junto con cada cuota. En caso de pago anticipado total antes de la fecha de vencimiento de la cuota correspondiente, no se causará el seguro del período en curso.</p>` : ''}
      <!-- CARTA DE INSTRUCCIONES -->
      <div class="page">
        <div class="header"><div class="logo">SOMOS SIMBIOSIS S.A.S.</div><div class="nit">N.I.T. 901.276.516-1</div></div>
        <h1>CARTA DE INSTRUCCIONES ANEXA A PAGARÉ No. ${loan.loan_number||'___'}<br/>CON ESPACIOS EN BLANCO</h1>

        <p>Nosotros, <span class="dato">${loan.client_name}</span>, C.C. No. <span class="dato">${loan.client_id_number}</span>, correo <span class="dato">${email||'[COMPLETAR]'}</span>, teléfono (+57) <span class="dato">${phone||'[COMPLETAR]'}</span> (el <strong>"Deudor"</strong>) y <span class="dato">[NOMBRE CODEUDOR]</span>, C.C. No. <span class="dato">[C.C. CODEUDOR]</span> (el <strong>"Codeudor Solidario"</strong>), autorizamos a <strong>SOMOS SIMBIOSIS S.A.S.</strong>, representada por <strong>ANDRES LEONARDO CASTAÑEDA LOZANO</strong>, C.C. 80.220.919 de Bogotá D.C., para que, haciendo uso de las facultades conferidas por el artículo 622 del Código de Comercio, llene los espacios del Pagaré Nº <span class="dato">${loan.loan_number||'___'}</span>, ciñéndose a las siguientes instrucciones:</p>

        <p><strong>PRIMERA:</strong> El monto será igual al valor de todas las obligaciones exigibles a cargo nuestro y en favor de SOMOS SIMBIOSIS S.A.S. al momento de ser llenados los espacios, el cual no podrá superar <span class="dato">${enPesos(monto)}</span> (<strong>$${Math.round(monto).toLocaleString('es-CO')}</strong>).</p>
        <p><strong>SEGUNDA:</strong> Intereses de plazo: <span class="dato">${tasaEA.toFixed(2)}% efectivo anual (${tasaEA.toFixed(2)}% E.A.)</span>, equivalente al <span class="dato">${tasaMV}% mensual vencido</span>.</p>
        <p><strong>TERCERA:</strong> Intereses de mora a la tasa máxima permitida por las autoridades monetarias.</p>
        <p><strong>CUARTA:</strong> El pagaré será llenado si después de vencido el plazo o ante retrasos en el pago de las cuotas, los excedentes no han sido pagados en su totalidad o por el saldo en caso de que se haya hecho algún abono.</p>
        <p><strong>QUINTA:</strong> La fecha de exigibilidad será la correspondiente al incumplimiento de cualquiera de las obligaciones pactadas.</p>

        <div class="firma-grid">
          <div class="firma-box"><div class="firma-line"><strong>DEUDOR</strong><br/>Nombre: ${loan.client_name}<br/>C.C. No. ${loan.client_id_number}</div></div>
          <div class="firma-box"><div class="firma-line"><strong>CODEUDOR SOLIDARIO</strong><br/>Nombre: _______________________<br/>C.C. No. ___________</div></div>
        </div>
      </div>

      <!-- AUTORIZACIÓN DE DATOS -->
      <div class="page">
        <div class="header"><div class="logo">SOMOS SIMBIOSIS S.A.S.</div><div class="nit">N.I.T. 901.276.516-1</div></div>
        <h1>FORMATO DE AUTORIZACIÓN DE USO DE MATERIAL FOTOGRÁFICO,<br/>DOCUMENTACIÓN Y DATOS PERSONALES</h1>

        <p>Yo, <span class="dato">${loan.client_name}</span>, identificado(a) con C.C. No. <span class="dato">${loan.client_id_number}</span>, suscribo mi consentimiento expreso a <strong>SOMOS SIMBIOSIS S.A.S.</strong> para que utilice las imágenes, información personal, información sensible y documentos donde yo figure, bajo las siguientes cláusulas:</p>

        <h2>Primera — Autorización</h2>
        <p>Autorizo la utilización de los derechos de imagen sobre fotografías y/o documentación de carácter personal y sensible a SOMOS SIMBIOSIS S.A.S., para realizar todos los trámites necesarios para la suscripción del Pagaré No. <span class="dato">${loan.loan_number||'___'}</span>.</p>

        <h2>Segunda — Finalidad</h2>
        <p>Los datos personales serán utilizados únicamente para: (i) verificación de identidad; (ii) análisis de crédito; (iii) gestión del contrato; (iv) cumplimiento de obligaciones legales. En caso de venta de cartera o cesión, los efectos de esta autorización se extenderán al nuevo acreedor en los mismos términos.</p>

        <h2>Tercera — Autorización Central de Riesgos</h2>
        <p>Doy mi consentimiento expreso e irrevocable a SOMOS SIMBIOSIS S.A.S. o a quien sea en el futuro el acreedor del crédito, para:</p>
        <p>(i) Consultar, en cualquier tiempo, en las centrales de riesgo toda la información relevante para conocer mi desempeño como deudor, mi capacidad de pago o para valorar el riesgo futuro de concederme crédito;</p>
        <p>(ii) Reportar a las centrales de riesgo la información relacionada con el cumplimiento o incumplimiento de mis obligaciones crediticias.</p>

        <h2>Cuarta — Vigencia</h2>
        <p>La presente autorización tiene vigencia desde la fecha de suscripción durante todo el término de la relación contractual y hasta cinco (5) años después de su terminación.</p>

        <h2>Datos del Suscriptor</h2>
        <table class="form-table">
          <tr><td style="width:40%;background:#f9fafb;font-weight:bold;">Nombre completo</td><td>${loan.client_name}</td></tr>
          <tr><td style="background:#f9fafb;font-weight:bold;">Cédula de ciudadanía</td><td>${loan.client_id_number}</td></tr>
          <tr><td style="background:#f9fafb;font-weight:bold;">Estado civil</td><td>[COMPLETAR]</td></tr>
          <tr><td style="background:#f9fafb;font-weight:bold;">Dirección</td><td>[COMPLETAR]</td></tr>
          <tr><td style="background:#f9fafb;font-weight:bold;">Ciudad</td><td>Bogotá D.C.</td></tr>
          <tr><td style="background:#f9fafb;font-weight:bold;">Teléfono</td><td>${phone||'[COMPLETAR]'}</td></tr>
          <tr><td style="background:#f9fafb;font-weight:bold;">Correo electrónico</td><td>${email||'[COMPLETAR]'}</td></tr>
          <tr><td style="background:#f9fafb;font-weight:bold;">Profesión u Oficio</td><td>[COMPLETAR]</td></tr>
        </table>

        <p style="margin-top:16px;">Declaro que la información que he suministrado es verídica y autorizo expresamente su uso en los términos descritos.</p>

        <div class="firma-grid">
          <div class="firma-box"><div class="firma-line"><strong>AUTORIZANTE</strong><br/>Nombre: ${loan.client_name}<br/>C.C. No. ${loan.client_id_number}</div></div>
          <div class="firma-box"><div class="firma-line"><strong>SOMOS SIMBIOSIS S.A.S.</strong><br/>Representante Legal<br/>Andrés Castañeda — C.C. 80.220.919</div></div>
        </div>

        <p style="margin-top:24px;font-size:10px;color:#6b7280;text-align:center;">
          Documento generado el ${fecha} — Pagaré No. ${loan.loan_number||'___'} — Somos Simbiosis S.A.S. N.I.T. 901.276.516-1
        </p>
      </div>

      </body></html>`;

      const w = window.open('', '_blank', 'width=950,height=850');
      if (w) { w.document.write(html); w.document.close(); }
    } catch (err: any) {
      alert('Error generando el pagaré: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button onClick={generar} disabled={generating}
      className="text-purple-400 hover:text-white px-3 py-1.5 bg-purple-900/20 hover:bg-purple-600 rounded-lg text-sm border border-purple-900/50 transition-colors flex items-center gap-1 disabled:opacity-50">
      <FileText size={14} /> {generating ? 'Generando...' : 'Pagaré'}
    </button>
  );
}