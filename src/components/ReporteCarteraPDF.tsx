import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileDown } from 'lucide-react';

interface Inversion {
  patrimonioPropio: number;
  prestamo1Nombre: string;
  prestamo1Monto: number;
  prestamo2Nombre: string;
  prestamo2Monto: number;
}

const fmt = (val: number) => '$ ' + Math.round(val).toLocaleString('es-CO');
const pct = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';

export default function ReporteCarteraPDF() {
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [inversion, setInversion] = useState<Inversion>({
    patrimonioPropio: 0,
    prestamo1Nombre: '',
    prestamo1Monto: 0,
    prestamo2Nombre: '',
    prestamo2Monto: 0,
  });

  const totalInvertido = inversion.patrimonioPropio + inversion.prestamo1Monto + inversion.prestamo2Monto;

  const generarReporte = async () => {
    if (totalInvertido <= 0) { alert('Ingresa el capital invertido.'); return; }
    setGenerating(true);

    try {
      const [loansRes, instRes] = await Promise.all([
        supabase.from('active_loans').select('*'),
        supabase.from('loan_installments').select('*'),
      ]);

      const loans = loansRes.data || [];
      const installments = instRes.data || [];
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const fechaCorte = hoy.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

      // ── MÉTRICAS BASE ─────────────────────────────────────────────────────
      const getLoanBalance = (loanId: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return 0;
        const principal = Number(loan.principal_amount || loan.loan_amount) + Number(loan.associated_costs || loan.origination_costs || 0);
        const paid = installments.filter(i => i.loan_id === loanId && (i.status === 'PAID' || i.status === 'LATE')).reduce((s, i) => s + Number(i.principal_portion), 0);
        return Math.max(principal - paid, 0);
      };

      const capitalColocado = loans.reduce((s, l) => s + Number(l.principal_amount || l.loan_amount) + Number(l.associated_costs || l.origination_costs || 0), 0);
      const capitalRecuperado = installments.filter(i => i.status === 'PAID' || i.status === 'LATE').reduce((s, i) => s + Number(i.principal_portion), 0);
      const capitalEnCartera = Math.max(capitalColocado - capitalRecuperado, 0);
      const interesesCobrados = installments.filter(i => i.status === 'PAID' || i.status === 'LATE').reduce((s, i) => s + Number(i.interest_portion), 0);
      const morasCobradas = installments.filter(i => i.status === 'PAID' || i.status === 'LATE').reduce((s, i) => s + Number(i.late_fee_charged || 0), 0);
      const retornoTotal = interesesCobrados + morasCobradas;

      // TEA
      const primerDesembolso = loans.reduce((min, l) => {
        const f = new Date(l.disbursement_date).getTime();
        return f < min ? f : min;
      }, Date.now());
      const mesesOperando = Math.max(1, Math.round((hoy.getTime() - primerDesembolso) / (1000 * 60 * 60 * 24 * 30)));
      const tea = totalInvertido > 0 ? ((Math.pow(1 + retornoTotal / totalInvertido, 12 / mesesOperando) - 1) * 100) : 0;

      // ── PROYECCIÓN POR AÑO ────────────────────────────────────────────────
      const proyAnual: { [year: string]: { capital: number; intereses: number; total: number; cuotas: number } } = {};
      installments.filter(i => i.status === 'PENDING').forEach(i => {
        const year = new Date(i.expected_payment_date).getFullYear().toString();
        if (!proyAnual[year]) proyAnual[year] = { capital: 0, intereses: 0, total: 0, cuotas: 0 };
        proyAnual[year].capital += Number(i.principal_portion);
        proyAnual[year].intereses += Number(i.interest_portion);
        proyAnual[year].total += Number(i.expected_amount);
        proyAnual[year].cuotas += 1;
      });

      let acumuladoCapital = capitalRecuperado;
      const filasProyAnual = Object.keys(proyAnual).sort().map(year => {
        acumuladoCapital += proyAnual[year].capital;
        const pctRecuperado = pct(acumuladoCapital, totalInvertido);
        return `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 8px;font-weight:bold;color:#111827;">${year}</td>
            <td style="padding:10px 8px;text-align:right;">${proyAnual[year].cuotas} cuotas</td>
            <td style="padding:10px 8px;text-align:right;font-weight:bold;">$ ${Math.round(proyAnual[year].capital).toLocaleString('es-CO')}</td>
            <td style="padding:10px 8px;text-align:right;color:#d97706;">$ ${Math.round(proyAnual[year].intereses).toLocaleString('es-CO')}</td>
            <td style="padding:10px 8px;text-align:right;font-weight:bold;color:#059669;">$ ${Math.round(proyAnual[year].total).toLocaleString('es-CO')}</td>
            <td style="padding:10px 8px;text-align:right;">$ ${Math.round(acumuladoCapital).toLocaleString('es-CO')}</td>
            <td style="padding:10px 8px;text-align:center;font-weight:bold;color:${acumuladoCapital >= totalInvertido ? '#059669' : '#6b7280'};">${pctRecuperado}</td>
          </tr>`;
      }).join('');

      // ── AGING ─────────────────────────────────────────────────────────────
      const agingBuckets = [
        { label: 'Al día', min: 0, max: 0, color: '#059669' },
        { label: '1 – 30 días', min: 1, max: 30, color: '#d97706' },
        { label: '31 – 60 días', min: 31, max: 60, color: '#ea580c' },
        { label: '61 – 90 días', min: 61, max: 90, color: '#dc2626' },
        { label: '> 90 días', min: 91, max: Infinity, color: '#9f1239' },
      ];

      const loanDays = loans.map(loan => {
        const pending = installments.filter(i => i.loan_id === loan.id && i.status === 'PENDING');
        let maxDays = 0;
        pending.forEach(i => {
          const f = new Date(i.expected_payment_date); f.setHours(0, 0, 0, 0);
          if (f < hoy) maxDays = Math.max(maxDays, Math.floor((hoy.getTime() - f.getTime()) / 86400000));
        });
        return { loan, balance: getLoanBalance(loan.id), maxDays };
      });

      const filasAging = agingBuckets.map(b => {
        const inBucket = loanDays.filter(({ maxDays }) => b.max === 0 ? maxDays === 0 : maxDays >= b.min && maxDays <= b.max);
        const saldo = inBucket.reduce((s, { balance }) => s + balance, 0);
        const totalCartera = loans
  .filter(l => getLoanBalance(l.id) > 0)  // solo créditos con saldo pendiente
  .reduce((s, l) => s + getLoanBalance(l.id), 0);
        return `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 8px;font-weight:bold;color:${b.color};">${b.label}</td>
            <td style="padding:10px 8px;text-align:center;">${inBucket.length}</td>
            <td style="padding:10px 8px;text-align:right;font-weight:bold;">$ ${Math.round(saldo).toLocaleString('es-CO')}</td>
            <td style="padding:10px 8px;text-align:center;">${totalCartera > 0 ? ((saldo / totalCartera) * 100).toFixed(1) : '0'}%</td>
          </tr>`;
      }).join('');

      // ── DETALLE DE CRÉDITOS ───────────────────────────────────────────────
      const filasCreditios = loans.map(loan => {
        const loanInst = installments.filter(i => i.loan_id === loan.id);
        const pagadas = loanInst.filter(i => i.status === 'PAID' || i.status === 'LATE').length;
        const totales = loanInst.filter(i => i.status !== 'PAID_EARLY').length;
        const saldo = getLoanBalance(loan.id);
        const maxDays = loanDays.find(l => l.loan.id === loan.id)?.maxDays || 0;
        const estadoColor = maxDays === 0 ? '#059669' : maxDays <= 30 ? '#d97706' : '#dc2626';
        const estadoLabel = getLoanBalance(loan.id) === 0 ? 'Liquidado' : maxDays === 0 ? 'Al día' : `${maxDays} días mora`;
        return `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 6px;font-weight:bold;">${loan.client_name}</td>
            <td style="padding:8px 6px;">${loan.client_id_number || loan.client_id}</td>
            <td style="padding:8px 6px;text-align:right;">$ ${Number(loan.principal_amount || loan.loan_amount).toLocaleString('es-CO')}</td>
            <td style="padding:8px 6px;text-align:right;font-weight:bold;color:#dc2626;">$ ${Math.round(saldo).toLocaleString('es-CO')}</td>
            <td style="padding:8px 6px;text-align:center;">${pagadas}/${totales}</td>
            <td style="padding:8px 6px;text-align:center;">${loan.interest_rate_monthly ?? loan.nominal_rate_mv ?? '--'}%</td>
            <td style="padding:8px 6px;text-align:center;color:${estadoColor};font-weight:bold;">${estadoLabel}</td>
          </tr>`;
      }).join('');

      // ── HTML DEL REPORTE ──────────────────────────────────────────────────
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte de Cartera — Simbiosis</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:13px; color:#111827; background:white; }
    .page { padding:40px 48px; min-height:100vh; page-break-after:always; }
    .cover { background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#064e3b 100%); color:white; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
    .logo-text { font-size:52px; font-weight:900; background:linear-gradient(to right,#ef4444,#f97316,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .logo-sub { font-size:14px; color:#94a3b8; letter-spacing:3px; margin-top:4px; }
    .cover h1 { font-size:32px; font-weight:bold; margin-top:48px; color:white; }
    .cover .fecha { font-size:16px; color:#94a3b8; margin-top:12px; }
    .cover .confidencial { margin-top:48px; padding:12px 24px; border:1px solid #374151; border-radius:8px; font-size:11px; color:#64748b; }
    h2 { font-size:18px; font-weight:bold; color:#111827; border-bottom:3px solid #059669; padding-bottom:8px; margin-bottom:20px; }
    h3 { font-size:14px; font-weight:bold; color:#374151; margin:20px 0 10px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
    .kpi { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:16px; }
    .kpi-label { font-size:10px; text-transform:uppercase; color:#6b7280; margin-bottom:6px; letter-spacing:0.5px; }
    .kpi-value { font-size:18px; font-weight:bold; color:#111827; }
    .kpi-value.green { color:#059669; }
    .kpi-value.red { color:#dc2626; }
    .kpi-value.amber { color:#d97706; }
    .inversion-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
    .inv-card { border-radius:10px; padding:16px; border:1px solid; }
    table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:24px; }
    thead { background:#059669; color:white; }
    th { padding:10px 8px; text-align:right; white-space:nowrap; font-weight:600; }
    th:first-child { text-align:left; }
    tbody tr:nth-child(even) { background:#f9fafb; }
    .section-note { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 16px; font-size:11px; color:#92400e; margin-bottom:16px; }
    .footer { border-top:1px solid #e5e7eb; padding:12px 0; font-size:10px; color:#9ca3af; text-align:center; margin-top:24px; }
    .recovery-bar { background:#e5e7eb; border-radius:4px; height:12px; margin-top:4px; overflow:hidden; }
    .recovery-fill { background:linear-gradient(to right,#059669,#10b981); height:100%; border-radius:4px; }
    @media print { .page { padding:24px 32px; } button { display:none !important; } }
  </style>
</head>
<body>

<!-- PORTADA -->
<div class="page cover">
  <div class="logo-text">SIMBIOSIS</div>
  <div class="logo-sub">conoce, invierte, crece</div>
  <h1>Reporte de Cartera de Crédito</h1>
  <p class="fecha">Fecha de corte: ${fechaCorte}</p>
  <p style="color:#94a3b8;margin-top:8px;">Informe para accionistas — Uso interno</p>
  <div class="confidencial">⚠ DOCUMENTO CONFIDENCIAL — Solo para uso del propietario y auditores autorizados</div>
  <button onclick="window.print()" style="margin-top:48px;padding:12px 32px;background:#059669;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">
    🖨 Imprimir / Guardar PDF
  </button>
</div>

<!-- RESUMEN EJECUTIVO -->
<div class="page">
  <h2>1. Resumen Ejecutivo</h2>

  <h3>Capital e Inversión</h3>
  <div class="inversion-grid">
    <div class="inv-card" style="background:#f0fdf4;border-color:#bbf7d0;">
      <div class="kpi-label">Patrimonio Propio</div>
      <div class="kpi-value green">$ ${Math.round(inversion.patrimonioPropio).toLocaleString('es-CO')}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:4px;">${pct(inversion.patrimonioPropio, totalInvertido)} del total</div>
    </div>
    ${inversion.prestamo1Monto > 0 ? `
    <div class="inv-card" style="background:#eff6ff;border-color:#bfdbfe;">
      <div class="kpi-label">Préstamo — ${inversion.prestamo1Nombre || 'Persona 1'}</div>
      <div class="kpi-value" style="color:#1d4ed8;">$ ${Math.round(inversion.prestamo1Monto).toLocaleString('es-CO')}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:4px;">${pct(inversion.prestamo1Monto, totalInvertido)} del total</div>
    </div>` : ''}
    ${inversion.prestamo2Monto > 0 ? `
    <div class="inv-card" style="background:#faf5ff;border-color:#e9d5ff;">
      <div class="kpi-label">Préstamo — ${inversion.prestamo2Nombre || 'Persona 2'}</div>
      <div class="kpi-value" style="color:#7c3aed;">$ ${Math.round(inversion.prestamo2Monto).toLocaleString('es-CO')}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:4px;">${pct(inversion.prestamo2Monto, totalInvertido)} del total</div>
    </div>` : ''}
    <div class="inv-card" style="background:#111827;border-color:#374151;">
      <div class="kpi-label" style="color:#94a3b8;">TOTAL INVERTIDO</div>
      <div class="kpi-value" style="color:white;font-size:20px;">$ ${Math.round(totalInvertido).toLocaleString('es-CO')}</div>
    </div>
  </div>

  <h3>Indicadores de la Cartera</h3>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Créditos Activos</div>
      <div class="kpi-value">${loans.length}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Capital Colocado</div>
      <div class="kpi-value">$ ${Math.round(capitalColocado).toLocaleString('es-CO')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Capital Recuperado</div>
      <div class="kpi-value green">$ ${Math.round(capitalRecuperado).toLocaleString('es-CO')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Capital en Cartera</div>
      <div class="kpi-value amber">$ ${Math.round(capitalEnCartera).toLocaleString('es-CO')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Intereses Cobrados</div>
      <div class="kpi-value green">$ ${Math.round(interesesCobrados).toLocaleString('es-CO')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Moras Cobradas</div>
      <div class="kpi-value amber">$ ${Math.round(morasCobradas).toLocaleString('es-CO')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Retorno Total Recibido</div>
      <div class="kpi-value green">$ ${Math.round(retornoTotal).toLocaleString('es-CO')}</div>
    </div>
    <div class="kpi" style="background:#f0fdf4;border-color:#bbf7d0;">
      <div class="kpi-label">TEA Estimada</div>
      <div class="kpi-value green">${tea.toFixed(2)}%</div>
      <div style="font-size:10px;color:#6b7280;margin-top:2px;">en ${mesesOperando} meses operando</div>
    </div>
  </div>

  <h3>Recuperación de la Inversión</h3>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:12px;color:#374151;font-weight:bold;">Capital recuperado hasta hoy</span>
      <span style="font-size:12px;font-weight:bold;color:#059669;">${pct(capitalRecuperado, totalInvertido)}</span>
    </div>
    <div class="recovery-bar">
      <div class="recovery-fill" style="width:${Math.min((capitalRecuperado / totalInvertido) * 100, 100).toFixed(1)}%;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:#9ca3af;">
      <span>$ 0</span>
      <span>$ ${Math.round(capitalRecuperado).toLocaleString('es-CO')} recuperados</span>
      <span>$ ${Math.round(totalInvertido).toLocaleString('es-CO')}</span>
    </div>
  </div>

  <div class="footer">Simbiosis Loan Management System — Reporte generado el ${fechaCorte}</div>
</div>

<!-- PROYECCIÓN ANUAL -->
<div class="page">
  <h2>2. Proyección de Recaudo por Año</h2>
  <div class="section-note">
    Esta proyección muestra cuánto capital e intereses se espera recuperar cada año, basado en el plan de pagos de los créditos activos. No incluye nuevos créditos que se coloquen en el futuro.
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Año</th>
        <th>Cuotas</th>
        <th>Capital a Recuperar</th>
        <th>Intereses a Cobrar</th>
        <th>Total Recaudo</th>
        <th>Capital Acumulado</th>
        <th>% Inversión Recuperada</th>
      </tr>
    </thead>
    <tbody>${filasProyAnual}</tbody>
  </table>

  <h3>Resumen de Recuperación</h3>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Capital ya recuperado</div>
      <div class="kpi-value green">$ ${Math.round(capitalRecuperado).toLocaleString('es-CO')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Capital pendiente en cartera</div>
      <div class="kpi-value amber">$ ${Math.round(capitalEnCartera).toLocaleString('es-CO')}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Intereses proyectados</div>
      <div class="kpi-value green">$ ${Math.round(Object.values(proyAnual).reduce((s, v) => s + v.intereses, 0)).toLocaleString('es-CO')}</div>
    </div>
    <div class="kpi" style="background:#f0fdf4;border-color:#bbf7d0;">
      <div class="kpi-label">Total proyectado a recibir</div>
      <div class="kpi-value green" style="font-size:16px;">$ ${Math.round(capitalEnCartera + Object.values(proyAnual).reduce((s, v) => s + v.intereses, 0)).toLocaleString('es-CO')}</div>
    </div>
  </div>

  <div class="footer">Simbiosis Loan Management System — Reporte generado el ${fechaCorte}</div>
</div>

<!-- AGING Y RIESGO -->
<div class="page">
  <h2>3. Análisis de Riesgo — Aging de Cartera</h2>
  <div class="section-note">
    El aging clasifica cada crédito según cuántos días lleva en mora su cuota más antigua sin pagar. Es el indicador principal de riesgo de la cartera.
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Categoría de Mora</th>
        <th>No. Créditos</th>
        <th>Saldo en Riesgo</th>
        <th>% de la Cartera</th>
      </tr>
    </thead>
    <tbody>${filasAging}</tbody>
  </table>

  <h2 style="margin-top:32px;">4. Detalle de Créditos Activos</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Cliente</th>
        <th style="text-align:left;">Identificación</th>
        <th>Monto Original</th>
        <th>Saldo Vigente</th>
        <th>Cuotas</th>
        <th>Tasa MV</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>${filasCreditios}</tbody>
  </table>

  <div class="footer">Simbiosis Loan Management System — Reporte generado el ${fechaCorte}</div>
</div>

</body>
</html>`;

      const ventana = window.open('', '_blank', 'width=1200,height=900');
      if (ventana) { ventana.document.write(html); ventana.document.close(); }

    } catch (err: any) {
      alert('Error generando el reporte: ' + err.message);
    } finally {
      setGenerating(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-emerald-600/50 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-700 text-sm font-medium transition-colors"
      >
        <FileDown size={16} /> Reporte para Inversores
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-white mb-2">📊 Generar Reporte de Cartera</h2>
            <p className="text-slate-400 text-sm mb-6">Ingresa el capital total que has invertido en Simbiosis</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-emerald-400 uppercase mb-1">Tu Patrimonio Propio</label>
                <input
                  type="number" min="0"
                  value={inversion.patrimonioPropio || ''}
                  onChange={e => setInversion(p => ({ ...p, patrimonioPropio: Number(e.target.value) }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                  placeholder="Ej: 50000000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Prestamista 1</label>
                  <input
                    type="text"
                    value={inversion.prestamo1Nombre}
                    onChange={e => setInversion(p => ({ ...p, prestamo1Nombre: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Monto</label>
                  <input
                    type="number" min="0"
                    value={inversion.prestamo1Monto || ''}
                    onChange={e => setInversion(p => ({ ...p, prestamo1Monto: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Prestamista 2</label>
                  <input
                    type="text"
                    value={inversion.prestamo2Nombre}
                    onChange={e => setInversion(p => ({ ...p, prestamo2Nombre: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Monto</label>
                  <input
                    type="number" min="0"
                    value={inversion.prestamo2Monto || ''}
                    onChange={e => setInversion(p => ({ ...p, prestamo2Monto: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {totalInvertido > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-300 font-semibold">Total Capital Invertido:</span>
                  <span className="text-emerald-400 font-bold font-mono">$ {Math.round(totalInvertido).toLocaleString('es-CO')}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium">Cancelar</button>
              <button
                onClick={generarReporte}
                disabled={totalInvertido <= 0 || generating}
                className="flex-[2] px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-bold disabled:opacity-50"
              >
                {generating ? 'Generando...' : '📊 Generar Reporte PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}