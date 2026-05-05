import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditApplication } from '../types';
import { CheckCircle, XCircle, Clock, Eye, Sparkles, Filter, FileText, Calculator, LogOut, Wallet, DollarSign, Calendar, Download, Settings, Plus, Trash2 } from 'lucide-react';
import LoanOriginationEngine from './LoanOriginationEngine';

type AdminTab = 'solicitudes' | 'cartera' | 'simulador' | 'configuracion';

export default function AdminDashboard({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('solicitudes');
  const [applications, setApplications] = useState<CreditApplication[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [usuryRates, setUsuryRates] = useState<any[]>([]);
  const [newRate, setNewRate] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), rate: '' });

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
    daysLate: 0,
    extraPaymentType: 'REDUCE_TIME' 
  });

  useEffect(() => {
    if (activeTab === 'solicitudes') fetchApplications();
    else if (activeTab === 'cartera') { fetchActiveLoans(); setSelectedLoan(null); }
    else if (activeTab === 'configuracion') fetchUsuryRates();
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
    const { data, error } = await supabase.from('loan_installments').select('*').eq('loan_id', loanId).order('installment_number', { ascending: true });
    if (!error) setLoanInstallments(data || []);
    setLoading(false);
  };

  const fetchUsuryRates = async () => {
    const { data, error } = await supabase.from('usury_rates').select('*').order('period_year', { ascending: false }).order('period_month', { ascending: false });
    if (!error) setUsuryRates(data || []);
  };

  const handleAddUsuryRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('usury_rates').upsert(
        { period_month: newRate.month, period_year: newRate.year, daily_late_rate: Number(newRate.rate) },
        { onConflict: 'period_month,period_year' }
      );
      if (error) throw error;
      alert('Tasa guardada exitosamente');
      fetchUsuryRates();
      setNewRate({ ...newRate, rate: '' });
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleSelectLoan = (loan: any) => {
    setSelectedLoan(loan);
    fetchInstallments(loan.id);
  };

  const handleDeleteLoan = async () => {
    if (!selectedLoan) return;
    if (window.confirm(`¿ELIMINAR el crédito de ${selectedLoan.client_name}? Esto no se puede deshacer.`)) {
      try {
        await supabase.from('active_loans').delete().eq('id', selectedLoan.id);
        alert('Crédito eliminado');
        setSelectedLoan(null);
        fetchActiveLoans();
      } catch (err: any) { alert('Error: ' + err.message); }
    }
  };

  const calculateLateFee = (expectedDateStr: string, actualDateStr: string, amount: number) => {
    const expected = new Date(expectedDateStr);
    const actual = new Date(actualDateStr);
    expected.setHours(0, 0, 0, 0); actual.setHours(0, 0, 0, 0);
    const totalDaysLate = Math.ceil((actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
    
    if (totalDaysLate <= 0) return { days: 0, penalty: 0 };

    let penalty = 0;
    for (let i = 1; i <= totalDaysLate; i++) {
      const currentLateDay = new Date(expected.getTime());
      currentLateDay.setDate(expected.getDate() + i);
      const rateRecord = usuryRates.find(r => r.period_month === (currentLateDay.getMonth() + 1) && r.period_year === currentLateDay.getFullYear());
      const dailyRate = rateRecord ? Number(rateRecord.daily_late_rate) : 0;
      penalty += amount * dailyRate;
    }
    return { days: totalDaysLate, penalty: Math.round(penalty) };
  };

  const openPaymentModal = (installment: any) => {
    const today = new Date().toISOString().split('T')[0];
    const moraCalc = calculateLateFee(installment.expected_payment_date, today, installment.expected_amount);
    
    setSelectedInstallment(installment);
    setPaymentData({
      actualDate: today,
      lateFee: moraCalc.penalty,
      daysLate: moraCalc.days,
      actualAmount: Number(installment.expected_amount) + moraCalc.penalty,
      extraPaymentType: 'REDUCE_TIME'
    });
    setShowPaymentModal(true);
  };

  const handleDateChangeInModal = (newDate: string) => {
    if (!selectedInstallment) return;
    const moraCalc = calculateLateFee(selectedInstallment.expected_payment_date, newDate, selectedInstallment.expected_amount);
    setPaymentData(prev => ({
      ...prev, actualDate: newDate, lateFee: moraCalc.penalty, daysLate: moraCalc.days,
      actualAmount: Number(selectedInstallment.expected_amount) + moraCalc.penalty
    }));
  };

  // --- MATEMÁTICA EXACTA DE EXCEL ---
  const recalculateFutureInstallments = async (abonoCapitalExtra: number, strategy: 'REDUCE_TIME' | 'REDUCE_QUOTA') => {
    if (!selectedLoan || !selectedInstallment) return;

    // 1. Tomar todas las cuotas estrictamente futuras
    const futureInstallments = loanInstallments.filter(i => i.installment_number > selectedInstallment.installment_number && i.status === 'PENDING');
    if (futureInstallments.length === 0) return;

    // 2. SALDO BASE EXACTO: Es el saldo inicial del Excel de este mes, MENOS el capital normal de este mes, MENOS el abono extra.
    const excelRows = generateExcelStyleRows();
    const currentExcelRow = excelRows.find(r => r.id === selectedInstallment.id);
    
    let newBalance = 0;
    if (currentExcelRow) {
      newBalance = currentExcelRow.openingBalance - currentExcelRow.principal - abonoCapitalExtra;
    } else {
      // Fallback
      newBalance = futureInstallments.reduce((sum, i) => sum + Number(i.principal_portion), 0) - abonoCapitalExtra;
    }

    if (newBalance <= 0) newBalance = 0;

    const rate = Number(selectedLoan.nominal_rate_mv) / 100;
    const remainingMonths = futureInstallments.length;
    let runningBalance = newBalance;
    const updates = [];

    if (strategy === 'REDUCE_QUOTA') {
      const newFixedQuota = newBalance <= 0 ? 0 : newBalance * (rate * Math.pow(1 + rate, remainingMonths)) / (Math.pow(1 + rate, remainingMonths) - 1);
      
      for (let i = 0; i < futureInstallments.length; i++) {
        const inst = futureInstallments[i];
        
        if (runningBalance <= 0.5) {
          updates.push({ id: inst.id, expected_amount: 0, principal_portion: 0, interest_portion: 0, status: 'PAID_EARLY' });
          continue;
        }

        const interest = runningBalance * rate;
        let principal = newFixedQuota - interest;

        if (i === futureInstallments.length - 1) principal = runningBalance;
        
        updates.push({
          id: inst.id,
          expected_amount: Math.round(principal + interest),
          principal_portion: Math.round(principal),
          interest_portion: Math.round(interest),
          status: 'PENDING'
        });
        runningBalance -= principal;
      }
    } else {
      const fixedQuota = Number(selectedLoan.fixed_quota_amount);
      
      for (let i = 0; i < futureInstallments.length; i++) {
        const inst = futureInstallments[i];
        
        if (runningBalance <= 0.5) { 
          updates.push({ id: inst.id, expected_amount: 0, principal_portion: 0, interest_portion: 0, status: 'PAID_EARLY' });
          continue;
        }

        const interest = runningBalance * rate;
        let principal = fixedQuota - interest;
        
        if (runningBalance < principal) principal = runningBalance;

        updates.push({
          id: inst.id,
          expected_amount: Math.round(principal + interest),
          principal_portion: Math.round(principal),
          interest_portion: Math.round(interest),
          status: 'PENDING'
        });
        runningBalance -= principal;
      }
    }

    for (const update of updates) {
      await supabase.from('loan_installments').update({
        expected_amount: update.expected_amount,
        principal_portion: update.principal_portion,
        interest_portion: update.interest_portion,
        status: update.status
      }).eq('id', update.id);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedInstallment || !selectedLoan) return;
    try {
      const pagoReal = parseFloat(paymentData.actualAmount.toString().replace(/[^0-9.-]+/g,"")) || 0;
      const moraCobrada = parseFloat(paymentData.lateFee.toString().replace(/[^0-9.-]+/g,"")) || 0;
      const cuotaBase = parseFloat(selectedInstallment.expected_amount.toString().replace(/[^0-9.-]+/g,"")) || 0;
      
      const isLate = paymentData.daysLate > 0;
      const status = isLate ? 'LATE' : 'PAID';
      
      const cobroObligatorio = cuotaBase + moraCobrada;
      const abonoCapitalExtra = pagoReal - cobroObligatorio;

      const nuevoPrincipalPagadoEstaCuota = Number(selectedInstallment.principal_portion) + (abonoCapitalExtra > 0 ? abonoCapitalExtra : 0);

      const { error } = await supabase.from('loan_installments').update({
        status: status,
        actual_payment_date: paymentData.actualDate,
        actual_amount_paid: pagoReal,
        late_fee_charged: moraCobrada,
        principal_portion: nuevoPrincipalPagadoEstaCuota 
      }).eq('id', selectedInstallment.id);

      if (error) throw error;

      if (abonoCapitalExtra > 10) {
        await recalculateFutureInstallments(abonoCapitalExtra, paymentData.extraPaymentType as 'REDUCE_TIME' | 'REDUCE_QUOTA');
        alert(`¡Pago registrado! Abono extra a capital de ${formatCurrency(abonoCapitalExtra)} aplicado. Cuotas futuras recalculadas.`);
      } else {
        alert('¡Pago registrado con éxito!');
      }

      setShowPaymentModal(false);
      
      // FORZAR RECARGA VISUAL DE SUPABASE INMEDIATAMENTE
      setLoanInstallments([]);
      await fetchInstallments(selectedLoan.id); 
      
    } catch (err: any) { alert('Error al registrar pago: ' + err.message); }
  };

  // --- MOTOR VISUAL DE LA TABLA (IDÉNTICO AL EXCEL) ---
  const generateExcelStyleRows = () => {
    if (!selectedLoan || loanInstallments.length === 0) return [];
    
    let currentBalance = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
    const rows = [];

    for (const inst of loanInstallments) {
      if (inst.status === 'PAID_EARLY') continue;

      const openingBalance = currentBalance;
      const principal = Number(inst.principal_portion);
      const interest = Number(inst.interest_portion);
      const associatedCosts = inst.installment_number === 1 ? Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0) : 0;
      const mora = Number(inst.late_fee_charged || 0);
      const totalPaid = Number(inst.actual_amount_paid || 0);
      
      // El saldo final SIEMPRE es el Saldo Inicial menos el Principal real de esta cuota
      const closingBalance = Math.max(0, openingBalance - principal);

      rows.push({
        id: inst.id,
        installment_number: inst.installment_number,
        expected_payment_date: inst.expected_payment_date,
        openingBalance,
        associatedCosts,
        principal,
        interest,
        mora,
        expectedAmount: Number(inst.expected_amount),
        closingBalance,
        status: inst.status,
        actual_payment_date: inst.actual_payment_date,
        totalPaid,
        originalInstallment: inst
      });

      // El Saldo Inicial de la siguiente cuota ES el Saldo Final de la actual
      currentBalance = closingBalance;
    }
    return rows;
  };

  const excelRows = generateExcelStyleRows();

  const calculateCurrentBalance = () => {
    if (!selectedLoan || loanInstallments.length === 0) return 0;
    // El Saldo Vivo Actual es el "Saldo de Inicio" de la primera cuota que esté PENDING
    const firstPendingRow = excelRows.find(r => r.status === 'PENDING');
    if (firstPendingRow) return firstPendingRow.openingBalance;
    
    // Si no hay PENDING, el crédito está 100% pagado
    return 0;
  };

  const exportToCSV = () => {
    if (!selectedLoan || loanInstallments.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Cuota,Fecha Pago,Saldo Inicio,Refinanciacion,Costos asociados,Capital,Interes,Mora,Vr. Cuota,Saldo Final,Estado\n";
    
    excelRows.forEach(row => {
      const rowData = [
        row.installment_number,
        row.status === 'PENDING' ? row.expected_payment_date : row.actual_payment_date,
        row.openingBalance,
        0, // Refinanciacion
        row.associatedCosts,
        row.principal,
        row.interest,
        row.mora,
        row.status === 'PENDING' ? row.expectedAmount : row.totalPaid,
        row.closingBalance,
        row.status
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

  const formatCurrency = (val: any) => { const num = Number(val); return isNaN(num) ? '$ 0' : '$ ' + num.toLocaleString('es-CO'); };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Pagado</span>;
      case 'LATE': return <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-semibold">Mora</span>;
      default: return <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">Pendiente</span>;
    }
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

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
            <button onClick={() => setActiveTab('simulador')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'simulador' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}><Calculator className="w-4 h-4"/> Nuevo Crédito</button>
            <button onClick={() => setActiveTab('configuracion')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'configuracion' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}><Settings className="w-4 h-4"/> Configuración</button>
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

        {activeTab === 'configuracion' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 mb-6">
              <h2 className="text-xl font-bold text-white mb-2">Tasas de Mora Diaria (Usura)</h2>
              <p className="text-slate-400 text-sm mb-6">El sistema usa esta tabla para calcular la penalidad exacta por cada día de retraso.</p>
              
              <form onSubmit={handleAddUsuryRate} className="flex items-end gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 mb-8">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mes</label>
                  <select value={newRate.month} onChange={e => setNewRate({...newRate, month: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500">
                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Año</label>
                  <input type="number" value={newRate.year} onChange={e => setNewRate({...newRate, year: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500" />
                </div>
                <div className="flex-[2]">
                  <label className="block text-xs font-semibold text-emerald-400 uppercase mb-2">Tasa Diaria (Ej: 0.00062)</label>
                  <input type="number" step="0.000000001" required value={newRate.rate} onChange={e => setNewRate({...newRate, rate: e.target.value})} className="w-full bg-slate-800 border border-emerald-500/50 rounded-lg p-2.5 text-white font-mono outline-none focus:border-emerald-500" placeholder="0.00000" />
                </div>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors">
                  <Plus size={18}/> Agregar
                </button>
              </form>

              <div className="overflow-x-auto bg-slate-900/30 rounded-xl border border-slate-700/50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase border-b border-slate-700/50">
                    <tr><th className="p-4">Periodo</th><th className="p-4 text-right">Tasa Diaria Registrada</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {usuryRates.length === 0 ? (
                      <tr><td colSpan={2} className="p-4 text-center text-slate-500">No hay tasas registradas.</td></tr>
                    ) : usuryRates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-slate-800/50">
                        <td className="p-4 text-slate-200 font-medium">{monthNames[rate.period_month - 1]} {rate.period_year}</td>
                        <td className="p-4 text-emerald-400 font-mono text-right">{rate.daily_late_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cartera' && (
          <div className="grid lg:grid-cols-4 gap-6">
            <div className={`${selectedLoan ? 'hidden' : 'lg:col-span-4'} bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all`}>
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4">Créditos Otorgados</h2>
                <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capital Colocado Total</p>
                    <p className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(activeLoans.reduce((sum, loan) => sum + Number(loan.principal_amount || loan.loan_amount), 0))}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Créditos Activos</p>
                     <p className="text-xl font-bold text-slate-200 font-mono">{activeLoans.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase border-b border-slate-700/50">
                    <tr>
                      <th className="p-4">Cliente</th>
                      <th className="p-4 text-right">Monto</th>
                      <th className="p-4 text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {activeLoans.map(loan => (
                      <tr key={loan.id} onClick={() => handleSelectLoan(loan)} className="cursor-pointer transition-colors hover:bg-slate-700/20">
                        <td className="p-4">
                          <p className="font-bold text-slate-200 text-sm truncate">{loan.client_name}</p>
                          <p className="text-xs text-slate-500 font-mono">ID: {loan.loan_number || loan.client_id_number || loan.client_id}</p>
                        </td>
                        <td className="p-4 text-sm font-bold text-emerald-400 text-right tabular-nums">
                          {formatCurrency(loan.principal_amount || loan.loan_amount)}
                        </td>
                        <td className="p-4 text-center">
                          <button className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800 rounded-lg"><Eye size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedLoan && (
              <div className="lg:col-span-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 relative">
                <div className="flex justify-between items-start mb-6 border-b border-slate-700/50 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedLoan.client_name}</h2>
                    <p className="text-slate-400 text-sm">ID: {selectedLoan.loan_number || selectedLoan.client_id_number || selectedLoan.client_id} | Desembolso: {new Date(selectedLoan.disbursement_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleDeleteLoan} className="text-red-400 hover:text-white px-3 py-1.5 bg-red-900/20 hover:bg-red-600 rounded-lg text-sm border border-red-900/50 transition-colors flex items-center gap-1">
                      <Trash2 size={14} /> Eliminar
                    </button>
                    <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg text-sm border border-slate-700 transition-colors">
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capital Original</p>
                    <p className="text-lg font-bold text-white font-mono">{formatCurrency(selectedLoan.principal_amount || selectedLoan.loan_amount)}</p>
                  </div>
                  <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                    <p className="text-xs text-emerald-500 uppercase tracking-wider mb-1">Saldo Vivo Actual</p>
                    <p className="text-xl font-bold text-emerald-400 font-mono">
                      {formatCurrency(calculateCurrentBalance())}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 flex flex-col justify-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estado de Cuotas</p>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold text-slate-300">
                        {loanInstallments.filter(i => i.status === 'PAID' || i.status === 'LATE').length} pagadas
                      </p>
                      {loanInstallments.filter(i => i.status === 'PAID_EARLY').length > 0 && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                          {loanInstallments.filter(i => i.status === 'PAID_EARLY').length} anuladas
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-4 mt-8">
                  <h3 className="text-lg font-bold text-white">Tabla de Amortización (Plan de Pagos)</h3>
                  <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-emerald-500 text-sm transition-colors">
                    <Download size={14} /> Exportar Excel
                  </button>
                </div>
                
                {loading ? <p className="text-slate-400 text-center py-8">Cargando cuotas...</p> : (
                  <div className="overflow-x-auto bg-slate-900/30 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 uppercase border-b border-slate-700/50">
                        <tr>
                          <th className="p-3 font-semibold">Cuota</th>
                          <th className="p-3 font-semibold">Fecha</th>
                          <th className="p-3 font-semibold text-right">Saldo Inicio</th>
                          <th className="p-3 font-semibold text-right">Costos</th>
                          <th className="p-3 font-semibold text-right">Capital</th>
                          <th className="p-3 font-semibold text-right">Interés</th>
                          <th className="p-3 font-semibold text-right">Mora</th>
                          <th className="p-3 font-semibold text-right">Vr. Cuota</th>
                          <th className="p-3 font-semibold text-right">Saldo Final</th>
                          <th className="p-3 font-semibold text-center">Estado</th>
                          <th className="p-3 font-semibold text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {excelRows.map(row => (
                          <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 text-slate-300 font-mono">{row.installment_number}</td>
                            <td className="p-3 text-slate-400">{row.status === 'PENDING' ? row.expected_payment_date : row.actual_payment_date}</td>
                            <td className="p-3 text-slate-300 text-right tabular-nums">{formatCurrency(row.openingBalance)}</td>
                            <td className="p-3 text-slate-400 text-right tabular-nums">{row.associatedCosts > 0 ? formatCurrency(row.associatedCosts) : '--'}</td>
                            <td className="p-3 text-emerald-400 text-right tabular-nums font-semibold">{formatCurrency(row.principal)}</td>
                            <td className="p-3 text-amber-400/80 text-right tabular-nums">{formatCurrency(row.interest)}</td>
                            <td className="p-3 text-red-400/80 text-right tabular-nums">{row.mora > 0 ? formatCurrency(row.mora) : '--'}</td>
                            <td className="p-3 font-bold text-slate-200 text-right tabular-nums">
                              {formatCurrency(row.status === 'PENDING' ? row.expectedAmount : row.totalPaid)}
                            </td>
                            <td className="p-3 text-slate-300 text-right tabular-nums font-semibold">{formatCurrency(row.closingBalance)}</td>
                            <td className="p-3 text-center">{getStatusBadge(row.status)}</td>
                            <td className="p-3 text-center">
                              {row.status === 'PENDING' ? (
                                <button onClick={() => openPaymentModal(row.originalInstallment)} className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/50 rounded-lg text-xs font-semibold transition-colors">Cobrar</button>
                              ) : (
                                <span className="text-emerald-500"><CheckCircle size={16} className="mx-auto"/></span>
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

        {/* PESTAÑA: SOLICITUDES WEB */}
        {activeTab === 'solicitudes' && (
          <>
            <div className="flex gap-2 mb-8 flex-wrap">
              {[{ status: 'ALL', label: 'Todas', color: 'bg-slate-700' }, { status: 'PENDING', label: 'Pendientes', color: 'bg-amber-600' }, { status: 'APPROVED', label: 'Aprobadas', color: 'bg-emerald-600' }, { status: 'REJECTED', label: 'Rechazadas', color: 'bg-red-600' }].map((btn) => (
                <button
                  key={btn.status}
                  onClick={() => setFilterStatus(btn.status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === btn.status ? `${btn.color} text-white shadow-sm` : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-200'}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {applications.length === 0 ? (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center text-slate-400">No hay solicitudes en este estado</div>
                ) : (
                  applications.map((app) => (
                    <div key={app.id} onClick={() => setSelectedApp(app)} className={`bg-slate-800/40 rounded-xl p-5 border cursor-pointer transition-all ${selectedApp?.id === app.id ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-slate-700/50 hover:bg-slate-800/60'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-200">{app.first_name} {app.last_name}</h3>
                          <p className="text-xs text-slate-500">{app.email}</p>
                          <p className="text-lg font-bold text-emerald-400 mt-2 font-mono">${Number(app.credit_amount).toLocaleString('es-CO')}</p>
                        </div>
                        <div className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs">{app.status}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div>
                {selectedApp ? (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 sticky top-24">
                    <h2 className="text-lg font-bold text-slate-200 mb-6">Detalles de la Solicitud</h2>
                    <div className="space-y-4 mb-6">
                      <p className="text-slate-300"><strong>Nombre:</strong> {selectedApp.first_name} {selectedApp.last_name}</p>
                      <p className="text-slate-300"><strong>Cédula:</strong> {selectedApp.id_number}</p>
                      <p className="text-slate-300 font-mono"><strong>Monto:</strong> ${Number(selectedApp.credit_amount).toLocaleString('es-CO')}</p>
                    </div>
                    {selectedApp.id_front_image && <div className="mb-4"><p className="text-xs text-slate-500 mb-1">Cédula Frontal</p><img src={selectedApp.id_front_image} className="w-full rounded-xl" /></div>}
                    {selectedApp.id_back_image && <div className="mb-4"><p className="text-xs text-slate-500 mb-1">Cédula Reverso</p><img src={selectedApp.id_back_image} className="w-full rounded-xl" /></div>}
                    {selectedApp.selfie_image && <div className="mb-6"><p className="text-xs text-slate-500 mb-1">Selfie</p><img src={selectedApp.selfie_image} className="w-full rounded-xl" /></div>}
                    
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

      {/* MODAL DE PAGO */}
      {showPaymentModal && selectedInstallment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-slate-800">
              <DollarSign className="text-emerald-500"/> Registro de Recaudo - Cuota {selectedInstallment.installment_number}
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">1. Fecha Real de Pago (Calcula Mora)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="date" value={paymentData.actualDate} onChange={(e) => handleDateChangeInModal(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-white focus:border-emerald-500 outline-none" />
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Cuota Base:</span>
                   <span className="text-slate-200 font-mono">{formatCurrency(selectedInstallment.expected_amount)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Días de Atraso:</span>
                   <span className={paymentData.daysLate > 0 ? "text-red-400 font-bold" : "text-emerald-400"}>{paymentData.daysLate} días</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Interés Mora Calculado:</span>
                   <span className={paymentData.lateFee > 0 ? "text-red-400 font-mono" : "text-slate-400 font-mono"}>+ {formatCurrency(paymentData.lateFee)}</span>
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
                  <input type="number" value={paymentData.actualAmount || ''} onChange={(e) => setPaymentData({...paymentData, actualAmount: Number(e.target.value)})} className="w-full bg-slate-800 border border-emerald-500/50 rounded-xl pl-10 pr-3 py-3 text-white font-mono text-lg focus:border-emerald-400 outline-none" placeholder="Ej: 600000" />
                </div>
                
                {paymentData.actualAmount > (Number(selectedInstallment.expected_amount) + paymentData.lateFee) && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-xs text-emerald-400 mb-3 font-semibold flex items-center gap-1">
                      <Sparkles size={14}/> Abono extra de {formatCurrency(paymentData.actualAmount - (Number(selectedInstallment.expected_amount) + paymentData.lateFee))}. ¿Cómo aplicar el excedente?
                    </p>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <input type="radio" name="extraPaymentStrategy" value="REDUCE_TIME" checked={paymentData.extraPaymentType === 'REDUCE_TIME'} onChange={(e) => setPaymentData({...paymentData, extraPaymentType: e.target.value})} className="text-emerald-500 focus:ring-emerald-500 h-4 w-4" />
                        Reducir Plazo (Terminar el crédito antes)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <input type="radio" name="extraPaymentStrategy" value="REDUCE_QUOTA" checked={paymentData.extraPaymentType === 'REDUCE_QUOTA'} onChange={(e) => setPaymentData({...paymentData, extraPaymentType: e.target.value})} className="text-emerald-500 focus:ring-emerald-500 h-4 w-4" />
                        Reducir Cuota (Pagar menos mensualmente)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium">Cancelar</button>
              <button onClick={handleRegisterPayment} className="flex-[2] px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all font-bold shadow-lg shadow-emerald-500/20">Aplicar Recaudo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}