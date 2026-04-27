import { CreditType } from '../types';
import { TrendingUp, Building2, Target, Zap, ArrowRight } from 'lucide-react';

interface CreditTypeSelectorProps {
  onSelect: (type: CreditType) => void;
  onBack: () => void;
}

export default function CreditTypeSelector({ onSelect, onBack }: CreditTypeSelectorProps) {
  const creditTypes = [
    {
      id: 'ENTREPRENEURSHIP' as CreditType,
      title: 'Crédito para Emprendedores',
      description: 'Impulsa el crecimiento de tu empresa con nuestro crédito diseñado para emprendedores. Acceso rápido y requisitos flexibles.',
      icon: TrendingUp,
      color: 'from-red-600 to-red-700',
      bgColor: 'bg-red-50'
    },
    {
      id: 'REAL_ESTATE' as CreditType,
      title: 'Crédito Inmobiliario',
      description: 'Realiza tu sueño de tener una propiedad con nuestro crédito inmobiliario. Plazos extendidos y tasas competitivas.',
      icon: Building2,
      color: 'from-orange-600 to-orange-700',
      bgColor: 'bg-orange-50'
    },
    {
      id: 'FREE_INVESTMENT' as CreditType,
      title: 'Crédito de Libre Inversión',
      description: 'Invierte en lo que quieras sin restricciones. Desde consumo personal hasta proyectos empresariales.',
      icon: Target,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50'
    },
    {
      id: 'MICROCREDIT' as CreditType,
      title: 'Microcrédito',
      description: 'Acceso rápido a crédito para pequeños negocios. Procesos ágiles y aprobación en tiempo récord.',
      icon: Zap,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-32 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <button
          onClick={onBack}
          className="mb-8 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          ← Volver
        </button>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Elige tu Tipo de Crédito</h1>
          <p className="text-xl text-gray-600">Selecciona la opción que mejor se adapte a tus necesidades</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {creditTypes.map((credit) => {
            const Icon = credit.icon;
            return (
              <button
                key={credit.id}
                onClick={() => onSelect(credit.id)}
                className={`${credit.bgColor} border-2 border-gray-200 hover:border-orange-500 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-2 group`}
              >
                <div className={`inline-flex bg-gradient-to-r ${credit.color} text-white w-16 h-16 rounded-xl items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{credit.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{credit.description}</p>
                <div className="flex items-center text-orange-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Continuar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
