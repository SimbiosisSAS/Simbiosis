import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditApplication } from '../types';
import { CheckCircle, XCircle, Clock, Eye, Download } from 'lucide-react';

export default function AdminDashboard() {
  const [applications, setApplications] = useState<CreditApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<CreditApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchApplications();
  }, [filterStatus]);

  const fetchApplications = async () => {
    setLoading(true);
    let query = supabase
      .from('credit_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'ALL') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase
      .from('credit_applications')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', appId);

    if (!error) {
      fetchApplications();
      if (selectedApp?.id === appId) {
        setSelectedApp(null);
      }
    }
  };

  const creditTypeLabels: Record<string, string> = {
    ENTREPRENEURSHIP: 'Crédito para Emprendedores',
    REAL_ESTATE: 'Crédito Inmobiliario',
    FREE_INVESTMENT: 'Crédito de Libre Inversión',
    MICROCREDIT: 'Microcrédito'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5" />;
      case 'PENDING':
        return <Clock className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Panel Administrativo</h1>
          <p className="text-gray-600 text-sm">Gestiona las solicitudes de crédito</p>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'ALL'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'PENDING'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'APPROVED'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'REJECTED'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Rechazadas
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Cargando solicitudes...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-600">No hay solicitudes en este estado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className={`bg-white rounded-lg p-6 border-2 cursor-pointer transition-all ${
                      selectedApp?.id === app.id
                        ? 'border-orange-500 shadow-lg'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">
                          {app.first_name} {app.last_name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{creditTypeLabels[app.credit_type]}</p>
                        <p className="text-sm text-gray-600">Email: {app.email}</p>
                        <p className="text-sm text-gray-600">Cédula: {app.id_number}</p>
                        <p className="text-lg font-bold text-orange-600 mt-2">
                          ${app.credit_amount.toLocaleString('es-CO')} COP
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(app.status)}`}>
                        {getStatusIcon(app.status)}
                        <span className="text-sm font-semibold">{app.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {selectedApp ? (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Detalles de la Solicitud</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Solicitante</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedApp.first_name} {selectedApp.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Tipo de Crédito</p>
                    <p className="text-gray-900">{creditTypeLabels[selectedApp.credit_type]}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Contacto</p>
                    <p className="text-gray-900">{selectedApp.email}</p>
                    <p className="text-gray-900">{selectedApp.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Cédula</p>
                    <p className="text-gray-900">{selectedApp.id_number}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Monto Solicitado</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${selectedApp.credit_amount.toLocaleString('es-CO')} COP
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Fecha de Solicitud</p>
                    <p className="text-gray-900">
                      {new Date(selectedApp.created_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>

                {selectedApp.id_front_image && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Cédula - Frontal</p>
                    <img
                      src={selectedApp.id_front_image}
                      alt="ID Front"
                      className="w-full rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {selectedApp.id_back_image && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Cédula - Reverso</p>
                    <img
                      src={selectedApp.id_back_image}
                      alt="ID Back"
                      className="w-full rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {selectedApp.selfie_image && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Foto de Rostro</p>
                    <img
                      src={selectedApp.selfie_image}
                      alt="Selfie"
                      className="w-full rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {selectedApp.status === 'PENDING' && (
                  <div className="space-y-3 pt-6 border-t">
                    <button
                      onClick={() => updateStatus(selectedApp.id, 'APPROVED')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => updateStatus(selectedApp.id, 'REJECTED')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Selecciona una solicitud para ver detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
