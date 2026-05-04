import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditApplication } from '../types';
import { CheckCircle, XCircle, Clock, Eye, Sparkles, Filter, FileText, Calculator, LogOut } from 'lucide-react';
import LoanOriginationEngine from './LoanOriginationEngine';

type AdminTab = 'solicitudes' | 'simulador';

export default function AdminDashboard({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('solicitudes');
  const [applications, setApplications] = useState<CreditApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<CreditApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    if (activeTab === 'solicitudes') {
      fetchApplications();
    }
  }, [filterStatus, activeTab]);

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
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: <CheckCircle className="w-4 h-4" /> };
      case 'REJECTED':
        return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: <XCircle className="w-4 h-4" /> };
      case 'PENDING':
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: <Clock className="w-4 h-4" /> };
      default:
        return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', icon: null };
    }
  };

  const filterButtons = [
    { status: 'ALL', label: 'Todas', activeColor: 'bg-navy-700' },
    { status: 'PENDING', label: 'Pendientes', activeColor: 'bg-amber-600' },
    { status: 'APPROVED', label: 'Aprobadas', activeColor: 'bg-emerald-600' },
    { status: 'REJECTED', label: 'Rechazadas', activeColor: 'bg-red-600' },
  ];

  const tabs = [
    { id: 'solicitudes' as AdminTab, label: 'Solicitudes Web', icon: FileText },
    { id: 'simulador' as AdminTab, label: 'Simulador de Credito', icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Navigation */}
      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-gradient-to-br from-navy-700 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Core Bancario</h1>
              <p className="text-xs text-slate-500">Simbiosis - Loan Management System</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesion
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {activeTab === 'simulador' ? (
          <LoanOriginationEngine />
        ) : (
          <>
            {/* Filter Buttons */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {filterButtons.map((btn) => (
                <button
                  key={btn.status}
                  onClick={() => setFilterStatus(btn.status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filterStatus === btn.status
                      ? `${btn.activeColor} text-white shadow-sm`
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-auto text-xs text-slate-500">
                <Filter className="w-4 h-4" />
                <span>{applications.length} solicitudes</span>
              </div>
            </div>

            {/* Applications Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {loading ? (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Cargando solicitudes...</p>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center">
                    <div className="w-12 h-12 bg-slate-700/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-slate-500 text-sm">No hay solicitudes en este estado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => {
                      const statusConfig = getStatusConfig(app.status);
                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          className={`bg-slate-800/40 rounded-xl p-5 border cursor-pointer transition-all duration-200 hover:bg-slate-800/60 ${
                            selectedApp?.id === app.id
                              ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                              : 'border-slate-700/50 hover:border-slate-600/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-200 text-sm">
                                {app.first_name} {app.last_name}
                              </h3>
                              <p className="text-xs text-slate-500 mb-1">{creditTypeLabels[app.credit_type]}</p>
                              <p className="text-xs text-slate-500 truncate">{app.email}</p>
                              <p className="text-lg font-bold text-emerald-400 mt-2 font-mono tabular-nums">
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

              {/* Detail Panel */}
              <div>
                {selectedApp ? (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 sticky top-24">
                    <h2 className="text-lg font-bold text-slate-200 mb-6">Detalles de la Solicitud</h2>

                    <div className="space-y-4 mb-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solicitante</p>
                        <p className="text-base font-bold text-slate-200 mt-1">
                          {selectedApp.first_name} {selectedApp.last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Credito</p>
                        <p className="text-sm text-slate-300 mt-1">{creditTypeLabels[selectedApp.credit_type]}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</p>
                        <p className="text-sm text-slate-300 mt-1">{selectedApp.email}</p>
                        <p className="text-sm text-slate-300">{selectedApp.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cedula</p>
                        <p className="text-sm text-slate-300 mt-1">{selectedApp.id_number}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto Solicitado</p>
                        <p className="text-xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">
                          ${selectedApp.credit_amount.toLocaleString('es-CO')} COP
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha de Solicitud</p>
                        <p className="text-sm text-slate-300 mt-1">
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
                          className="w-full rounded-xl border border-slate-700/50"
                        />
                      </div>
                    )}

                    {selectedApp.id_back_image && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cedula - Reverso</p>
                        <img
                          src={selectedApp.id_back_image}
                          alt="ID Back"
                          className="w-full rounded-xl border border-slate-700/50"
                        />
                      </div>
                    )}

                    {selectedApp.selfie_image && (
                      <div className="mb-6">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Foto de Rostro</p>
                        <img
                          src={selectedApp.selfie_image}
                          alt="Selfie"
                          className="w-full rounded-xl border border-slate-700/50"
                        />
                      </div>
                    )}

                    {selectedApp.status === 'PENDING' && (
                      <div className="space-y-3 pt-6 border-t border-slate-700/50">
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
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 text-center">
                    <div className="w-12 h-12 bg-slate-700/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Eye className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-slate-500 text-sm">Selecciona una solicitud para ver detalles</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
