import { useState } from 'react';
import { CreditType, ApplicationFormData } from '../types';
import { ArrowRight, ArrowLeft } from 'lucide-react';

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

export default function ApplicationForm({ creditType, onSubmit, onBack }: ApplicationFormProps) {
  const [formData, setFormData] = useState<ApplicationFormData>({
    credit_type: creditType,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    credit_amount: 0,
    whatsapp_consent: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'El nombre es requerido';
    if (!formData.last_name.trim()) newErrors.last_name = 'El apellido es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email invalido';
    if (!formData.id_number.trim()) newErrors.id_number = 'El numero de cedula es requerido';
    if (formData.credit_amount <= 0) newErrors.credit_amount = 'El monto debe ser mayor a 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'credit_amount' ? parseFloat(value) || 0 : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, whatsapp_consent: e.target.checked }));
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-slate-600 hover:text-navy-700 font-medium transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Volver
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-2">Informacion Personal</h1>
            <p className="text-slate-600 text-sm">
              Completa tus datos para solicitar:{' '}
              <span className="font-semibold text-emerald-600">{creditTypeLabels[creditType]}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="first_name" className="block text-sm font-semibold text-navy-800 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`input-field ${errors.first_name ? 'input-field-error' : ''}`}
                  placeholder="Tu nombre"
                />
                {errors.first_name && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.first_name}</p>}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-semibold text-navy-800 mb-2">
                  Apellido *
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`input-field ${errors.last_name ? 'input-field-error' : ''}`}
                  placeholder="Tu apellido"
                />
                {errors.last_name && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.last_name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-navy-800 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field ${errors.email ? 'input-field-error' : ''}`}
                  placeholder="tu@email.com"
                />
                {errors.email && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-navy-800 mb-2">
                  Telefono *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`input-field ${errors.phone ? 'input-field-error' : ''}`}
                  placeholder="+57 300 000 0000"
                />
                {errors.phone && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.phone}</p>}
              </div>

              <div>
                <label htmlFor="id_number" className="block text-sm font-semibold text-navy-800 mb-2">
                  Numero de Cedula *
                </label>
                <input
                  type="text"
                  id="id_number"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleChange}
                  className={`input-field ${errors.id_number ? 'input-field-error' : ''}`}
                  placeholder="1234567890"
                />
                {errors.id_number && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.id_number}</p>}
              </div>

              <div>
                <label htmlFor="credit_amount" className="block text-sm font-semibold text-navy-800 mb-2">
                  Monto Solicitado (COP) *
                </label>
                <input
                  type="number"
                  id="credit_amount"
                  name="credit_amount"
                  value={formData.credit_amount || ''}
                  onChange={handleChange}
                  className={`input-field ${errors.credit_amount ? 'input-field-error' : ''}`}
                  placeholder="1000000"
                />
                {errors.credit_amount && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.credit_amount}</p>}
              </div>
            </div>

            {/* Autorización WhatsApp */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.whatsapp_consent}
                  onChange={handleCheckbox}
                  className="mt-0.5 h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 leading-relaxed">
                  Autorizo a{' '}
                  <span className="font-semibold text-emerald-700">Simbiosis</span>{' '}
                  a enviarme recordatorios de pago y comunicaciones sobre mi crédito por{' '}
                  <span className="font-semibold">WhatsApp</span> al número registrado en esta solicitud.
                </span>
              </label>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 btn-secondary"
              >
                Atras
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
              >
                Continuar
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}