import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditApplication } from '../types';
import { CheckCircle, XCircle, Clock, Eye, Sparkles, Filter, FileText, Calculator, LogOut, Wallet, DollarSign } from 'lucide-react';
import LoanOriginationEngine from './LoanOriginationEngine';

type AdminTab = 'solicitudes' | 'cartera' | 'simulador';

export default function AdminDashboard({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('solicitudes');
  const [applications, setApplications] = useState<CreditApplication[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para detalles
  const [selectedApp, setSelectedApp] = useState<CreditApplication | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [loanInstallments, setLoanInstallments] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Estados para el Modal de Pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any | null>(null);
  const [paymentData, setPaymentData] = useState({
    actualDate: new Date().toISOString().split('T')[0],
    actualAmount: 0,
    lateFee: 0
  });

  useEffect(() => {
    if (activeTab === 'solicitudes') {
      fetchApplications();
    } else if (activeTab === 'cartera') {
      fetchActiveLoans();
      setSelectedLoan(null);
    }
  }, [filterStatus, activeTab]);

  // Cargar Solicitudes Web
  const fetchApplications = async () => {
    setLoading(true);
    let query = supabase.from('credit_applications').select('*').order('created_at', { ascending: false });
    if (filterStatus !== 'ALL') query = query.eq('status', filterStatus);
    const { data, error } = await query;
    if (!error) setApplications(data || []);
    setLoading(false);
  };

  // Cargar Cartera Activa
  const fetchActiveLoans = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('active_loans').select('*').order('created_at', { ascending: false });
    if (!error) setActiveLoans(data || []);
    setLoading(false);
  };

  // Cargar las Cuotas de un Crédito Específico
  const fetchInstallments = async (loanId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loan_installments')
      .select('*')
      .eq('loan_id', loanId)
      .order('installment_number', { ascending: true });
    
    if (!error) setLoanInstallments(data || []);
    setLoading(false);
  };

  // Seleccionar un Crédito para ver detalles
  const handleSelectLoan = (loan: any) => {
    setSelectedLoan(loan);
    fetchInstallments(loan.id);
  };

  // Abrir Modal de Pago
  const openPaymentModal = (installment: any) => {
    setSelectedInstallment(installment);
    setPaymentData({
      actualDate: new Date().toISOString().split('T')[0],
      actualAmount: installment.expected_amount,
      lateFee: 0
    });
    setShowPaymentModal(true);
  };

  // Registrar el Pago en Supabase
  const handleRegisterPayment = async () => {
    if (!selectedInstallment) return;
    
    try {
      const status = paymentData.lateFee > 0 ? 'LATE' : 'PAID';
      
      const { error } = await supabase
        .from('loan_installments')
        .update({
          status: status,
          actual_payment_date: paymentData.actualDate,
          actual_amount_paid: paymentData.actualAmount,
          late_fee_charged: paymentData.lateFee
        })
        .eq('id', selectedInstallment.id);

      if (error) throw error;
      
      alert('¡Pago registrado con éxito!');
      setShowPaymentModal(false);
      fetchInstallments(selectedLoan.id); // Recargar la tabla de cuotas
      
    } catch (err: any) {
      alert('Error al registrar pago: ' + err.message);
    }
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from('credit_applications').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', appId);
    if (!error) {
      fetchApplications();
      setSelectedApp(null);
    }
  };

  const formatCurrency = (val: number) => '$ ' + Number(val).toLocaleString('es-CO');

  return (
    <div className="min-h-screen bg-slate-950 pb-12">
      {/* NAVEGACIÓN SUPERIOR */}
      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-gradient-to-br from-navy-700 to-emerald-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Core Bancario</h1>
              <p className="text-xs text-slate-500">Simbiosis - Loan Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
            <button onClick={() => setActiveTab('solicitudes')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'solicitudes' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}><FileText className="w-4 h-4"/> Solicitudes Web</button>
            <button onClick={() => setActiveTab('cartera')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'cartera' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}><Wallet className="w-4 h-4"/> Cartera Activa</button>
            <button onClick={() => setActiveTab('simulador')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'simulador' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}><Calculator className="w-4 h-4"/> Simulador de Crédito</button>
          </div>

          {onLogout && (
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10">
              <LogOut className="w-4 h-4" /> Cerrar
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* PESTAÑA 1: SIMULADOR */}
        {activeTab === 'simulador' && <LoanOriginationEngine />}

        {/* PESTAÑA 2: CARTERA ACTIVA (Y GESTIÓN DE PAGOS) */}
        {activeTab === 'cartera' && (
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Lista de Créditos (Izquierda) */}
            <div className={`${selectedLoan ? 'lg:col-span-1' : 'lg:col-span-3'} bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all`}>
              <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Créditos Otorgados</h2>
                {!selectedLoan && (
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Total Colocado</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(activeLoans.reduce((sum, loan) => sum + Number(loan.principal_amount), 0))}</p>
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase border-b border-slate-700/50">
                    <tr>
                      <th className="p-4">Cliente</th>
                      <th className="p-4 text-right">Monto</th>
                      {!selectedLoan && <th className="p-4 text-center">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {activeLoans.map(loan => (
                      <tr key={loan.id} onClick={() => handleSelectLoan(loan)} className={`cursor-pointer transition-colors ${selectedLoan?.id === loan.id ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : 'hover:bg-slate-700/20'}`}>
                        <td className="p-4">
                          <p className="font-bold text-slate-200 text-sm">{loan.client_name}</p>
                          <p className="text-xs text-slate-500 font-mono">{loan.client_id_number}</p>
                        </td>
                        <td className="p-4 text-sm font-bold text-emerald-400 text-right">
                          {formatCurrency(loan.principal_amount)}
                        </td>
                        {!selectedLoan && (
                          <td className="p-4 text-center">
                            <button className="p-2 text-slate-400 hover:text-emerald-400"><Eye size={18}/></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detalles del Crédito y Tabla de Amortización (Derecha) */}
            {selectedLoan && (
              <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedLoan.client_name}</h2>
                    <p className="text-slate-400">ID: {selectedLoan.client_id_number} | Desembolso: {new Date(selectedLoan.disbursement_date).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => setSelectedLoan(null)} className="text-slate-500 hover:text-white">Cerrar vista</button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase">Capital Inicial</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(selectedLoan.principal_amount)}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase">Cuota Mensual</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(selectedLoan.fixed_quota_amount)}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase">Progreso</p>
                    <p className="text-lg font-bold text-slate-300">
                      {loanInstallments.filter(i => i.status !== 'PENDING').length} / {selectedLoan.installments} cuotas
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-4">Gestión de Pagos (Amortización)</h3>
                
                {loading ? <p className="text-slate-400">Cargando cuotas...</p> : (
                  <div className="overflow-x-auto bg-slate-900/30 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-900/80 text-slate-400 text-xs border-b border-slate-700/50">
                        <tr>
                          <th className="p-3">Nº</th>
                          <th className="p-3">Fecha Esperada</th>
                          <th className="p-3 text-right">Cuota Esperada</th>
                          <th className="p-3 text-center">Estado</th>
                          <th className="p-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {loanInstallments.map(inst => (
                          <tr key={inst.id} className="hover:bg-slate-800/50">
                            <td className="p-3 text-slate-300 font-mono">{inst.installment_number}</td>
                            <td className="p-3 text-slate-400">{inst.expected_payment_date}</td>
                            <td className="p-3 font-medium text-emerald-400 text-right">{formatCurrency(inst.expected_amount)}</td>
                            <td className="p-3 text-center">
                              {inst.status === 'PAID' ? <span className="text-green-500">Pagado</span> : 
                               inst.status === 'LATE' ? <span className="text-red-500">Mora</span> : 
                               <span className="text-amber-500">Pendiente</span>}
                            </td>
                            <td className="p-3 text-center">
                              {inst.status === 'PENDING' ? (
                                <button 
                                  onClick={() => openPaymentModal(inst)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                                >
                                  Cobrar
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500">{inst.actual_payment_date}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: SOLICITUDES WEB */}
        {activeTab === 'solicitudes' && (
          <>
            <div className="flex gap-2 mb-8 flex-wrap">
              {[{ status: 'ALL', label: 'Todas', color: 'bg-slate-700' }, { status: 'PENDING', label: 'Pendientes', color: 'bg-amber-600' }, { status: 'APPROVED', label: 'Aprobadas', color: 'bg-emerald-600' }, { status: 'REJECTED', label: 'Rechazadas', color: 'bg-red-600' }].map((btn) => (
                <button
                  key={btn.status}
                  onClick={() => setFilterStatus(btn.status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === btn.status ? `${btn.color} text-white shadow-sm` : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {applications.map((app) => (
                  <div key={app.id} onClick={() => setSelectedApp(app)} className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 cursor-pointer hover:bg-slate-800/60">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-200">{app.first_name} {app.last_name}</h3>
                        <p className="text-xs text-slate-500">{app.email}</p>
                        <p className="text-lg font-bold text-emerald-400 mt-2">${Number(app.credit_amount).toLocaleString('es-CO')}</p>
                      </div>
                      <div className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs">{app.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                {selectedApp ? (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 sticky top-24">
                    <h2 className="text-lg font-bold text-slate-200 mb-6">Detalles de la Solicitud</h2>
                    <div className="space-y-4 mb-6">
                      <p className="text-slate-300"><strong>Nombre:</strong> {selectedApp.first_name} {selectedApp.last_name}</p>
                      <p className="text-slate-300"><strong>Cédula:</strong> {selectedApp.id_number}</p>
                      <p className="text-slate-300"><strong>Monto:</strong> ${Number(selectedApp.credit_amount).toLocaleString('es-CO')}</p>
                    </div>
                    {selectedApp.id_front_image && <img src={selectedApp.id_front_image} className="w-full rounded-xl mb-4" />}
                    {selectedApp.selfie_image && <img src={selectedApp.selfie_image} className="w-full rounded-xl mb-6" />}
                    
                    {selectedApp.status === 'PENDING' && (
                      <div className="space-y-3 pt-6 border-t border-slate-700/50">
                        <button onClick={() => updateStatus(selectedApp.id, 'APPROVED')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-sm font-bold">Aprobar</button>
                        <button onClick={() => updateStatus(selectedApp.id, 'REJECTED')} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-sm font-bold">Rechazar</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 text-center text-slate-500">Selecciona una solicitud para ver detalles</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL DE REGISTRO DE PAGO */}
      {showPaymentModal && selectedInstallment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="text-emerald-500"/> Registrar Pago - Cuota {selectedInstallment.installment_number}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Fecha Real de Pago</label>
                <input type="date" value={paymentData.actualDate} onChange={(e) => setPaymentData({...paymentData, actualDate: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Monto Pagado</label>
                <input type="number" value={paymentData.actualAmount} onChange={(e) => setPaymentData({...paymentData, actualAmount: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 uppercase mb-1">Cobro por Mora (Opcional)</label>
                <input type="number" value={paymentData.lateFee} onChange={(e) => setPaymentData({...paymentData, lateFee: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800">Cancelar</button>
              <button onClick={handleRegisterPayment} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold">Confirmar Pago</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}