import { useState } from 'react';
import { CreditType, ApplicationFormData } from '../types';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface ApplicationFormProps {
  creditType: CreditType;
  onSubmit: (data: ApplicationFormData) => void;
  onBack: () => void;
}

const creditTypeLabels: Record<CreditType, string> = {
  ENTREPRENEURSHIP: 'Crédito para Emprendedores',
  REAL_ESTATE: 'Crédito Inmobiliario',
  FREE_INVESTMENT: 'Crédito de Libre Inversión',
  MICROCREDIT: 'Microcrédito'
};

export default function ApplicationForm({ creditType, onSubmit, onBack }: ApplicationFormProps) {
  const [formData, setFormData] = useState<ApplicationFormData>({
    credit_type: creditType,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    id_number: '',
    credit_amount: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'El nombre es requerido';
    if (!formData.last_name.trim()) newErrors.last_name = 'El apellido es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
    if (!formData.id_number.trim()) newErrors.id_number = 'El número de cédula es requerido';
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-32 pb-12">
      <div className="max-w-2xl mx-auto px-6">
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 border border-gray-100">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Información Personal</h1>
            <p className="text-gray-600">Completa tus datos para solicitar: <span className="font-semibold text-orange-600">{creditTypeLabels[creditType]}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    errors.first_name ? 'border-red-500' : 'border-gray-300 focus:border-orange-500'
                  }`}
                  placeholder="Tu nombre"
                />
                {errors.first_name && <p className="text-red-600 text-sm mt-1">{errors.first_name}</p>}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Apellido *
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    errors.last_name ? 'border-red-500' : 'border-gray-300 focus:border-orange-500'
                  }`}
                  placeholder="Tu apellido"
                />
                {errors.last_name && <p className="text-red-600 text-sm mt-1">{errors.last_name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    errors.email ? 'border-red-500' : 'border-gray-300 focus:border-orange-500'
                  }`}
                  placeholder="tu@email.com"
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    errors.phone ? 'border-red-500' : 'border-gray-300 focus:border-orange-500'
                  }`}
                  placeholder="+57 300 000 0000"
                />
                {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label htmlFor="id_number" className="block text-sm font-semibold text-gray-700 mb-2">
                  Número de Cédula *
                </label>
                <input
                  type="text"
                  id="id_number"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    errors.id_number ? 'border-red-500' : 'border-gray-300 focus:border-orange-500'
                  }`}
                  placeholder="1234567890"
                />
                {errors.id_number && <p className="text-red-600 text-sm mt-1">{errors.id_number}</p>}
              </div>

              <div>
                <label htmlFor="credit_amount" className="block text-sm font-semibold text-gray-700 mb-2">
                  Monto Solicitado (COP) *
                </label>
                <input
                  type="number"
                  id="credit_amount"
                  name="credit_amount"
                  value={formData.credit_amount || ''}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none ${
                    errors.credit_amount ? 'border-red-500' : 'border-gray-300 focus:border-orange-500'
                  }`}
                  placeholder="1000000"
                />
                {errors.credit_amount && <p className="text-red-600 text-sm mt-1">{errors.credit_amount}</p>}
              </div>
            </div>

            <div className="flex gap-4 pt-8">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
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
