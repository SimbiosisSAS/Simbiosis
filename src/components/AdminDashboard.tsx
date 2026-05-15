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
const [dataForSimulator, setDataForSimulator] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any | null>(null);
  const [paymentData, setPaymentData] = useState({
    actualDate: new Date().toISOString().split('T')[0],
    actualAmount: 0,
    lateFee: 0,
    daysLate: 0,
    extraPaymentType: 'REDUCE_TIME' // 'REDUCE_TIME' o 'REDUCE_QUOTA'
  });

 useEffect(() => {
  fetchUsuryRates(); // ← cargar tasas siempre, en cualquier pestaña
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
    } catch (err: any) {
      alert('Error guardando tasa. Detalle: ' + err.message);
    }
  };

  const handleSelectLoan = (loan: any) => {
    setSelectedLoan(loan);
    fetchInstallments(loan.id);
  };

  const handleDeleteLoan = async () => {
    if (!selectedLoan) return;
    const confirmDelete = window.confirm(`¿Estás seguro de que quieres ELIMINAR el crédito de ${selectedLoan.client_name}? Se borrará todo su historial de pagos y no se puede deshacer.`);
    
    if (confirmDelete) {
      try {
        const { error } = await supabase.from('active_loans').delete().eq('id', selectedLoan.id);
        if (error) throw error;
        alert('Crédito eliminado exitosamente');
        setSelectedLoan(null);
        fetchActiveLoans();
      } catch (err: any) {
        alert('Error al eliminar el crédito: ' + err.message);
      }
    }
  };

  const calculateLateFee = (expectedDateStr: string, actualDateStr: string, amount: number) => {
    const expected = new Date(expectedDateStr);
    const actual = new Date(actualDateStr);
    expected.setHours(0, 0, 0, 0);
    actual.setHours(0, 0, 0, 0);

    const diffTime = actual.getTime() - expected.getTime();
    const totalDaysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (totalDaysLate <= 0) return { days: 0, penalty: 0 };

    let penalty = 0;
    for (let i = 1; i <= totalDaysLate; i++) {
      const currentLateDay = new Date(expected.getTime());
      currentLateDay.setDate(expected.getDate() + i);
      const currentMonth = currentLateDay.getMonth() + 1;
      const currentYear = currentLateDay.getFullYear();

      const rateRecord = usuryRates.find(r => r.period_month === currentMonth && r.period_year === currentYear);
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
      ...prev,
      actualDate: newDate,
      lateFee: moraCalc.penalty,
      daysLate: moraCalc.days,
      actualAmount: Number(selectedInstallment.expected_amount) + moraCalc.penalty
    }));
  };

  const recalculateFutureInstallments = async (excedenteCapital: number, strategy: 'REDUCE_TIME' | 'REDUCE_QUOTA') => {
    if (!selectedLoan || !selectedInstallment) return;
    const futureInstallments = loanInstallments.filter(i => i.installment_number > selectedInstallment.installment_number && i.status === 'PENDING').sort((a, b) => a.installment_number - b.installment_number);
    if (futureInstallments.length === 0) return;
    const saldoPendiente = futureInstallments.reduce((sum, i) => sum + Number(i.principal_portion), 0);
    let newBalance = Math.max(saldoPendiente - excedenteCapital, 0);
    const rateRaw = selectedLoan.interest_rate_monthly ?? selectedLoan.nominal_rate_mv ?? null;
    let rate = rateRaw !== null ? Number(rateRaw) / 100 : 0;
    if (!rate || rate <= 0) {
      const primera = loanInstallments.find(i => i.installment_number === 1);
      const principal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
      if (primera && principal > 0) rate = Number(primera.interest_portion) / principal;
    }
    if (!rate || rate <= 0) { alert('Error: No se pudo determinar la tasa del crédito.'); return; }
    const updates: any[] = [];
    let currentBalance = newBalance;
    if (strategy === 'REDUCE_QUOTA') {
      const n = futureInstallments.length;
      const newFixedQuota = currentBalance <= 0 ? 0 : (currentBalance * (rate * Math.pow(1 + rate, n))) / (Math.pow(1 + rate, n) - 1);
      for (let i = 0; i < futureInstallments.length; i++) {
        const inst = futureInstallments[i];
        if (currentBalance <= 0.5) { updates.push({ id: inst.id, expected_amount: 0, principal_portion: 0, interest_portion: 0, status: 'PAID_EARLY' }); continue; }
        const interest = Math.round(currentBalance * rate);
        let principal = Math.round(newFixedQuota) - interest;
        if (principal >= currentBalance || i === futureInstallments.length - 1) principal = Math.round(currentBalance);
        if (principal < 0) principal = 0;
        updates.push({ id: inst.id, expected_amount: principal + interest, principal_portion: principal, interest_portion: interest, status: 'PENDING' });
        currentBalance = Math.round(currentBalance - principal);
      }
    } else {
      const fixedQuota = Number(selectedLoan.fixed_quota_amount);
      if (!fixedQuota || fixedQuota <= 0) { alert('Error: Cuota fija inválida.'); return; }
      let done = false;
      for (let i = 0; i < futureInstallments.length; i++) {
        const inst = futureInstallments[i];
        if (done || currentBalance <= 0.5) { updates.push({ id: inst.id, expected_amount: 0, principal_portion: 0, interest_portion: 0, status: 'PAID_EARLY' }); continue; }
        const interest = Math.round(currentBalance * rate);
        let principal = fixedQuota - interest;
        if (principal >= currentBalance) {
          principal = Math.round(currentBalance);
          updates.push({ id: inst.id, expected_amount: principal + interest, principal_portion: principal, interest_portion: interest, status: 'PENDING' });
          currentBalance = 0; done = true; continue;
        }
        principal = Math.round(principal);
        currentBalance = Math.round(currentBalance - principal);
        updates.push({ id: inst.id, expected_amount: principal + interest, principal_portion: principal, interest_portion: interest, status: 'PENDING' });
      }
    }
    for (const u of updates) {
      await supabase.from('loan_installments').update({ expected_amount: u.expected_amount, principal_portion: u.principal_portion, interest_portion: u.interest_portion, status: u.status }).eq('id', u.id);
    }
  };

