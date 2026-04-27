import { CheckCircle, ArrowRight } from 'lucide-react';

interface SuccessPageProps {
  onBackHome: () => void;
}

export default function SuccessPage({ onBackHome }: SuccessPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-12 text-center border border-green-200">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-20 h-20 text-green-600" />
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Solicitud Enviada Exitosamente
        </h1>

        <p className="text-xl text-gray-600 mb-8">
          Tu solicitud de crédito ha sido recibida y está siendo procesada. Recibirás una confirmación en tu email.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <h3 className="font-bold text-gray-900 mb-4">Próximos Pasos</h3>
          <ol className="text-left space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="font-bold text-green-600 flex-shrink-0">1.</span>
              <span>Revisaremos tu solicitud en las próximas 24-48 horas</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-green-600 flex-shrink-0">2.</span>
              <span>Nuestro equipo se pondrá en contacto contigo si necesitamos información adicional</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-green-600 flex-shrink-0">3.</span>
              <span>Recibirás una notificación sobre el estado de tu solicitud</span>
            </li>
          </ol>
        </div>

        <button
          onClick={onBackHome}
          className="group bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white px-10 py-4 rounded-lg font-bold text-lg transition-all duration-300 hover:shadow-xl inline-flex items-center gap-2"
        >
          Volver al Inicio
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
