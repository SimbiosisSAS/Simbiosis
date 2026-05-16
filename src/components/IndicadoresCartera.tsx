import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function IndicadoresCartera() {
  const [loans, setLoans] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [loansRes, instRes] = await Promise.all([
      supabase.from('active_loans').select('*'),
      supabase.from('loan_installments').select('*'),
    ]);
    if (!loansRes.error) setLoans(loansRes.data || []);
    if (!instRes.error) setInstallments(instRes.data || []);
    setLoading(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fmt = (val: number) => '$ ' + Math.round(val).toLocaleString('es-CO');
  const pct = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';

  const getLoanBalance = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return 0;
    const principal = Number(loan.principal_amount || loan.loan_amount)
      + Number(loan.associated_costs || loan.origination_costs || 0);
    const paid = installments
      .filter(i => i.loan_id === loanId && (i.status === 'PAID' || i.status === 'LATE'))
      .reduce((s, i) => s + Number(i.principal_portion), 0);
    return Math.max(principal - paid, 0);
  };

  const getDaysLate = (inst: any): number => {
    if (inst.status !== 'PENDING') return 0;
    const expected = new Date(inst.expected_payment_date);
    expected.setHours(0, 0, 0, 0);
    if (expected >= today) return 0;
    return Math.floor((today.getTime() - expected.getTime()) / 86400000);
  };

  const totalCartera = loans.reduce((s, l) => s + getLoanBalance(l.id), 0);

  const loanMaxDaysLate = loans.map(loan => {
    const pending = installments.filter(i => i.loan_id === loan.id && i.status === 'PENDING');
    const max = Math.max(0, ...pending.map(i => getDaysLate(i)));
    return { loan, maxDaysLate: max };
  });

  const loansEnMora = loanMaxDaysLate.filter(({ maxDaysLate }) => maxDaysLate > 0);
  const carteraEnMora = loansEnMora.reduce((s, { loan }) => s + getLoanBalance(loan.id), 0);

  const cuotasVencidas = installments.filter(i => i.status === 'PENDING' && getDaysLate(i) > 0);
  const valorCuotasVencidas = cuotasVencidas.reduce((s, i) => s + Number(i.expected_amount), 0);

  const next7 = new Date(today); next7.setDate(today.getDate() + 7);
  const cobrosProximos7 = installments
    .filter(i => {
      const f = new Date(i.expected_payment_date); f.setHours(0, 0, 0, 0);
      return i.status === 'PENDING' && f >= today && f <= next7;
    })
    .reduce((s, i) => s + Number(i.expected_amount), 0);

  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const pagadosEsteMes = installments.filter(i => {
    if (i.status !== 'PAID' && i.status !== 'LATE') return false;
    const f = new Date(i.actual_payment_date || i.expected_payment_date);
    return f >= firstMonth;
  }).reduce((s, i) => s + Number(i.actual_amount_paid || 0), 0);

  const esperadosEsteMes = installments
    .filter(i => {
      const f = new Date(i.expected_payment_date); f.setHours(0, 0, 0, 0);
      return f >= firstMonth && f <= today;
    })
    .reduce((s, i) => s + Number(i.expected_amount), 0);

  const agingBuckets = [
    { label: 'Al día', min: 0, max: 0, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-500' },
    { label: '1 – 30 días', min: 1, max: 30, bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', bar: 'bg-yellow-500' },
    { label: '31 – 60 días', min: 31, max: 60, bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', bar: 'bg-orange-500' },
    { label: '61 – 90 días', min: 61, max: 90, bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', bar: 'bg-red-500' },
    { label: '> 90 días', min: 91, max: Infinity, bg: 'bg-rose-900/20', border: 'border-rose-500/30', text: 'text-rose-400', bar: 'bg-rose-600' },
  ];

  const aging = agingBuckets.map(bucket => {
    const inBucket = loanMaxDaysLate.filter(({ maxDaysLate }) =>
      bucket.max === 0
        ? maxDaysLate === 0
        : maxDaysLate >= bucket.min && maxDaysLate <= bucket.max
    );
    const saldo = inBucket.reduce((s, { loan }) => s + getLoanBalance(loan.id), 0);
    return { ...bucket, count: inBucket.length, saldo };
  });

  const flujoPorMes: { mes: string; esperado: number; cuotas: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const start = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
    const cuotasMes = installments.filter(inst => {
      const f = new Date(inst.expected_payment_date);
      return inst.status === 'PENDING' && f >= start && f <= end;
    });
    flujoPorMes.push({
      mes: start.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
      esperado: cuotasMes.reduce((s, inst) => s + Number(inst.expected_amount), 0),
      cuotas: cuotasMes.length,
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <p className="text-slate-400">Cargando indicadores...</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capital Total Colocado</p>
          <p className="text-2xl font-bold text-white font-mono">{fmt(totalCartera)}</p>
          <p className="text-xs text-slate-500 mt-1">{loans.length} créditos activos</p>
        </div>

        <div className={`border rounded-2xl p-5 ${carteraEnMora > 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cartera en Mora</p>
          <p className={`text-2xl font-bold font-mono ${carteraEnMora > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {fmt(carteraEnMora)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {pct(carteraEnMora, totalCartera)} del total · {loansEnMora.length} créditos
          </p>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tasa de Recaudo (Mes Actual)</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono">{pct(pagadosEsteMes, esperadosEsteMes)}</p>
          <p className="text-xs text-slate-500 mt-1">{fmt(pagadosEsteMes)} de {fmt(esperadosEsteMes)} esperados</p>
        </div>

        <div className={`border rounded-2xl p-5 ${cuotasVencidas.length > 0 ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-800/40 border-slate-700/50'}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cuotas Vencidas Hoy</p>
          <p className={`text-2xl font-bold font-mono ${cuotasVencidas.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
            {cuotasVencidas.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">{fmt(valorCuotasVencidas)} por cobrar</p>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cobros Próximos 7 Días</p>
          <p className="text-2xl font-bold text-slate-200 font-mono">{fmt(cobrosProximos7)}</p>
          <p className="text-xs text-slate-500 mt-1">cuotas pendientes en la semana</p>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Clientes al Día</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            {loans.length - loansEnMora.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">de {loans.length} clientes totales</p>
        </div>
      </div>

      {/* AGING */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-5">Aging de Cartera</h3>
        <div className="space-y-3">
          {aging.map(bucket => (
            <div key={bucket.label} className={`${bucket.bg} border ${bucket.border} rounded-xl p-4`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${bucket.text}`}>{bucket.label}</span>
                  <span className="text-xs bg-slate-800/50 px-2 py-0.5 rounded-full text-slate-400">
                    {bucket.count} crédito{bucket.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className={`text-sm font-bold font-mono ${bucket.text}`}>{fmt(bucket.saldo)}</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                <div
                  className={`${bucket.bar} h-1.5 rounded-full transition-all`}
                  style={{ width: totalCartera > 0 ? `${Math.min((bucket.saldo / totalCartera) * 100, 100)}%` : '0%' }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1 text-right">
                {pct(bucket.saldo, totalCartera)} de la cartera total
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* FLUJO DE CAJA */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-5">Flujo de Caja Proyectado</h3>
        <div className="grid grid-cols-3 gap-4">
          {flujoPorMes.map((mes, i) => (
            <div key={mes.mes} className={`rounded-xl p-4 border ${i === 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/50 border-slate-700/30'}`}>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 capitalize">{mes.mes}</p>
              <p className={`text-xl font-bold font-mono ${i === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {fmt(mes.esperado)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{mes.cuotas} cuotas pendientes</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