const repairFullSchedule = async () => {
  if (!selectedLoan || loanInstallments.length === 0) return;
  if (!window.confirm(`¿Recalcular todas las cuotas PENDIENTES de ${selectedLoan.client_name} desde el saldo actual?`)) return;

  const rateRaw = selectedLoan.interest_rate_monthly ?? selectedLoan.nominal_rate_mv ?? null;
  let rate = rateRaw !== null ? Number(rateRaw) / 100 : 0;
  if (!rate || rate <= 0) {
    const primera = loanInstallments.find(i => i.installment_number === 1);
    const principal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
    if (primera && principal > 0) rate = Number(primera.interest_portion) / principal;
  }
  if (!rate || rate <= 0) { alert('Error: No se pudo determinar la tasa.'); return; }

  const fixedQuota = Number(selectedLoan.fixed_quota_amount);
  if (!fixedQuota || fixedQuota <= 0) { alert('Error: Cuota fija inválida.'); return; }

  // Calcular saldo real actual
  const capitalOriginal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
  const capitalPagado = loanInstallments
    .filter(i => i.status === 'PAID' || i.status === 'LATE')
    .reduce((s, i) => s + Number(i.principal_portion), 0);
  let currentBalance = Math.max(capitalOriginal - capitalPagado, 0);

  if (currentBalance <= 0.5) { alert('El crédito ya está completamente saldado.'); return; }

  // Cuotas pendientes a actualizar
  const pending = loanInstallments
    .filter(i => i.status === 'PENDING')
    .sort((a, b) => a.installment_number - b.installment_number);

  // Punto de partida para nuevas cuotas: última cuota existente (pagada o pendiente)
  const todasOrdenadas = [...loanInstallments].sort((a, b) => b.installment_number - a.installment_number);
  const ultimaCuota = todasOrdenadas[0];
  let nextInstNumber = ultimaCuota.installment_number + 1;
  let lastDate = new Date(ultimaCuota.expected_payment_date);

  // ── PASO 1: Actualizar cuotas pendientes existentes ──────────────────────
  for (let i = 0; i < pending.length; i++) {
    const inst = pending[i];

    if (currentBalance <= 0.5) {
      await supabase.from('loan_installments').update({
        expected_amount: 0, principal_portion: 0, interest_portion: 0, status: 'PAID_EARLY'
      }).eq('id', inst.id);
      continue;
    }

    const interest = Math.round(currentBalance * rate);
    let principal = fixedQuota - interest;

    if (principal >= currentBalance) {
      principal = Math.round(currentBalance);
      await supabase.from('loan_installments').update({
        expected_amount: principal + interest, principal_portion: principal,
        interest_portion: interest, status: 'PENDING'
      }).eq('id', inst.id);
      currentBalance = 0;
      // Actualizar punto de partida por si quedan más pendientes
      lastDate = new Date(inst.expected_payment_date);
      nextInstNumber = inst.installment_number + 1;
      continue;
    }

    principal = Math.round(principal);
    await supabase.from('loan_installments').update({
      expected_amount: principal + interest, principal_portion: principal,
      interest_portion: interest, status: 'PENDING'
    }).eq('id', inst.id);
    currentBalance = Math.round(currentBalance - principal);
    lastDate = new Date(inst.expected_payment_date);
    nextInstNumber = inst.installment_number + 1;
  }

  // ── PASO 2: Crear cuotas nuevas hasta liquidar el saldo ──────────────────
  while (currentBalance > 0.5) {
    lastDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate());
    const nextDateStr = lastDate.toISOString().split('T')[0];

    const interest = Math.round(currentBalance * rate);
    let principal = fixedQuota - interest;

    if (principal >= currentBalance) {
      principal = Math.round(currentBalance);
      await supabase.from('loan_installments').insert({
        loan_id: selectedLoan.id,
        installment_number: nextInstNumber,
        expected_payment_date: nextDateStr,
        expected_amount: principal + interest,
        principal_portion: principal,
        interest_portion: interest,
        status: 'PENDING',
        actual_amount_paid: 0,
        late_fee_charged: 0,
      });
      currentBalance = 0;
      break;
    }

    principal = Math.round(principal);
    await supabase.from('loan_installments').insert({
      loan_id: selectedLoan.id,
      installment_number: nextInstNumber,
      expected_payment_date: nextDateStr,
      expected_amount: principal + interest,
      principal_portion: principal,
      interest_portion: interest,
      status: 'PENDING',
      actual_amount_paid: 0,
      late_fee_charged: 0,
    });

    currentBalance = Math.round(currentBalance - principal);
    nextInstNumber++;
  }

  alert('¡Plan recalculado correctamente!');
  await fetchInstallments(selectedLoan.id);
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

      console.log(`PAGO REAL: ${pagoReal} | OBLIGATORIO: ${cobroObligatorio} | ABONO: ${abonoCapitalExtra}`);

      let nuevoPrincipalPagadoEstaCuota: number;

