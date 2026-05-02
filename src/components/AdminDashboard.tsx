import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditApplication } from '../types';
import { CheckCircle, XCircle, Clock, Eye, Sparkles, Filter } from 'lucide-react';

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
    ENTREPRENEURSHIP: 'Credito para Emprendedores',
    REAL_ESTATE: 'Credito Inmobiliario',
    FREE_INVESTMENT: 'Credito de Libre Inversion',
    MICROCREDIT: 'Microcredito'
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle className="w-4 h-4" /> };
      case 'REJECTED':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <XCircle className="w-4 h-4" /> };
      case 'PENDING':
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock className="w-4 h-4" /> };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: null };
    }
  };

  const filterButtons = [
    { status: 'ALL', label: 'Todas', activeColor: 'bg-navy-800' },
    { status: 'PENDING', label: 'Pendientes', activeColor: 'bg-amber-600' },
    { status: 'APPROVED', label: 'Aprobadas', activeColor: 'bg-emerald-600' },
    { status: 'REJECTED', label: 'Rechazadas', activeColor: 'bg-red-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="container-main py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-navy-700 to-emerald-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-navy-900">Panel Administrativo</h1>
              <p className="text-xs text-slate-500">Gestiona las solicitudes de credito</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-4 h-4" />
            <span>{applications.length} solicitudes</span>
          </div>
        </div>
      </nav>

      <div className="container-main py-8">
        <div className="flex gap-2 mb-8 flex-wrap">
          {filterButtons.map((btn) => (
            <button
              key={btn.status}
              onClick={() => setFilterStatus(btn.status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filterStatus === btn.status
                  ? `${btn.activeColor} text-white shadow-sm`
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="w-8 h-8 border-2 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 text-sm">Cargando solicitudes...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500">No hay solicitudes en este estado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const statusConfig = getStatusConfig(app.status);
                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`bg-white rounded-xl p-5 border-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                        selectedApp?.id === app.id
                          ? 'border-emerald-500 shadow-md'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-navy-900 text-sm">
                            {app.first_name} {app.last_name}
                          </h3>
                          <p className="text-xs text-slate-500 mb-1">{creditTypeLabels[app.credit_type]}</p>
                          <p className="text-xs text-slate-500 truncate">{app.email}</p>
                          <p className="text-lg font-bold text-emerald-600 mt-2">
                            ${app.credit_amount.toLocaleString('es-CO')} COP
                          </p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} flex-shrink-0`}>
                          {statusConfig.icon}
                          <span>{app.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            {selectedApp ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24">
                <h2 className="text-lg font-bold text-navy-900 mb-6">Detalles de la Solicitud</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solicitante</p>
                    <p className="text-base font-bold text-navy-900 mt-1">
                      {selectedApp.first_name} {selectedApp.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Credito</p>
                    <p className="text-sm text-navy-800 mt-1">{creditTypeLabels[selectedApp.credit_type]}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</p>
                    <p className="text-sm text-navy-800 mt-1">{selectedApp.email}</p>
                    <p className="text-sm text-navy-800">{selectedApp.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cedula</p>
                    <p className="text-sm text-navy-800 mt-1">{selectedApp.id_number}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto Solicitado</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">
                      ${selectedApp.credit_amount.toLocaleString('es-CO')} COP
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha de Solicitud</p>
                    <p className="text-sm text-navy-800 mt-1">
                      {new Date(selectedApp.created_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>

                {selectedApp.id_front_image && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cedula - Frontal</p>
                    <img
                      src={selectedApp.id_front_image}
                      alt="ID Front"
                      className="w-full rounded-xl border border-slate-200"
                    />
                  </div>
                )}

                {selectedApp.id_back_image && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cedula - Reverso</p>
                    <img
                      src={selectedApp.id_back_image}
                      alt="ID Back"
                      className="w-full rounded-xl border border-slate-200"
                    />
                  </div>
                )}

                {selectedApp.selfie_image && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Foto de Rostro</p>
                    <img
                      src={selectedApp.selfie_image}
                      alt="Selfie"
                      className="w-full rounded-xl border border-slate-200"
                    />
                  </div>
                )}

                {selectedApp.status === 'PENDING' && (
                  <div className="space-y-3 pt-6 border-t border-slate-200">
                    <button
                      onClick={() => updateStatus(selectedApp.id, 'APPROVED')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => updateStatus(selectedApp.id, 'REJECTED')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Eye className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">Selecciona una solicitud para ver detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
