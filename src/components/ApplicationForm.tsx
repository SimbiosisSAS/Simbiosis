import { useState } from 'react';
import { CreditType, ApplicationFormData } from '../types';
import { ArrowRight, ArrowLeft, DollarSign, Briefcase, TrendingUp, User } from 'lucide-react';

interface ApplicationFormProps {
  creditType: CreditType;
  onSubmit: (data: ApplicationFormData) => void;
  onBack: () => void;
}

const creditTypeLabels: Record<CreditType, string> = {
  ENTREPRENEURSHIP: 'Credito para Emprendedores',
  REAL_ESTATE: 'Credito Inmobiliario',
  FREE_INVESTMENT: 'Credito de Libre Inversion',
  MICROCREDIT: 'Microcredito'
};

const calcularScore = (data: any): { score: number; result: string; razones: string[] } => {
  const razones: string[] = [];
  const tasa = 0.015;
  const meses = 12;
  const cuotaEstimada = data.credit_amount > 0
    ? data.credit_amount * (tasa * Math.pow(1 + tasa, meses)) / (Math.pow(1 + tasa, meses) - 1)
    : 0;

  const ingresoDisponible = data.monthly_income - data.monthly_expenses - data.other_debts;
  const ratio = cuotaEstimada > 0 ? ingresoDisponible / cuotaEstimada : 0;
  const relacionMonto = data.monthly_income > 0 ? data.credit_amount / data.monthly_income : 99;
  const relacionGastos = data.monthly_income > 0 ? (data.monthly_expenses / data.monthly_income) : 1;

  // Factor 1: Capacidad de pago (40%)
  let scoreCapacidad = ratio >= 3 ? 100 : ratio >= 2 ? 80 : ratio >= 1.5 ? 60 : ratio >= 1.2 ? 40 : 10;
  if (scoreCapacidad < 40) razones.push('Capacidad de pago insuficiente para cubrir la cuota mensual');

  // Factor 2: Relación monto solicitado vs ingreso (20%)
  let scoreMonto = relacionMonto <= 3 ? 100 : relacionMonto <= 5 ? 70 : relacionMonto <= 8 ? 40 : 10;
  if (scoreMonto < 40) razones.push('Monto solicitado muy alto en relación con los ingresos mensuales');

  // Factor 3: Estabilidad laboral (25%)
  let scoreEstabilidad = data.employment_months >= 24 ? 100 : data.employment_months >= 12 ? 75 : data.employment_months >= 6 ? 50 : 25;
  if (scoreEstabilidad < 50) razones.push('Tiempo en empleo o negocio actual insuficiente');

  // Factor 4: Tipo de empleo (10%)
  let scoreEmpleo = data.employment_type === 'empleado' ? 100 : data.employment_type === 'empresario' ? 80 : 60;

  // Factor 5: Nivel de gastos vs ingreso (5%)
  let scoreGastos = relacionGastos <= 0.4 ? 100 : relacionGastos <= 0.6 ? 70 : relacionGastos <= 0.7 ? 40 : 10;
  if (scoreGastos < 40) razones.push('Nivel de gastos mensuales muy elevado respecto a los ingresos');

  const scoreTotal = Math.round(
    scoreCapacidad * 0.40 +
    scoreMonto * 0.20 +
    scoreEstabilidad * 0.25 +
    scoreEmpleo * 0.10 +
    scoreGastos * 0.05
  );

  const result = scoreTotal >= 75 ? 'APROBADO' : scoreTotal >= 55 ? 'REVISAR' : 'RECHAZAR';
  if (razones.length === 0 && result === 'REVISAR') razones.push('Perfil requiere verificación adicional de documentos');

  return { score: scoreTotal, result, razones };
};

