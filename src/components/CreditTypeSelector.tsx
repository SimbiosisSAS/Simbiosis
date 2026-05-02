import { CreditType } from '../types';
import { TrendingUp, Building2, Target, Zap, ArrowRight, ArrowLeft } from 'lucide-react';

interface CreditTypeSelectorProps {
  onSelect: (type: CreditType) => void;
  onBack: () => void;
}

export default function CreditTypeSelector({ onSelect, onBack }: CreditTypeSelectorProps) {
  const creditTypes = [
    {
      id: 'ENTREPRENEURSHIP' as CreditType,
      title: 'Credito para Emprendedores',
      description: 'Impulsa el crecimiento de tu empresa con nuestro credito disenado para emprendedores. Acceso rapido y requisitos flexibles.',
      icon: TrendingUp,
      gradient: 'from-navy-700 to-navy-800',
      bgHover: 'hover:border-navy-600/50',
      features: ['Aprobacion 24-48h', 'Montos flexibles']
    },
    {
      id: 'REAL_ESTATE' as CreditType,
      title: 'Credito Inmobiliario',
      description: 'Realiza tu sueno de tener una propiedad con plazos extendidos y tasas competitivas respaldadas por analisis especializado.',
      icon: Building2,
      gradient: 'from-emerald-500 to-emerald-600',
      bgHover: 'hover:border-emerald-500/50',
      features: ['Plazos hasta 20 anos', 'Cobertura de seguros']
    },
    {
      id: 'FREE_INVESTMENT' as CreditType,
      title: 'Credito de Libre Inversion',
      description: 'Invierte en lo que quieras sin restricciones. Desde consumo personal hasta proyectos empresariales de gran escala.',
      icon: Target,
      gradient: 'from-navy-600 to-emerald-500',
      bgHover: 'hover:border-emerald-500/50',
      features: ['Sin restricciones', 'Desembolso inmediato']
    },
    {
      id: 'MICROCREDIT' as CreditType,
      title: 'Microcredito',
      description: 'Acceso rapido a credito para pequenos negocios. Procesos agiles y aprobacion en tiempo record con requisitos minimos.',
      icon: Zap,
      gradient: 'from-emerald-600 to-navy-700',
      bgHover: 'hover:border-emerald-500/50',
      features: ['Requisitos minimos', 'Desde $500K COP']
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-16">
      <div className="container-main">
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-slate-600 hover:text-navy-700 font-medium transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Volver
        </button>

        <div className="text-center mb-16">
          <div className="badge bg-emerald-50 border border-emerald-200 text-emerald-700 mb-6 mx-auto">
            <Zap className="w-3.5 h-3.5" />
            <span>Soluciones</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-navy-900 mb-4 tracking-tight">Elige tu tipo de credito</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Selecciona la opcion que mejor se adapte a las necesidades de tu empresa</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {creditTypes.map((credit) => {
            const Icon = credit.icon;
            return (
              <button
                key={credit.id}
                onClick={() => onSelect(credit.id)}
                className={`bg-white border border-slate-200 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group ${credit.bgHover}`}
              >
                <div className={`inline-flex bg-gradient-to-r ${credit.gradient} text-white w-14 h-14 rounded-xl items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">{credit.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-5">{credit.description}</p>
                <div className="flex items-center gap-4 mb-5">
                  {credit.features.map((feature, idx) => (
                    <span key={idx} className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">{feature}</span>
                  ))}
                </div>
                <div className="flex items-center text-emerald-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
