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
  loanNumber: string;
  clientName: string;
  clientId: string;
  principalAmount: number;
  originationCosts: number;
  disbursementDate: string;
  nominalRateMV: number;
  termMonths: number;
}

const formatCurrency = (value: number): string => {
  return '$ ' + value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
};

function calculateTIR(principal: number, originationCosts: number, monthlyPayment: number, termMonths: number): number {
  const netDisbursement = principal - originationCosts;
  if (netDisbursement <= 0 || monthlyPayment <= 0 || termMonths <= 0) return 0;

  const npv = (rate: number): number => {
    let sum = -netDisbursement;
    for (let t = 1; t <= termMonths; t++) {
      sum += monthlyPayment / Math.pow(1 + rate, t);
    }
    return sum;
  };

  const dnpv = (rate: number): number => {
    let sum = 0;
    for (let t = 1; t <= termMonths; t++) {
      sum -= (t * monthlyPayment) / Math.pow(1 + rate, t + 1);
    }
    return sum;
  };

  let rate = monthlyPayment / netDisbursement - 1;
  if (rate <= 0) rate = 0.01;

  for (let i = 0; i < 200; i++) {
    const f = npv(rate);
    const df = dnpv(rate);
    if (Math.abs(df) < 1e-15) break;
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-10) {
      rate = newRate;
      break;
    }
    rate = newRate;
    if (rate < -0.99) rate = 0.001;
    if (rate > 10) rate = 5;
  }

  return rate * 100;
}

function generateAmortization(params: LoanParams): { rows: AmortizationRow[]; monthlyPayment: number; totalPayment: number; tir: number } | null {
  const { principalAmount, originationCosts, disbursementDate, nominalRateMV, termMonths } = params;

  if (principalAmount <= 0 || nominalRateMV <= 0 || termMonths <= 0 || !disbursementDate) {
    return null;
  }

  const r = nominalRateMV / 100;
  const n = termMonths;
  
  // EL CAMBIO CLAVE: El monto a financiar (sobre el que se calcula todo) INCLUYE los costos.
  const amountToFinance = principalAmount + originationCosts;

  // Calculamos la cuota fija mensual sobre el TOTAL financiado
  const fixedPayment = amountToFinance * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const rows: AmortizationRow[] = [];
  
  // El balance arranca en el monto total financiado
  let balance = amountToFinance;
  const startDate = new Date(disbursementDate + 'T00:00:00');

  for (let i = 1; i <= n; i++) {
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    const interestPortion = balance * r;
    let principalPortion = fixedPayment - interestPortion;
    
    // Los costos solo se muestran visualmente en la cuota 1, pero ya están financiados en el saldo
    const costs = i === 1 ? originationCosts : 0;

    if (i === n) {
      principalPortion = balance; // Ajuste final por decimales
    }

    const totalPaymentForPeriod = fixedPayment; // La cuota ya es igual todos los meses
    const closingBalance = i === n ? 0 : Math.max(0, balance - principalPortion);

    rows.push({
      installmentNumber: i,
      paymentDate: formatDate(paymentDate),
      associatedCosts: costs,
      openingBalance: Math.round(balance),
      principal: Math.round(principalPortion),
      interest: Math.round(interestPortion),
      paymentAmount: Math.round(totalPaymentForPeriod),
      closingBalance: Math.round(closingBalance),
    });

    balance = closingBalance;
  }

  const totalPayment = rows.reduce((sum, row) => sum + row.paymentAmount, 0);
  
  // La TIR se calcula sobre lo que realmente le entregaste al cliente (principalAmount)
  const tir = calculateTIR(principalAmount, originationCosts, fixedPayment, termMonths);

  return {
    rows,
    monthlyPayment: Math.round(fixedPayment),
    totalPayment,
    tir,
  };
}

