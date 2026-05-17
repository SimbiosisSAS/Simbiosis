import { useState, useMemo, useEffect } from 'react';
import { X, Calculator, TrendingUp, Clock, DollarSign, PieChart, ChevronRight, Info } from 'lucide-react';

interface CreditDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
}

const creditTypes = [
  { id: 'ENTREPRENEURSHIP', label: 'Emprendedores', rate: 1.8, minAmount: 5000000, maxAmount: 200000000, minTerm: 6, maxTerm: 60, color: 'from-navy-700 to-navy-800' },
  { id: 'REAL_ESTATE', label: 'Inmobiliario', rate: 1.2, minAmount: 20000000, maxAmount: 500000000, minTerm: 12, maxTerm: 240, color: 'from-emerald-500 to-emerald-600' },
  { id: 'FREE_INVESTMENT', label: 'Libre Inversion', rate: 2.1, minAmount: 2000000, maxAmount: 100000000, minTerm: 6, maxTerm: 48, color: 'from-navy-600 to-emerald-500' },
  { id: 'MICROCREDIT', label: 'Microcredito', rate: 2.5, minAmount: 500000, maxAmount: 10000000, minTerm: 3, maxTerm: 24, color: 'from-emerald-600 to-navy-700' },
];

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CreditDemoModal({ isOpen, onClose, onApply }: CreditDemoModalProps) {
  const [selectedType, setSelectedType] = useState(0);
  const [amount, setAmount] = useState(50000000);
  const [term, setTerm] = useState(24);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const currentType = creditTypes[selectedType];

  useEffect(() => {
    setAmount(currentType.minAmount + Math.floor((currentType.maxAmount - currentType.minAmount) * 0.3));
    setTerm(Math.floor((currentType.minTerm + currentType.maxTerm) / 2));
    setShowBreakdown(false);
  }, [selectedType]);

  const calculations = useMemo(() => {
    const monthlyRate = currentType.rate / 100;
    const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    const totalPayment = monthlyPayment * term;
    const totalInterest = totalPayment - amount;
    const interestPercentage = (totalInterest / totalPayment) * 100;
    const principalPercentage = (amount / totalPayment) * 100;

    const schedule = [];
    let balance = amount;
    for (let i = 1; i <= Math.min(term, 6); i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;
      schedule.push({
        month: i,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
      });
    }

    return { monthlyPayment, totalPayment, totalInterest, interestPercentage, principalPercentage, schedule };
  }, [amount, term, currentType]);

  const amountPercent = ((amount - currentType.minAmount) / (currentType.maxAmount - currentType.minAmount)) * 100;
  const termPercent = ((term - currentType.minTerm) / (currentType.maxTerm - currentType.minTerm)) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-8 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${currentType.color} rounded-xl flex items-center justify-center shadow-sm`}>
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-900">Simulador de Credito</h2>
              <p className="text-xs text-slate-500">Estima tu cuota mensual en tiempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Credit Type Selector */}
          <div>
            <label className="block text-sm font-semibold text-navy-800 mb-3">Tipo de Credito</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {creditTypes.map((type, idx) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(idx)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border-2 ${
                    selectedType === idx
                      ? `bg-gradient-to-r ${type.color} text-white border-transparent shadow-sm`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-navy-800">Monto del Credito</label>
              <span className="text-sm font-bold text-emerald-600">{formatCOP(amount)}</span>
            </div>
            <input
              type="range"
              min={currentType.minAmount}
              max={currentType.maxAmount}
              step={currentType.minAmount >= 20000000 ? 5000000 : 500000}
              value={amount}
              onChange={(e) => { setAmount(Number(e.target.value)); setShowBreakdown(false); }}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
              style={{
                background: `linear-gradient(to right, #00C9A7 0%, #00C9A7 ${amountPercent}%, #E2E8F0 ${amountPercent}%, #E2E8F0 100%)`
              }}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-400">{formatCOP(currentType.minAmount)}</span>
              <span className="text-[10px] text-slate-400">{formatCOP(currentType.maxAmount)}</span>
            </div>
          </div>

          {/* Term Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-navy-800">Plazo</label>
              <span className="text-sm font-bold text-emerald-600">{term} meses</span>
            </div>
            <input
              type="range"
              min={currentType.minTerm}
              max={currentType.maxTerm}
              step={1}
              value={term}
              onChange={(e) => { setTerm(Number(e.target.value)); setShowBreakdown(false); }}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
              style={{
                background: `linear-gradient(to right, #00C9A7 0%, #00C9A7 ${termPercent}%, #E2E8F0 ${termPercent}%, #E2E8F0 100%)`
              }}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-400">{currentType.minTerm} meses</span>
              <span className="text-[10px] text-slate-400">{currentType.maxTerm} meses</span>
            </div>
          </div>

          {/* Rate Info */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500">Tasa mensual estimada: <span className="font-bold text-navy-700">{currentType.rate}%</span></span>
          </div>

          {/* Results */}
          <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px]" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-navy-400/10 rounded-full blur-[50px]" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cuota Mensual Estimada</span>
              </div>
              <p className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                {formatCOP(calculations.monthlyPayment)}
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-navy-800/60 rounded-xl p-3 border border-navy-700/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Capital</span>
                  </div>
                  <p className="text-sm font-bold text-white">{formatCOP(amount)}</p>
                </div>
                <div className="bg-navy-800/60 rounded-xl p-3 border border-navy-700/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Intereses</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-400">{formatCOP(calculations.totalInterest)}</p>
                </div>
                <div className="bg-navy-800/60 rounded-xl p-3 border border-navy-700/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total</span>
                  </div>
                  <p className="text-sm font-bold text-white">{formatCOP(calculations.totalPayment)}</p>
                </div>
              </div>

              {/* Visual Breakdown Bar */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Distribucion del pago total</span>
                </div>
                <div className="h-3 bg-navy-700 rounded-full overflow-hidden flex">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-500"
                    style={{ width: `${calculations.principalPercentage}%` }}
                  />
                  <div
                    className="bg-gradient-to-r from-navy-400 to-navy-300 rounded-r-full transition-all duration-500"
                    style={{ width: `${calculations.interestPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    <span className="text-[10px] text-slate-400">Capital {calculations.principalPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-navy-400" />
                    <span className="text-[10px] text-slate-400">Intereses {calculations.interestPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Amortization Preview */}
          <div>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-emerald-600 transition-colors"
            >
              <PieChart className="w-4 h-4" />
              {showBreakdown ? 'Ocultar' : 'Ver'} tabla de amortizacion
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showBreakdown ? 'rotate-90' : ''}`} />
            </button>

            {showBreakdown && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Mes</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Cuota</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Capital</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Interes</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.schedule.map((row) => (
                      <tr key={row.month} className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                        <td className="px-4 py-2.5 text-slate-700 font-medium">{row.month}</td>
                        <td className="px-4 py-2.5 text-right text-navy-800 font-semibold">{formatCOP(row.payment)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">{formatCOP(row.principal)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{formatCOP(row.interest)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{formatCOP(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {term > 6 && (
                  <div className="px-4 py-2.5 text-center text-[10px] text-slate-400 bg-slate-50 border-t border-slate-200">
                    Mostrando 6 de {term} meses
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 rounded-b-3xl px-8 py-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary !py-3"
          >
            Cerrar
          </button>
          <button
            onClick={() => { onClose(); onApply(); }}
            className="flex-1 btn-primary !py-3 inline-flex items-center justify-center gap-2"
          >
            Solicitar este Credito
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