if (abonoCapitalExtra > 0) {
  // Pago con excedente → capital planificado + lo extra
  nuevoPrincipalPagadoEstaCuota = Number(selectedInstallment.principal_portion) + abonoCapitalExtra;
} else {
  // Pago normal o parcial → capital real = lo que pagó menos interés y mora
  const capitalReal = pagoReal - Number(selectedInstallment.interest_portion) - moraCobrada;
  nuevoPrincipalPagadoEstaCuota = Math.round(capitalReal);
}

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
        alert(`¡Pago registrado! Abono extra a capital de ${formatCurrency(abonoCapitalExtra)} aplicado con éxito.`);
      } else {
        alert('¡Pago registrado con éxito!');
      }

      setShowPaymentModal(false);
      setLoanInstallments([]);
      await fetchInstallments(selectedLoan.id); 
      
    } catch (err: any) {
      console.error("Error en pago:", err);
      alert('Error al registrar pago: ' + err.message);
    }
  };

  const calculateCurrentBalance = () => {
    if (!selectedLoan || loanInstallments.length === 0) return 0;
    
    const capitalOriginal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
    
    const capitalYaPagado = loanInstallments
      .filter(i => i.status === 'PAID' || i.status === 'LATE')
      .reduce((sum, i) => sum + Number(i.principal_portion), 0);
      
    const saldo = capitalOriginal - capitalYaPagado;
    
    return saldo > 0 ? saldo : 0;
  };

  const exportToCSV = () => {
    if (!selectedLoan || loanInstallments.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Cuota,Fecha Pago,Saldo Inicio,Costos asociados,Capital,Interes,Mora,Vr. Cuota,Saldo Final\n";
    
    let tempBalanceForExcel = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
    
    loanInstallments.filter(inst => inst.status !== 'PAID_EARLY').forEach((row, index) => {
      const saldoInicio = tempBalanceForExcel;
      const capitalRestar = Number(row.principal_portion);
      let saldoFinal = saldoInicio - capitalRestar;
      if (saldoFinal < 0) saldoFinal = 0;
      tempBalanceForExcel = saldoFinal;

      const costosAsoc = index === 0 ? Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0) : 0;
      const vrCuota = Number(row.expected_amount) + costosAsoc;
      const mora = row.late_fee_charged > 0 ? row.late_fee_charged : 0;

      const rowData = [
        row.installment_number, 
        row.actual_payment_date || row.expected_payment_date, 
        saldoInicio, costosAsoc, row.principal_portion, row.interest_portion, mora, vrCuota, saldoFinal
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

  const updateStatus = async (appId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('credit_applications')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', appId);
        
      if (error) throw error;
      
      await fetchApplications(); // Recarga la tabla de solicitudes
      
      if (newStatus === 'APPROVED' && selectedApp) {
        setDataForSimulator(selectedApp); // Guarda los datos del cliente
        setSelectedApp(null); // Cierra el panel de detalles
        setActiveTab('simulador'); // Salta a la pestaña del simulador
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube la pantalla
      } else {
        setSelectedApp(null); // Si rechaza, solo cierra el panel
      }
    } catch (err: any) {
      alert('Error actualizando estado: ' + err.message);
    }
  };

  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return '$ 0';
    return '$ ' + num.toLocaleString('es-CO');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Al día</span>;
      case 'LATE': return <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-semibold">Mora</span>;
      case 'PAID_EARLY': return <span className="px-2 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-xs font-semibold">Anulada</span>;
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
                      <tr><td colSpan={2} className="p-4 text-center text-slate-500">No hay tasas registradas. El sistema no cobrará mora.</td></tr>
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
          <div className="grid lg:grid-cols-3 gap-6">
            <div className={`${selectedLoan ? 'lg:col-span-1' : 'lg:col-span-3'} bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all`}>
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4">Créditos Otorgados</h2>
                {!selectedLoan && (
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex justify-between">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capital Colocado</p>
                      <p className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(activeLoans.reduce((sum, loan) => sum + Number(loan.principal_amount || loan.loan_amount), 0))}</p>
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
                          {formatCurrency(loan.principal_amount || loan.loan_amount)}
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

            {selectedLoan && (
              <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 relative">
                <div className="flex justify-between items-start mb-6 border-b border-slate-700/50 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedLoan.client_name}</h2>
                    <p className="text-slate-400 text-sm">ID: {selectedLoan.client_id_number || selectedLoan.client_id} | Desembolso: {new Date(selectedLoan.disbursement_date).toLocaleDateString()}</p>
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

                <div className="flex justify-between items-end mb-4">
  <h3 className="text-lg font-bold text-white">Gestión de Pagos</h3>
  <div className="flex gap-2">
    <button onClick={repairFullSchedule} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-amber-600/50 rounded-lg text-amber-400 hover:text-white hover:bg-amber-600 text-sm transition-colors">
      <Calculator size={14}/> Recalcular Plan
    </button>
    <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-emerald-500 text-sm transition-colors">
      <Download size={14} /> Exportar Excel
    </button>
  </div>
</div>
                
                {loading ? <p className="text-slate-400 text-center py-8">Cargando cuotas...</p> : (
                  <div className="overflow-x-auto bg-slate-900/30 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-900/80 text-slate-400 text-xs border-b border-slate-700/50 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Cuota</th>
                          <th className="p-3">Fecha Pago</th>
                          <th className="p-3 text-right">Saldo Inicio</th>
                          <th className="p-3 text-right">Costos Asoc.</th>
                          <th className="p-3 text-right">Capital</th>
                          <th className="p-3 text-right">Interés</th>
                          <th className="p-3 text-right">Mora</th>
                          <th className="p-3 text-right">Vr. Cuota</th>
                          <th className="p-3 text-right">Saldo Final</th>
                          <th className="p-3 text-center">Estado</th>
                          <th className="p-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {(() => {
                          let tempBalanceForTable = selectedLoan ? Number(selectedLoan.principal_amount || selectedLoan.loan_amount) : 0;
                          
                          return loanInstallments
                            .filter(inst => inst.status !== 'PAID_EARLY')
                            .map((inst, index) => {
                              const saldoInicio = tempBalanceForTable;
                              const capitalParaRestar = Number(inst.principal_portion);
                              let saldoFinal = saldoInicio - capitalParaRestar;
                              if (saldoFinal < 0) saldoFinal = 0;
                              
                              tempBalanceForTable = saldoFinal;

                              const costosAsociados = index === 0 ? Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0) : 0;
                              const valorCuotaTotal = Number(inst.expected_amount) + costosAsociados;

                              return (
                                <tr key={inst.id} className="hover:bg-slate-800/50 transition-colors">
                                  <td className="p-3 text-slate-300 font-mono text-center">{inst.installment_number}</td>
                                  <td className="p-3 text-slate-400">{inst.actual_payment_date || inst.expected_payment_date}</td>
                                  
                                  <td className="p-3 text-slate-400 text-right tabular-nums">{formatCurrency(saldoInicio)}</td>
                                  
                                  <td className="p-3 text-slate-400 text-right tabular-nums">
                                    {costosAsociados > 0 ? formatCurrency(costosAsociados) : '--'}
                                  </td>
                                  
                                  <td className="p-3 text-slate-200 text-right tabular-nums">{formatCurrency(inst.principal_portion)}</td>
                                  <td className="p-3 text-amber-400/80 text-right tabular-nums">{formatCurrency(inst.interest_portion)}</td>
                                  
                                  <td className="p-3 text-red-400/80 text-right tabular-nums">
                                    {inst.late_fee_charged > 0 ? formatCurrency(inst.late_fee_charged) : '--'}
                                  </td>
                                  
                                  <td className="p-3 font-bold text-emerald-400 text-right tabular-nums">{formatCurrency(valorCuotaTotal)}</td>
                                  <td className="p-3 text-slate-400 text-right tabular-nums font-medium">{formatCurrency(saldoFinal)}</td>
                                  
                                  <td className="p-3 text-center">{getStatusBadge(inst.status)}</td>
                                  <td className="p-3 text-center min-w-[140px]">
                                    {inst.status === 'PENDING' ? (
                                      <button onClick={() => openPaymentModal(inst)} className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/50 rounded-lg text-xs font-semibold transition-colors">Cobrar</button>
                                    ) : (
                                      <div className="text-xs text-slate-400 flex flex-col items-center">
                                        <span className="text-emerald-500 font-mono font-bold">{formatCurrency(inst.actual_amount_paid)}</span>
                                        <span>(Pago)</span>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                          });
                        })()}
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
                   <span className="text-slate-400">Interés Mora Calculado:</span>
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
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-xs text-emerald-400 mb-3 font-semibold flex items-center gap-1">
                      <Sparkles size={14}/> Abono extra de {formatCurrency(paymentData.actualAmount - (Number(selectedInstallment.expected_amount) + paymentData.lateFee))}. ¿Cómo aplicar el excedente?
                    </p>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <input 
                          type="radio" 
                          name="extraPaymentStrategy" 
                          value="REDUCE_TIME"
                          checked={paymentData.extraPaymentType === 'REDUCE_TIME'}
                          onChange={(e) => setPaymentData({...paymentData, extraPaymentType: e.target.value})}
                          className="text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                        />
                        Reducir Plazo (Terminar el crédito antes)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <input 
                          type="radio" 
                          name="extraPaymentStrategy" 
                          value="REDUCE_QUOTA"
                          checked={paymentData.extraPaymentType === 'REDUCE_QUOTA'}
                          onChange={(e) => setPaymentData({...paymentData, extraPaymentType: e.target.value})}
                          className="text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                        />
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