export default function LoanOriginationEngine({ prefillData }: { prefillData?: any }) {
  const [params, setParams] = useState<LoanParams>({
    loanNumber: '',
    clientName: '',
    clientId: '',
    principalAmount: 0,
    originationCosts: 0,
    disbursementDate: '',
    nominalRateMV: 0,
    termMonths: 0,
  });

  const [isCalculated, setIsCalculated] = useState(false);
  const [showFullTable, setShowFullTable] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activateSuccess, setActivateSuccess] = useState(false);

  useEffect(() => {
    const fetchNextLoanNumber = async () => {
      useEffect(() => {
  if (prefillData && prefillData.id_number) {
    setParams(p => ({
      ...p,
      clientName: `${prefillData.first_name} ${prefillData.last_name}`,
      clientId: prefillData.id_number,
      principalAmount: Number(prefillData.credit_amount) || 0
    }));
  }
}, [prefillData]);
      try {
        const { data, error } = await supabase
          .from('active_loans')
          .select('loan_number')
          .not('loan_number', 'is', null);

        if (error) throw error;

        if (data && data.length > 0) {
          const numbers = data
            .map(row => parseInt(row.loan_number.replace(/\D/g, ''), 10))
            .filter(n => !isNaN(n));
          
          if (numbers.length > 0) {
            const maxNumber = Math.max(...numbers);
            setParams(p => ({ ...p, loanNumber: (maxNumber + 1).toString() }));
            return;
          }
        }
        setParams(p => ({ ...p, loanNumber: '1' }));
      } catch (err) {
        console.error('Error buscando número de crédito:', err);
      }
    };

    fetchNextLoanNumber();
  }, []);

  const result = useMemo(() => {
    if (!isCalculated) return null;
    return generateAmortization(params);
  }, [isCalculated, params]);

  const totalInterest = useMemo(() => {
    if (!result) return 0;
    return result.rows.reduce((sum, row) => sum + row.interest, 0);
  }, [result]);

  const handleCalculate = () => {
    setIsCalculated(true);
    setShowFullTable(false);
    setActivateSuccess(false);
  };

  const handleReset = () => {
    setIsCalculated(false);
    setShowFullTable(false);
    setActivateSuccess(false);
    setParams({
      loanNumber: params.loanNumber, 
      clientName: '',
      clientId: '',
      principalAmount: 0,
      originationCosts: 0,
      disbursementDate: '',
      nominalRateMV: 0,
      termMonths: 0,
    });
  };

  const handleActivate = async () => {
    if (!result) return;
    setActivating(true);
    
    try {
      // 1. Guardar el crédito maestro con los nombres de columnas de Supabase exactamente alineados
      const { data: loanData, error: loanError } = await supabase
        .from('active_loans')
        .insert({
          loan_number: params.loanNumber || null,
          client_name: params.clientName,
          client_id_number: params.clientId,
          loan_amount: params.principalAmount,            // CORREGIDO PARA BD
          associated_costs: params.originationCosts,      // CORREGIDO PARA BD
          disbursement_date: params.disbursementDate,
          interest_rate_monthly: params.nominalRateMV,    // CORREGIDO PARA BD
          installments: params.termMonths,                // CORREGIDO PARA BD
          fixed_quota_amount: result.monthlyPayment,
          total_payment: result.totalPayment,
          tir: result.tir,
          status: 'ACTIVE'
        })
        .select()
        .single();

      if (loanError) {
        console.error("Detalle del error Supabase:", loanError);
        throw new Error(loanError.message);
      }

      // 2. Guardar las cuotas individuales
      const installmentsToInsert = result.rows.map(row => {
        const paymentDate = new Date(params.disbursementDate);
        paymentDate.setMonth(paymentDate.getMonth() + row.installmentNumber);
        
        return {
          loan_id: loanData.id,
          installment_number: row.installmentNumber,
          expected_payment_date: paymentDate.toISOString().split('T')[0],
          expected_amount: row.paymentAmount,
          principal_portion: row.principal,
          interest_portion: row.interest,
          status: 'PENDING'
        };
      });

      const { error: installmentsError } = await supabase
        .from('loan_installments')
        .insert(installmentsToInsert);

      if (installmentsError) throw installmentsError;

      setActivateSuccess(true);
      alert('¡Crédito activado y plan de pagos guardado exitosamente!');
      
      const currentNum = parseInt(params.loanNumber.replace(/\D/g, ''), 10);
      if (!isNaN(currentNum)) {
        setParams(p => ({ ...p, loanNumber: (currentNum + 1).toString() }));
      }
      
    } catch (err: any) {
      console.error('Error activando el crédito:', err);
      alert('Hubo un error al guardar: ' + err.message);
    } finally {
      setActivating(false);
    }
  };

  const handleExportPDF = () => {
    alert('Funcionalidad de exportación a PDF en desarrollo. El plan de amortización estará disponible para descarga pronto.');
  };

  const isValid = params.clientName && params.clientId && params.principalAmount > 0 && params.nominalRateMV > 0 && params.termMonths > 0 && params.disbursementDate;

  const inputClass = 'w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-200 text-sm';
  const labelClass = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2';

  return (
    <div className="space-y-6">
      {/* Split Screen: Input + Projection */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Panel - Input Parameters */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Parámetros del Crédito</h3>
                <p className="text-xs text-slate-500">Configura las variables del préstamo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  <FileDigit className="w-3 h-3 inline mr-1" />
                  Número de Crédito
                </label>
                <input
                  type="text"
                  value={params.loanNumber}
                  onChange={(e) => setParams(p => ({ ...p, loanNumber: e.target.value }))}
                  className={`${inputClass} font-mono text-emerald-400`}
                  placeholder="Ej: 52"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <User className="w-3 h-3 inline mr-1" />
                  Cliente
                </label>
                <input
                  type="text"
                  value={params.clientName}
                  onChange={(e) => setParams(p => ({ ...p, clientName: e.target.value }))}
                  className={inputClass}
                  placeholder="Nombre del cliente"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Hash className="w-3 h-3 inline mr-1" />
                  Identificación
                </label>
                <input
                  type="text"
                  value={params.clientId}
                  onChange={(e) => setParams(p => ({ ...p, clientId: e.target.value }))}
                  className={inputClass}
                  placeholder="Cédula o NIT"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Monto Principal (COP)
                </label>
                <input
                  type="number"
                  value={params.principalAmount || ''}
                  onChange={(e) => setParams(p => ({ ...p, principalAmount: Number(e.target.value) }))}
                  className={inputClass}
                  placeholder="15,000,000"
                  min="0"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Costos de Originación (COP)
                </label>
                <input
                  type="number"
                  value={params.originationCosts || ''}
                  onChange={(e) => setParams(p => ({ ...p, originationCosts: Number(e.target.value) }))}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Fecha de Desembolso
                </label>
                <input
                  type="date"
                  value={params.disbursementDate}
                  onChange={(e) => setParams(p => ({ ...p, disbursementDate: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Percent className="w-3 h-3 inline mr-1" />
                  Tasa Nominal MV (%)
                </label>
                <input
                  type="number"
                  value={params.nominalRateMV || ''}
                  onChange={(e) => setParams(p => ({ ...p, nominalRateMV: Number(e.target.value) }))}
                  className={inputClass}
                  placeholder="1.5"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Plazo (Meses)
                </label>
                <input
                  type="number"
                  value={params.termMonths || ''}
                  onChange={(e) => setParams(p => ({ ...p, termMonths: Number(e.target.value) }))}
                  className={inputClass}
                  placeholder="36"
                  min="1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCalculate}
                  disabled={!isValid}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Calcular Plan
                </button>
                {isCalculated && (
                  <button
                    onClick={handleReset}
                    className="px-4 py-3 rounded-xl text-sm font-medium border border-slate-600/50 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Live Projection */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Proyección en Vivo</h3>
                <p className="text-xs text-slate-500">Resumen del plan de amortización</p>
              </div>
            </div>

            {!result ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-slate-700/30 rounded-2xl flex items-center justify-center mb-4">
                  <Calculator className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-500 text-sm">Configura los parámetros y presiona</p>
                <p className="text-slate-500 text-sm">"Calcular Plan" para ver la proyección</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total a Pagar</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                      {formatCurrency(result.totalPayment)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">COP</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">TIR Mensual</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                      {result.tir.toFixed(3)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Tasa Interna de Retorno</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cuota Mensual</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                      {formatCurrency(result.monthlyPayment)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">COP / mes</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Intereses Totales</p>
                    <p className="text-lg font-bold text-slate-300 font-mono tabular-nums">
                      {formatCurrency(totalInterest)}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Costos Originación</p>
                    <p className="text-lg font-bold text-slate-300 font-mono tabular-nums">
                      {formatCurrency(params.originationCosts)}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Cliente: <span className="text-slate-300 font-medium">{params.clientName}</span></span>
                    <span className="text-slate-500">ID: <span className="text-slate-300 font-medium">{params.clientId}</span></span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-slate-500">Tasa: <span className="text-emerald-400 font-medium">{params.nominalRateMV}% MV</span></span>
                    <span className="text-slate-500">Plazo: <span className="text-slate-300 font-medium">{params.termMonths} meses</span></span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleExportPDF}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-slate-600/50 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all"
                  >
                    <FileDown className="w-4 h-4" />
                    Exportar Plan a PDF
                  </button>
                  <button
                    onClick={handleActivate}
                    disabled={activating || activateSuccess}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Rocket className="w-4 h-4" />
                    {activating ? 'Activando...' : activateSuccess ? 'Crédito Activado' : 'Activar Crédito'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Amortization Table */}
      {result && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden mt-6">
          <div
            className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
            onClick={() => setShowFullTable(!showFullTable)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                <Calculator className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Tabla de Amortización - Sistema Francés</h3>
                <p className="text-xs text-slate-500">{result.rows.length} cuotas | Cuota fija: {formatCurrency(result.monthlyPayment)}</p>
              </div>
            </div>
            {showFullTable ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>

          {(showFullTable ? result.rows : result.rows.slice(0, 5)).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-t border-slate-700/50">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">No. Cuota</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">Fecha Pago</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Costos Asociados</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Saldo Inicio</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Capital</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Interés</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Vr. Cuota</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Saldo Final</th>
                  </tr>
                </thead>
                <tbody>
                  {(showFullTable ? result.rows : result.rows.slice(0, 5)).map((row) => (
                    <tr key={row.installmentNumber} className="border-t border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono tabular-nums">{row.installmentNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{row.paymentDate}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono tabular-nums text-right">
                        {row.associatedCosts > 0 ? formatCurrency(row.associatedCosts) : '--'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono tabular-nums text-right">{formatCurrency(row.openingBalance)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono tabular-nums text-right">{formatCurrency(row.principal)}</td>
                      <td className="px-4 py-3 text-sm text-amber-400/80 font-mono tabular-nums text-right">{formatCurrency(row.interest)}</td>
                      <td className="px-4 py-3 text-sm text-emerald-400 font-mono tabular-nums text-right font-semibold">{formatCurrency(row.paymentAmount)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono tabular-nums text-right">{formatCurrency(row.closingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
                {showFullTable && (
                  <tfoot>
                    <tr className="border-t-2 border-emerald-500/30 bg-emerald-500/5">
                      <td className="px-4 py-3 text-xs font-bold text-emerald-400 uppercase" colSpan={2}>Totales</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-400 font-mono tabular-nums text-right">
                        {formatCurrency(result.rows.reduce((s, r) => s + r.associatedCosts, 0))}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-400 font-mono tabular-nums text-right">
                        {formatCurrency(result.rows.reduce((s, r) => s + r.principal, 0))}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-400 font-mono tabular-nums text-right">
                        {formatCurrency(result.rows.reduce((s, r) => s + r.interest, 0))}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-400 font-mono tabular-nums text-right">
                        {formatCurrency(result.rows.reduce((s, r) => s + r.paymentAmount, 0))}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}