export default function ApplicationForm({ creditType, onSubmit, onBack }: ApplicationFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<ApplicationFormData>({
    credit_type: creditType,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    credit_amount: 0,
    whatsapp_consent: false,
    monthly_income: 0,
    employment_type: '',
    employment_months: 0,
    monthly_expenses: 0,
    other_debts: 0,
    credit_score: 0,
    score_result: 'PENDIENTE',
  } as any);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'El nombre es requerido';
    if (!formData.last_name.trim()) newErrors.last_name = 'El apellido es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
    if (!formData.id_number.trim()) newErrors.id_number = 'La cédula es requerida';
    if (!formData.credit_amount || formData.credit_amount <= 0) newErrors.credit_amount = 'Ingresa un monto válido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!(formData as any).monthly_income || (formData as any).monthly_income <= 0) newErrors.monthly_income = 'Ingresa tus ingresos mensuales';
    if (!(formData as any).employment_type) newErrors.employment_type = 'Selecciona tu tipo de empleo';
    if (!(formData as any).employment_months || (formData as any).employment_months <= 0) newErrors.employment_months = 'Ingresa el tiempo en tu trabajo/negocio';
    if ((formData as any).monthly_expenses === undefined || (formData as any).monthly_expenses < 0) newErrors.monthly_expenses = 'Ingresa tus gastos mensuales';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    const { score, result } = calcularScore(formData);
    onSubmit({
    ...formData,
    credit_score: score,
    score_result: result,
    score_razones: razones.join(' | '),
  } as any);
};

  const fmt = (val: number) => '$ ' + Math.round(val).toLocaleString('es-CO');

  const inputClass = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all text-sm';
  const labelClass = 'block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5';
  const errorClass = 'text-red-500 text-xs mt-1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 mb-4">
            <span className="text-emerald-600 text-xs font-semibold">{creditTypeLabels[creditType]}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Solicitud de Crédito</h1>
          <p className="text-slate-500 text-sm mt-1">Paso {step} de 2</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          <div className="flex-1 h-1.5 rounded-full bg-emerald-500" />
          <div className={`flex-1 h-1.5 rounded-full ${step === 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          {/* PASO 1 — INFORMACIÓN PERSONAL */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Información Personal</h2>
                  <p className="text-xs text-slate-500">Datos de identificación</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nombre *</label>
                    <input type="text" value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} className={inputClass} placeholder="Tu nombre" />
                    {errors.first_name && <p className={errorClass}>{errors.first_name}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Apellido *</label>
                    <input type="text" value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} className={inputClass} placeholder="Tu apellido" />
                    {errors.last_name && <p className={errorClass}>{errors.last_name}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className={inputClass} placeholder="tu@email.com" />
                  {errors.email && <p className={errorClass}>{errors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Teléfono *</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className={inputClass} placeholder="300 000 0000" />
                    {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Número de Cédula *</label>
                    <input type="text" value={formData.id_number} onChange={e => setFormData(p => ({ ...p, id_number: e.target.value }))} className={inputClass} placeholder="12345678" />
                    {errors.id_number && <p className={errorClass}>{errors.id_number}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Monto Solicitado (COP) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                    <input type="number" value={formData.credit_amount || ''} onChange={e => setFormData(p => ({ ...p, credit_amount: Number(e.target.value) }))} className={`${inputClass} pl-8`} placeholder="5,000,000" min="0" />
                  </div>
                  {errors.credit_amount && <p className={errorClass}>{errors.credit_amount}</p>}
                </div>

                <label className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={(formData as any).whatsapp_consent} onChange={e => setFormData(p => ({ ...p, whatsapp_consent: e.target.checked }))} className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-slate-600">Autorizo a <strong>Simbiosis</strong> a enviarme recordatorios de pago y notificaciones por WhatsApp.</span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onBack} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Atrás
                  </button>
                  <button type="button" onClick={handleNext} className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                    Siguiente <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2 — INFORMACIÓN FINANCIERA */}
          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Información Financiera</h2>
                  <p className="text-xs text-slate-500">Nos ayuda a evaluar tu solicitud</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Tipo de Empleo / Actividad *</label>
                  <select value={(formData as any).employment_type} onChange={e => setFormData(p => ({ ...p, employment_type: e.target.value } as any))} className={inputClass}>
                    <option value="">Selecciona una opción</option>
                    <option value="empleado">Empleado (contrato laboral)</option>
                    <option value="independiente">Trabajador Independiente</option>
                    <option value="empresario">Empresario / Dueño de negocio</option>
                  </select>
                  {errors.employment_type && <p className={errorClass}>{errors.employment_type}</p>}
                </div>

                <div>
                  <label className={labelClass}>Tiempo en tu trabajo o negocio actual *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Menos de 6 meses', value: 3 },
                      { label: '6 a 12 meses', value: 9 },
                      { label: '1 a 2 años', value: 18 },
                      { label: 'Más de 2 años', value: 30 },
                    ].map(opt => (
                      <label key={opt.value} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${(formData as any).employment_months === opt.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="employment_months" value={opt.value} checked={(formData as any).employment_months === opt.value} onChange={() => setFormData(p => ({ ...p, employment_months: opt.value } as any))} className="text-emerald-500" />
                        <span className="text-xs text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.employment_months && <p className={errorClass}>{errors.employment_months}</p>}
                </div>

                <div>
                  <label className={labelClass}>Ingresos Mensuales (COP) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" value={(formData as any).monthly_income || ''} onChange={e => setFormData(p => ({ ...p, monthly_income: Number(e.target.value) } as any))} className={`${inputClass} pl-8`} placeholder="3,000,000" min="0" />
                  </div>
                  {errors.monthly_income && <p className={errorClass}>{errors.monthly_income}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Gastos Mensuales *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" value={(formData as any).monthly_expenses || ''} onChange={e => setFormData(p => ({ ...p, monthly_expenses: Number(e.target.value) } as any))} className={`${inputClass} pl-8`} placeholder="1,500,000" min="0" />
                    </div>
                    {errors.monthly_expenses && <p className={errorClass}>{errors.monthly_expenses}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Otras Deudas Mensuales</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" value={(formData as any).other_debts || ''} onChange={e => setFormData(p => ({ ...p, other_debts: Number(e.target.value) } as any))} className={`${inputClass} pl-8`} placeholder="0" min="0" />
                    </div>
                  </div>
                </div>

                {/* Score preview en tiempo real */}
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3">
  <p className="text-xs text-slate-500 text-center">
    📋 Tu solicitud será evaluada por nuestro equipo en las próximas horas hábiles.
  </p>
</div>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setStep(1)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                  Enviar Solicitud <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}