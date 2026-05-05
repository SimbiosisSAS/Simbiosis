import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditApplication } from '../types';
import { CheckCircle, XCircle, Clock, Eye, Sparkles, Filter, FileText, Calculator, LogOut, Wallet, DollarSign, Calendar, Download } from 'lucide-react';
import LoanOriginationEngine from './LoanOriginationEngine';

type AdminTab = 'solicitudes' | 'cartera' | 'simulador';

export default function AdminDashboard({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('solicitudes');
  const [applications, setApplications] = useState<CreditApplication[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dailyLateFeeRate, setDailyLateFeeRate] = useState<number>(0.1);

  const [selectedApp, setSelectedApp] = useState<CreditApplication | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [loanInstallments, setLoanInstallments] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any | null>(null);
  const [paymentData, setPaymentData] = useState({
    actualDate: new Date().toISOString().split('T')[0],
    actualAmount: 0,
    lateFee: 0,
    daysLate: 0
  });

  useEffect(() => {
    if (activeTab === 'solicitudes') fetchApplications();
    else if (activeTab === 'cartera') { fetchActiveLoans(); setSelectedLoan(null); }
  }, [filterStatus, activeTab]);

  const fetchApplications = async () => {
    setLoading(true);
    let query = supabase.from('credit_applications').select('*').order('created_at', { ascending: false });
    if (filterStatus !== 'ALL') query = query.eq('status', filterStatus);
    const { data, error } = await query;
    if (!error) setApplications(data || []);
    setLoading(false);
  };

  const fetchActiveLoans = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('active_loans').select('*').order('created_at', { ascending: false });
    if (!error) setActiveLoans(data || []);
    setLoading(false);
  };

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

  const handleSelectLoan = (loan: any) => {
    setSelectedLoan(loan);
    fetchInstallments(loan.id);
  };

  const calculateLateFee = (expectedDate: string, actualDate: string, amount: number) => {
    const expected = new Date(expectedDate).getTime();
    const actual = new Date(actualDate).getTime();
    const diffTime = actual - expected;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      const penalty = Math.round((amount * (dailyLateFeeRate / 100)) * diffDays);
      return { days: diffDays, penalty };
    }
    return { days: 0, penalty: 0 };
  };

  const openPaymentModal = (installment: any) => {
    const today = new Date().toISOString().split('T')[0];
    const moraCalc = calculateLateFee(installment.expected_payment_date, today, installment.expected_amount);
    
    setSelectedInstallment(installment);
    setPaymentData({
      actualDate: today,
      lateFee: moraCalc.penalty,
      daysLate: moraCalc.days,
      actualAmount: Number(installment.expected_amount) + moraCalc.penalty
    });
    setShowPaymentModal(true);
  };

  const handleDateChangeInModal = (newDate: string) => {
    if (!selectedInstallment) return;
    const moraCalc = calculateLateFee(selectedInstallment.expected_payment_date, newDate, selectedInstallment.expected_amount);
    setPaymentData(prev => ({
      ...prev,
      actualDate: newDate,
      lateFee: moraCalc.penalty,
      daysLate: moraCalc.days,
      actualAmount: Number(selectedInstallment.expected_amount) + moraCalc.penalty
    }));
  };

  const recalculateFutureInstallments = async (excedenteCapital: number) => {
    if (!selectedLoan || !selectedInstallment) return;

    const futureInstallments = loanInstallments.filter(
      i => i.installment_number > selectedInstallment.installment_number && i.status === 'PENDING'
    );

    if (futureInstallments.length === 0) return;

    let newBalance = futureInstallments.reduce((sum, i) => sum + Number(i.principal_portion), 0) - excedenteCapital;
    if (newBalance <= 0) newBalance = 0;

    const rate = Number(selectedLoan.nominal_rate_mv) / 100;
    const remainingMonths = futureInstallments.length;

    const newFixedQuota = newBalance <= 0 ? 0 : 
      newBalance * (rate * Math.pow(1 + rate, remainingMonths)) / (Math.pow(1 + rate, remainingMonths) - 1);

    let currentBalance = newBalance;
    for (let i = 0; i < futureInstallments.length; i++) {
      const inst = futureInstallments[i];
      const interest = currentBalance * rate;
      let principal = newFixedQuota - interest;

      if (i === futureInstallments.length - 1) principal = currentBalance;
      if (newBalance <= 0) { principal = 0; interest = 0; }

      await supabase.from('loan_installments').update({
        expected_amount: newBalance <= 0 ? 0 : Math.round(newFixedQuota),
        principal_portion: Math.round(principal),
        interest_portion: Math.round(interest)
      }).eq('id', inst.id);

      currentBalance -= principal;
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedInstallment || !selectedLoan) return;
    
    try {
      const isLate = paymentData.daysLate > 0;
      const status = isLate ? 'LATE' : 'PAID';
      
      const expectedTotal = Number(selectedInstallment.expected_amount) + Number(paymentData.lateFee);
      const excedente = Number(paymentData.actualAmount) - expectedTotal;

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

      if (excedente > 0) {
        await recalculateFutureInstallments(excedente);
        alert(`¡Pago registrado! Se detectó un abono a capital de ${formatCurrency(excedente)}. Cuotas futuras recalculadas.`);
      } else {
        alert('¡Pago registrado con éxito!');
      }

      setShowPaymentModal(false);
      // Recargar los datos para refrescar la tabla sin que la página se ponga en blanco
      await fetchInstallments(selectedLoan.id); 
      
    } catch (err: any) {
      alert('Error al registrar pago: ' + err.message);
    }
  };

  const exportToCSV = () => {
    if (!selectedLoan || loanInstallments.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "No. Cuota,Fecha Esperada,Cuota Esperada,Capital,Interes,Estado,Fecha Real Pago,Monto Pagado,Mora Cobrada\n";

    loanInstallments.forEach(row => {
      const rowData = [
        row.installment_number,
        row.expected_payment_date,
        row.expected_amount,
        row.principal_portion,
        row.interest_portion,
        row.status,
        row.actual_payment_date || 'N/A',
        row.actual_amount_paid,
        row.late_fee_charged
      ];
      csvContent += rowData.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PlanPagos_${selectedLoan.client_name.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper a prueba de fallos para la moneda
  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return '$ 0';
    return '$ ' + num.toLocaleString('es-CO');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Al día</span>;
      case 'LATE': return <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-semibold">Mora</span>;
      default: return <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">Pendiente</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-12">
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
        {activeTab === 'simulador' && <LoanOriginationEngine />}

        {activeTab === 'cartera' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lista Izquierda */}
            <div className={`${selectedLoan ? 'lg:col-span-1' : 'lg:col-span-3'} bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all`}>
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Créditos Otorgados</h2>
                  <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700/30">
                    <span className="text-xs text-slate-400">% Mora/Día:</span>
                    <input 
                      type="number" 
                      step="0.1"
                      value={dailyLateFeeRate}
                      onChange={(e) => setDailyLateFeeRate(Number(e.target.value))}
                      className="w-16 bg-transparent text-emerald-400 font-mono text-sm outline-none text-right"
                    />
                  </div>
                </div>
                {!selectedLoan && (
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 mt-2 flex justify-between">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capital Colocado</p>
                      <p className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(activeLoans.reduce((sum, loan) => sum + Number(loan.loan_amount || loan.principal_amount), 0))}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Créditos Activos</p>
                       <p className="text-xl font-bold text-slate-200 font-mono">{activeLoans.length}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase border-b border-slate-700/50">
                    <tr>
                      <th className="p-4">Cliente</th>
                      <th className="p-4 text-right">Monto</th>
                      {!selectedLoan && <th className="p-4 text-center">Detalle</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {activeLoans.map(loan => (
                      <tr key={loan.id} onClick={() => handleSelectLoan(loan)} className={`cursor-pointer transition-colors ${selectedLoan?.id === loan.id ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : 'hover:bg-slate-700/20'}`}>
                        <td className="p-4">
                          <p className="font-bold text-slate-200 text-sm truncate">{loan.client_name}</p>
                          <p className="text-xs text-slate-500 font-mono">{loan.client_id_number || loan.client_id}</p>
                        </td>
                        <td className="p-4 text-sm font-bold text-emerald-400 text-right tabular-nums">
                          {formatCurrency(loan.loan_amount || loan.principal_amount)}
                        </td>
                        {!selectedLoan && (
                          <td className="p-4 text-center">
                            <button className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800 rounded-lg"><Eye size={16}/></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel Derecho - Detalles y Cuotas */}
            {selectedLoan && (
              <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 relative">
                <div className="flex justify-between items-start mb-6 border-b border-slate-700/50 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedLoan.client_name}</h2>
                    <p className="text-slate-400 text-sm">ID: {selectedLoan.client_id_number || selectedLoan.client_id} | Desembolso: {selectedLoan.disbursement_date}</p>
                  </div>
                  <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg text-sm border border-slate-700">Cerrar</button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capital Original</p>
                    <p className="text-lg font-bold text-white font-mono">{formatCurrency(selectedLoan.loan_amount || selectedLoan.principal_amount)}</p>
                  </div>
                  
                  <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                    <p className="text-xs text-emerald-500 uppercase tracking-wider mb-1">Saldo Vivo Actual</p>
                    <p className="text-xl font-bold text-emerald-400 font-mono">
                      {formatCurrency(loanInstallments.filter(i => i.status === 'PENDING').reduce((s, i) => s + Number(i.principal_portion), 0))}
                    </p>
                  </div>
                  
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cuotas Pagadas</p>
                    <p className="text-lg font-bold text-slate-300">
                      {loanInstallments.filter(i => i.status !== 'PENDING').length} <span className="text-sm text-slate-500">de {selectedLoan.installments || selectedLoan.term_months}</span>
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-lg font-bold text-white">Gestión de Pagos (Amortización)</h3>
                  <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-emerald-500 text-sm transition-colors">
                    <Download size={14} /> Exportar Excel
                  </button>
                </div>
                
                {loading ? <p className="text-slate-400 text-center py-8">Cargando cuotas...</p> : (
                  <div className="overflow-x-auto bg-slate-900/30 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-900/80 text-slate-400 text-xs border-b border-slate-700/50">
                        <tr>
                          <th className="p-3">Nº</th>
                          <th className="p-3">Fecha Vence</th>
                          <th className="p-3 text-right">Monto Base</th>
                          <th className="p-3 text-center">Estado</th>
                          <th className="p-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {loanInstallments.map(inst => (
                          <tr key={inst.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 text-slate-300 font-mono">{inst.installment_number}</td>
                            <td className="p-3 text-slate-400">{inst.expected_payment_date}</td>
                            <td className="p-3 font-medium text-slate-200 text-right tabular-nums">{formatCurrency(inst.expected_amount)}</td>
                            <td className="p-3 text-center">{getStatusBadge(inst.status)}</td>
                            <td className="p-3 text-center">
                              {inst.status === 'PENDING' ? (
                                <button 
                                  onClick={() => openPaymentModal(inst)}
                                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/50 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  Cobrar
                                </button>
                              ) : (
                                <div className="text-xs text-slate-400 flex flex-col items-center">
                                  <span>Pagado: {inst.actual_payment_date}</span>
                                  <span className="text-emerald-500 font-mono font-bold">{formatCurrency(inst.actual_amount_paid)}</span>
                                </div>
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
          <div className="text-center p-12 bg-slate-800/40 rounded-2xl border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Módulo de Solicitudes Web</h2>
            <p className="text-slate-400">Esta vista ha sido reservada para gestionar los leads entrantes. Selecciona 'Cartera Activa' para operar los créditos otorgados.</p>
          </div>
        )}
      </div>

      {/* MODAL DE PAGO */}
      {showPaymentModal && selectedInstallment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-slate-800">
              <DollarSign className="text-emerald-500"/> Registro de Recaudo - Cuota {selectedInstallment.installment_number}
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">1. Fecha de Pago (Calcula Mora)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="date" 
                    value={paymentData.actualDate}
                    onChange={(e) => handleDateChangeInModal(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Cuota Base:</span>
                   <span className="text-slate-200 font-mono">{formatCurrency(selectedInstallment.expected_amount)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Días de Atraso:</span>
                   <span className={paymentData.daysLate > 0 ? "text-red-400 font-bold" : "text-emerald-400"}>
                     {paymentData.daysLate} días
                   </span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Interés Mora ({dailyLateFeeRate}%/día):</span>
                   <span className={paymentData.lateFee > 0 ? "text-red-400 font-mono" : "text-slate-400 font-mono"}>
                     + {formatCurrency(paymentData.lateFee)}
                   </span>
                 </div>
                 <div className="border-t border-slate-800 pt-2 mt-2 flex justify-between">
                   <span className="text-slate-300 font-bold">Mínimo a Pagar:</span>
                   <span className="text-emerald-500 font-mono font-bold">{formatCurrency(Number(selectedInstallment.expected_amount) + paymentData.lateFee)}</span>
                 </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-emerald-400 uppercase mb-1">2. Monto Real Recibido (Abonos Extra)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input 
                    type="number" 
                    value={paymentData.actualAmount || ''}
                    onChange={(e) => setPaymentData({...paymentData, actualAmount: Number(e.target.value)})}
                    className="w-full bg-slate-800 border border-emerald-500/50 rounded-xl pl-10 pr-3 py-3 text-white font-mono text-lg focus:border-emerald-400 outline-none"
                    placeholder="Ej: 600000"
                  />
                </div>
                {paymentData.actualAmount > (Number(selectedInstallment.expected_amount) + paymentData.lateFee) && (
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                    <Sparkles size={12}/> Abono extra de {formatCurrency(paymentData.actualAmount - (Number(selectedInstallment.expected_amount) + paymentData.lateFee))}. Se recalcularán las cuotas futuras.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRegisterPayment}
                className="flex-[2] px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all font-bold shadow-lg shadow-emerald-500/20"
              >
                Aplicar Recaudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}