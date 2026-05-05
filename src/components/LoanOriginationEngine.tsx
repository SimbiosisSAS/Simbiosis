import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, FileDown, Rocket, TrendingUp, DollarSign, Percent, Calendar, User, Hash, ChevronDown, ChevronUp, FileDigit } from 'lucide-react';

interface AmortizationRow {
  installmentNumber: number;
  paymentDate: string;
  associatedCosts: number;
  openingBalance: number;
  principal: number;
  interest: number;
  paymentAmount: number;
  closingBalance: number;
}

interface LoanParams {
  loanNumber: string; // Casilla del Número de Crédito
  clientName: string;
  clientId: string;
  principalAmount: number;
  originationCosts: number;
  disbursementDate: string;
  nominalRateMV: number;
  termMonths: number;
}

const formatCurrency = (value: number): string => '$ ' + value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const formatDate = (date: Date): string => date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

function calculateTIR(principal: number, originationCosts: number, monthlyPayment: number, termMonths: number): number {
  const netDisbursement = principal - originationCosts;
  if (netDisbursement <= 0 || monthlyPayment <= 0 || termMonths <= 0) return 0;
  let rate = monthlyPayment / netDisbursement - 1;
  if (rate <= 0) rate = 0.01;
  for (let i = 0; i < 200; i++) {
    let sum = -netDisbursement; let dSum = 0;
    for (let t = 1; t <= termMonths; t++) { sum += monthlyPayment / Math.pow(1 + rate, t); dSum -= (t * monthlyPayment) / Math.pow(1 + rate, t + 1); }
    if (Math.abs(dSum) < 1e-15) break;
    const newRate = rate - sum / dSum;
    if (Math.abs(newRate - rate) < 1e-10) { rate = newRate; break; }
    rate = newRate;
    if (rate < -0.99) rate = 0.001; if (rate > 10) rate = 5;
  }
  return rate * 100;
}

function generateAmortization(params: LoanParams): { rows: AmortizationRow[]; monthlyPayment: number; totalPayment: number; tir: number } | null {
  const { principalAmount, originationCosts, disbursementDate, nominalRateMV, termMonths } = params;
  if (principalAmount <= 0 || nominalRateMV <= 0 || termMonths <= 0 || !disbursementDate) return null;

  const r = nominalRateMV / 100;
  const n = termMonths;
  const fixedPayment = principalAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const rows: AmortizationRow[] = [];
  let balance = principalAmount;
  const startDate = new Date(disbursementDate + 'T00:00:00');

  for (let i = 1; i <= n; i++) {
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    const interestPortion = balance * r;
    let principalPortion = fixedPayment - interestPortion;
    const costs = i === 1 ? originationCosts : 0;

    if (i === n) principalPortion = balance;

    const totalPaymentForPeriod = fixedPayment + costs;
    const closingBalance = i === n ? 0 : Math.max(0, balance - principalPortion);

    rows.push({
      installmentNumber: i, paymentDate: formatDate(paymentDate), associatedCosts: costs,
      openingBalance: Math.round(balance), principal: Math.round(principalPortion),
      interest: Math.round(interestPortion), paymentAmount: Math.round(totalPaymentForPeriod), closingBalance: Math.round(closingBalance)
    });
    balance = closingBalance;
  }

  return { rows, monthlyPayment: Math.round(fixedPayment), totalPayment: rows.reduce((s, r) => s + r.paymentAmount, 0), tir: calculateTIR(principalAmount, originationCosts, fixedPayment, termMonths) };
}

