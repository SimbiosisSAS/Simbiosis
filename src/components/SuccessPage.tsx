import { CheckCircle, ArrowRight, Shield, Clock, Mail } from 'lucide-react';

interface SuccessPageProps {
  onBackHome: () => void;
}

export default function SuccessPage({ onBackHome }: SuccessPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-10 md:p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-3">
          Solicitud enviada exitosamente
        </h1>

        <p className="text-slate-600 mb-8 leading-relaxed">
          Tu solicitud de credito ha sido recibida y esta siendo procesada. Recibiras una confirmacion en tu email.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 text-left">
          <h3 className="font-bold text-navy-900 mb-4 text-sm">Proximos pasos</h3>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-600">Revisaremos tu solicitud en las proximas 24-48 horas</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-600">Nuestro equipo se pondra en contacto contigo si necesitamos informacion adicional</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-600">Recibiras una notificacion sobre el estado de tu solicitud</span>
            </li>
          </ol>
        </div>

        <button
          onClick={onBackHome}
          className="btn-primary w-full inline-flex items-center justify-center gap-2"
        >
          Volver al Inicio
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
