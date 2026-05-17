import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText } from 'lucide-react';

const getBracket = (days: number) => {
  if (days <= 90)  return { label: 'Al día (0 a 3 meses)',           pct: 0,    color: '#059669', bg: '#f0fdf4' };
  if (days <= 180) return { label: 'Más de 3 hasta 6 meses',         pct: 0.05, color: '#d97706', bg: '#fffbeb' };
  if (days <= 360) return { label: 'Más de 6 hasta 12 meses',        pct: 0.10, color: '#ea580c', bg: '#fff7ed' };
  if (days <= 540) return { label: 'Más de 12 hasta 18 meses',       pct: 0.15, color: '#dc2626', bg: '#fef2f2' };
  if (days <= 720) return { label: 'Más de 18 hasta 24 meses',       pct: 0.20, color: '#b91c1c', bg: '#fef2f2' };
  return           { label: 'Más de 24 meses',                        pct: 0.25, color: '#7f1d1d', bg: '#fff1f2' };
};

const fmt = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO');

export default function ReporteProvisionesPDF() {
  const [generating, setGenerating] = useState(false);

  const generar = async () => {
    setGenerating(true);
    try {
      const [loansRes, instRes] = await Promise.all([
        supabase.from('active_loans').select('*'),
        supabase.from('loan_installments').select('*'),
      ]);
      const loans = loansRes.data || [];
      const installments = instRes.data || [];
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const fechaCorte = hoy.toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' });

      // ── POR CADA CRÉDITO: calcular saldo vencido y días de mora más antigua ──
      const detalle = loans.map(loan => {
        const loanInst = installments.filter(i => i.loan_id === loan.id);
        const vencidas = loanInst.filter(i => {
          if (i.status !== 'PENDING') return false;
          const f = new Date(i.expected_payment_date); f.setHours(0,0,0,0);
          return f < hoy;
        });

        const saldoVencido = vencidas.reduce((s, i) => s + Number(i.expected_amount), 0);

        let maxDias = 0;
        vencidas.forEach(i => {
          const f = new Date(i.expected_payment_date); f.setHours(0,0,0,0);
          const dias = Math.floor((hoy.getTime() - f.getTime()) / 86400000);
          if (dias > maxDias) maxDias = dias;
        });

        const bracket = getBracket(maxDias);
        const provision = saldoVencido * bracket.pct;

        return { loan, saldoVencido, maxDias, bracket, provision };
      });

      // ── RESUMEN POR TRAMO ──────────────────────────────────────────────────
      const brackets = [
        { label: 'Al día (0 a 3 meses)',     pct: 0,    days: [0, 90]   },
        { label: 'Más de 3 hasta 6 meses',   pct: 0.05, days: [91, 180] },
        { label: 'Más de 6 hasta 12 meses',  pct: 0.10, days: [181, 360]},
        { label: 'Más de 12 hasta 18 meses', pct: 0.15, days: [361, 540]},
        { label: 'Más de 18 hasta 24 meses', pct: 0.20, days: [541, 720]},
        { label: 'Más de 24 meses',           pct: 0.25, days: [721, Infinity]},
      ];

      const resumen = brackets.map(b => {
        const inBracket = detalle.filter(d => d.maxDias >= b.days[0] && d.maxDias <= b.days[1]);
        const totalVencido = inBracket.reduce((s, d) => s + d.saldoVencido, 0);
        const totalProvision = inBracket.reduce((s, d) => s + d.provision, 0);
        return { ...b, count: inBracket.length, totalVencido, totalProvision };
      });

      const totalVencido = detalle.reduce((s, d) => s + d.saldoVencido, 0);
      const totalProvision = detalle.reduce((s, d) => s + d.provision, 0);
      const totalCartera = loans.reduce((s, l) => {
        const cap = Number(l.principal_amount || l.loan_amount) + Number(l.associated_costs || l.origination_costs || 0);
        const pagado = installments.filter(i => i.loan_id === l.id && (i.status === 'PAID' || i.status === 'LATE')).reduce((a, i) => a + Number(i.principal_portion), 0);
        return s + Math.max(cap - pagado, 0);
      }, 0);

      // ── FILAS DEL RESUMEN ─────────────────────────────────────────────────
      const filasResumen = resumen.map(b => {
        const br = getBracket(b.days[0] === 0 ? 0 : b.days[0]);
        return `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 8px;font-weight:bold;color:${br.color};">${b.label}</td>
            <td style="padding:10px 8px;text-align:center;">${b.count}</td>
            <td style="padding:10px 8px;text-align:right;">$ ${Math.round(b.totalVencido).toLocaleString('es-CO')}</td>
            <td style="padding:10px 8px;text-align:center;font-weight:bold;">${(b.pct * 100).toFixed(0)}%</td>
            <td style="padding:10px 8px;text-align:right;font-weight:bold;color:${br.color};">$ ${Math.round(b.totalProvision).toLocaleString('es-CO')}</td>
          </tr>`;
      }).join('');

      // ── FILAS DEL DETALLE ─────────────────────────────────────────────────
      const filasDetalle = detalle
        .filter(d => d.saldoVencido > 0)
        .sort((a, b) => b.maxDias - a.maxDias)
        .map(d => `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 6px;font-weight:bold;">${d.loan.client_name}</td>
            <td style="padding:8px 6px;text-align:right;">$ ${Math.round(d.saldoVencido).toLocaleString('es-CO')}</td>
            <td style="padding:8px 6px;text-align:center;">${d.maxDias} días</td>
            <td style="padding:8px 6px;color:${d.bracket.color};font-weight:bold;">${d.bracket.label}</td>
            <td style="padding:8px 6px;text-align:center;">${(d.bracket.pct * 100).toFixed(0)}%</td>
            <td style="padding:8px 6px;text-align:right;font-weight:bold;color:${d.bracket.color};">$ ${Math.round(d.provision).toLocaleString('es-CO')}</td>
          </tr>`
        ).join('');

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte de Provisiones — Simbiosis</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:13px; color:#111827; padding:40px 48px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; border-bottom:3px solid #059669; padding-bottom:16px; }
    .logo { font-size:30px; font-weight:900; background:linear-gradient(to right,#ef4444,#f97316,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .logo-sub { font-size:11px; color:#9ca3af; letter-spacing:2px; }
    h2 { font-size:18px; font-weight:bold; color:#111827; border-bottom:2px solid #e5e7eb; padding-bottom:8px; margin:24px 0 16px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px; }
    .kpi { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:14px; }
    .kpi-label { font-size:10px; text-transform:uppercase; color:#6b7280; margin-bottom:4px; }
    .kpi-value { font-size:18px; font-weight:bold; color:#111827; }
    table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:24px; }
    thead { background:#111827; color:white; }
    th { padding:10px 8px; text-align:right; white-space:nowrap; }
    th:first-child, th:nth-child(2) { text-align:left; }
    tbody tr:nth-child(even) { background:#f9fafb; }
    .total-row { background:#111827 !important; color:white; font-weight:bold; }
    .total-row td { padding:12px 8px; }
    .asiento { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin-top:24px; }
    .asiento h3 { font-size:13px; font-weight:bold; color:#065f46; margin-bottom:12px; }
    .asiento table { margin:0; font-size:11px; }
    .asiento thead { background:#059669; }
    .legal { margin-top:24px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 16px; font-size:11px; color:#92400e; }
    .footer { margin-top:32px; border-top:1px solid #e5e7eb; padding-top:12px; font-size:10px; color:#9ca3af; text-align:center; }
    @media print { button { display:none!important; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">SIMBIOSIS</div>
      <div class="logo-sub">conoce, invierte, crece</div>
    </div>
    <div style="text-align:right;">
      <h1 style="font-size:20px;font-weight:bold;margin-bottom:4px;">Reporte de Provisión General de Cartera</h1>
      <p style="color:#6b7280;font-size:12px;">Fecha de corte: ${fechaCorte}</p>
      <p style="color:#6b7280;font-size:11px;">Decreto 1625 de 2016 — Art. 1.2.1.18.21</p>
      <button onclick="window.print()" style="margin-top:8px;padding:6px 16px;background:#059669;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
        🖨 Imprimir / Guardar PDF
      </button>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Total Cartera Vigente</div>
      <div class="kpi-value">$ ${Math.round(totalCartera).toLocaleString('es-CO')}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:2px;">${loans.length} créditos activos</div>
    </div>
    <div class="kpi" style="border-color:#fde68a;background:#fffbeb;">
      <div class="kpi-label">Total Cartera Vencida</div>
      <div class="kpi-value" style="color:#d97706;">$ ${Math.round(totalVencido).toLocaleString('es-CO')}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:2px;">${detalle.filter(d=>d.saldoVencido>0).length} créditos en mora</div>
    </div>
    <div class="kpi" style="border-color:#fca5a5;background:#fef2f2;">
      <div class="kpi-label">Provisión General Requerida</div>
      <div class="kpi-value" style="color:#dc2626;">$ ${Math.round(totalProvision).toLocaleString('es-CO')}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:2px;">según Decreto 1625 de 2016</div>
    </div>
  </div>

  <h2>Resumen por Tramo de Antigüedad</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Tramo de Antigüedad</th>
        <th style="text-align:center;">Créditos</th>
        <th>Saldo Vencido</th>
        <th style="text-align:center;">% Provisión</th>
        <th>Provisión Requerida</th>
      </tr>
    </thead>
    <tbody>
      ${filasResumen}
      <tr class="total-row">
        <td>TOTAL</td>
        <td style="text-align:center;">${detalle.filter(d=>d.saldoVencido>0).length}</td>
        <td style="text-align:right;">$ ${Math.round(totalVencido).toLocaleString('es-CO')}</td>
        <td style="text-align:center;">—</td>
        <td style="text-align:right;">$ ${Math.round(totalProvision).toLocaleString('es-CO')}</td>
      </tr>
    </tbody>
  </table>

  ${filasDetalle ? `
  <h2>Detalle por Crédito en Mora</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Cliente</th>
        <th>Saldo Vencido</th>
        <th style="text-align:center;">Días mora</th>
        <th style="text-align:left;">Clasificación</th>
        <th style="text-align:center;">% Prov.</th>
        <th>Provisión</th>
      </tr>
    </thead>
    <tbody>${filasDetalle}</tbody>
  </table>` : '<p style="color:#6b7280;text-align:center;padding:20px;">No hay créditos en mora.</p>'}

  <div class="asiento">
    <h3>📒 Asiento Contable Sugerido — Constitución de Provisión</h3>
    <table>
      <thead>
        <tr>
          <th style="text-align:left;padding:6px 8px;">Cuenta</th>
          <th style="text-align:left;padding:6px 8px;">Descripción</th>
          <th style="text-align:right;padding:6px 8px;">Débito</th>
          <th style="text-align:right;padding:6px 8px;">Crédito</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:6px 8px;">519900</td>
          <td style="padding:6px 8px;">Gasto — Provisión cartera de créditos</td>
          <td style="padding:6px 8px;text-align:right;font-weight:bold;">$ ${Math.round(totalProvision).toLocaleString('es-CO')}</td>
          <td style="padding:6px 8px;text-align:right;">—</td>
        </tr>
        <tr>
          <td style="padding:6px 8px;">139900</td>
          <td style="padding:6px 8px;">Provisión para deudas de dudoso o difícil cobro</td>
          <td style="padding:6px 8px;text-align:right;">—</td>
          <td style="padding:6px 8px;text-align:right;font-weight:bold;">$ ${Math.round(totalProvision).toLocaleString('es-CO')}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="legal">
    <strong>Base legal:</strong> Decreto 1625 de 2016, Artículo 1.2.1.18.21 — Provisión General. Los porcentajes aplicados corresponden a la cartera vencida según antigüedad de mora al corte del ${fechaCorte}. La provisión es deducible de renta bruta conforme al Estatuto Tributario, Art. 145.
  </div>

  <div class="footer">
    Documento generado el ${fechaCorte} — Simbiosis Loan Management System — Solo para uso contable interno
  </div>
</body>
</html>`;

      const w = window.open('', '_blank', 'width=1200,height=900');
      if (w) { w.document.write(html); w.document.close(); }

    } catch (err: any) {
      alert('Error generando reporte: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generar}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white hover:border-slate-400 text-sm font-medium transition-colors disabled:opacity-50"
    >
      <FileText size={16} /> {generating ? 'Generando...' : 'Reporte de Provisiones'}
    </button>
  );
}