export default function LoanOriginationEngine() {
  const [params, setParams] = useState<LoanParams>({ loanNumber: '', clientName: '', clientId: '', principalAmount: 0, originationCosts: 0, disbursementDate: '', nominalRateMV: 0, termMonths: 0 });
  const [isCalculated, setIsCalculated] = useState(false);
  const [showFullTable, setShowFullTable] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activateSuccess, setActivateSuccess] = useState(false);

  useEffect(() => {
    const fetchNextLoanNumber = async () => {
      const { data } = await supabase.from('active_loans').select('loan_number').not('loan_number', 'is', null);
      if (data && data.length > 0) {
        const numbers = data.map(row => parseInt(row.loan_number.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
        if (numbers.length > 0) return setParams(p => ({ ...p, loanNumber: (Math.max(...numbers) + 1).toString() }));
      }
      setParams(p => ({ ...p, loanNumber: '1' }));
    };
    fetchNextLoanNumber();
  }, []);

  const result = useMemo(() => isCalculated ? generateAmortization(params) : null, [isCalculated, params]);
  const handleCalculate = () => { setIsCalculated(true); setShowFullTable(false); setActivateSuccess(false); };
  const handleReset = () => { setIsCalculated(false); setActivateSuccess(false); setParams({ loanNumber: params.loanNumber, clientName: '', clientId: '', principalAmount: 0, originationCosts: 0, disbursementDate: '', nominalRateMV: 0, termMonths: 0 }); };

  const handleActivate = async () => {
    if (!result) return;
    setActivating(true);
    try {
      const { data: loanData, error: loanError } = await supabase.from('active_loans').insert({
        loan_number: params.loanNumber || null, client_name: params.clientName, client_id_number: params.clientId,
        principal_amount: params.principalAmount, origination_costs: params.originationCosts, disbursement_date: params.disbursementDate,
        nominal_rate_mv: params.nominalRateMV, term_months: params.termMonths, monthly_payment: result.monthlyPayment,
        total_payment: result.totalPayment, tir: result.tir, status: 'ACTIVE'
      }).select().single();

      if (loanError) throw loanError;

      const installmentsToInsert = result.rows.map(row => {
        const paymentDate = new Date(params.disbursementDate);
        paymentDate.setMonth(paymentDate.getMonth() + row.installmentNumber);
        return {
          loan_id: loanData.id, installment_number: row.installmentNumber, expected_payment_date: paymentDate.toISOString().split('T')[0],
          expected_amount: row.paymentAmount, principal_portion: row.principal, interest_portion: row.interest, status: 'PENDING'
        };
      });

      const { error: instError } = await supabase.from('loan_installments').insert(installmentsToInsert);
      if (instError) throw instError;

      setActivateSuccess(true);
      alert('¡Crédito activado exitosamente!');
      setParams(p => ({ ...p, loanNumber: (parseInt(params.loanNumber) + 1).toString() }));
    } catch (err: any) { alert('Error: ' + err.message); } finally { setActivating(false); }
  };

  const inputClass = 'w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm';
  const labelClass = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2';

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2"><Calculator className="text-emerald-400"/> Parámetros del Crédito</h3>
          <div className="space-y-4">
            <div><label className={labelClass}><FileDigit className="w-3 h-3 inline mr-1" /> Número de Crédito</label><input type="text" value={params.loanNumber} onChange={(e) => setParams(p => ({ ...p, loanNumber: e.target.value }))} className={`${inputClass} font-mono text-emerald-400`} placeholder="Ej: 52" /></div>
            <div><label className={labelClass}><User className="w-3 h-3 inline mr-1" /> Cliente</label><input type="text" value={params.clientName} onChange={(e) => setParams(p => ({ ...p, clientName: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}><Hash className="w-3 h-3 inline mr-1" /> Identificación</label><input type="text" value={params.clientId} onChange={(e) => setParams(p => ({ ...p, clientId: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}><DollarSign className="w-3 h-3 inline mr-1" /> Monto Principal</label><input type="number" value={params.principalAmount || ''} onChange={(e) => setParams(p => ({ ...p, principalAmount: Number(e.target.value) }))} className={inputClass} /></div>
            <div><label className={labelClass}><DollarSign className="w-3 h-3 inline mr-1" /> Costos Originación</label><input type="number" value={params.originationCosts || ''} onChange={(e) => setParams(p => ({ ...p, originationCosts: Number(e.target.value) }))} className={inputClass} /></div>
            <div><label className={labelClass}><Calendar className="w-3 h-3 inline mr-1" /> Fecha Desembolso</label><input type="date" value={params.disbursementDate} onChange={(e) => setParams(p => ({ ...p, disbursementDate: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}><Percent className="w-3 h-3 inline mr-1" /> Tasa Nominal MV (%)</label><input type="number" value={params.nominalRateMV || ''} onChange={(e) => setParams(p => ({ ...p, nominalRateMV: Number(e.target.value) }))} className={inputClass} /></div>
            <div><label className={labelClass}><Calendar className="w-3 h-3 inline mr-1" /> Plazo (Meses)</label><input type="number" value={params.termMonths || ''} onChange={(e) => setParams(p => ({ ...p, termMonths: Number(e.target.value) }))} className={inputClass} /></div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCalculate} disabled={!(params.clientName && params.principalAmount > 0 && params.nominalRateMV > 0 && params.termMonths > 0)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold disabled:opacity-40"><Calculator className="w-4 h-4 inline mr-2" />Calcular</button>
              {isCalculated && <button onClick={handleReset} className="px-4 border border-slate-600 text-slate-400 rounded-xl hover:text-white">Limpiar</button>}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2"><TrendingUp className="text-emerald-400"/> Proyección</h3>
          {!result ? <p className="text-center py-12 text-slate-500">Configura los parámetros para ver la proyección</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-xl"><p className="text-xs text-slate-500 mb-1">Total a Pagar</p><p className="text-xl font-bold text-emerald-400">{formatCurrency(result.totalPayment)}</p></div>
                <div className="bg-slate-900/50 p-4 rounded-xl"><p className="text-xs text-slate-500 mb-1">TIR Mensual</p><p className="text-xl font-bold text-emerald-400">{result.tir.toFixed(3)}%</p></div>
                <div className="bg-slate-900/50 p-4 rounded-xl"><p className="text-xs text-slate-500 mb-1">Cuota Fija</p><p className="text-xl font-bold text-emerald-400">{formatCurrency(result.monthlyPayment)}</p></div>
              </div>
              <button onClick={handleActivate} disabled={activating || activateSuccess} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"><Rocket className="w-4 h-4 inline mr-2"/> {activateSuccess ? 'Activado' : 'Activar Crédito'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}