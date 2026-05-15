import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditApplication } from '../types';
import { Eye, Sparkles, FileText, Calculator, LogOut, Wallet, DollarSign, Calendar, Download, Settings, Plus, Trash2 } from 'lucide-react';
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
  const [paymentData, setPaymentData] = useState({ actualDate: new Date().toISOString().split('T')[0], actualAmount: 0, lateFee: 0, daysLate: 0, extraPaymentType: 'REDUCE_TIME' });
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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
      const { error } = await supabase.from('usury_rates').upsert({ period_month: newRate.month, period_year: newRate.year, daily_late_rate: Number(newRate.rate) }, { onConflict: 'period_month,period_year' });
      if (error) throw error;
      alert('Tasa guardada exitosamente');
      fetchUsuryRates();
      setNewRate({ ...newRate, rate: '' });
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const handleSelectLoan = (loan: any) => { setSelectedLoan(loan); fetchInstallments(loan.id); };

  const handleDeleteLoan = async () => {
    if (!selectedLoan || !window.confirm(`¿Eliminar el crédito de ${selectedLoan.client_name}? No se puede deshacer.`)) return;
    try {
      const { error } = await supabase.from('active_loans').delete().eq('id', selectedLoan.id);
      if (error) throw error;
      alert('Crédito eliminado'); setSelectedLoan(null); fetchActiveLoans();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const { error } = await supabase.from('credit_applications').update({ status }).eq('id', id);
      if (error) throw error;
      alert(`Solicitud ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}.`);
      fetchApplications(); setSelectedApp(null);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const calculateLateFee = (expectedDateStr: string, actualDateStr: string, amount: number) => {
    const expected = new Date(expectedDateStr); const actual = new Date(actualDateStr);
    expected.setHours(0,0,0,0); actual.setHours(0,0,0,0);
    const totalDaysLate = Math.ceil((actual.getTime() - expected.getTime()) / 86400000);
    if (totalDaysLate <= 0) return { days: 0, penalty: 0 };
    let penalty = 0;
    for (let i = 1; i <= totalDaysLate; i++) {
      const d = new Date(expected.getTime()); d.setDate(expected.getDate() + i);
      const rec = usuryRates.find(r => r.period_month === d.getMonth() + 1 && r.period_year === d.getFullYear());
      penalty += amount * (rec ? Number(rec.daily_late_rate) : 0);
    }
    return { days: totalDaysLate, penalty: Math.round(penalty) };
  };

  const openPaymentModal = (installment: any) => {
    const today = new Date().toISOString().split('T')[0];
    const m = calculateLateFee(installment.expected_payment_date, today, installment.expected_amount);
    setSelectedInstallment(installment);
    setPaymentData({ actualDate: today, lateFee: m.penalty, daysLate: m.days, actualAmount: Number(installment.expected_amount) + m.penalty, extraPaymentType: 'REDUCE_TIME' });
    setShowPaymentModal(true);
  };

  const handleDateChangeInModal = (newDate: string) => {
    if (!selectedInstallment) return;
    const m = calculateLateFee(selectedInstallment.expected_payment_date, newDate, selectedInstallment.expected_amount);
    setPaymentData(prev => ({ ...prev, actualDate: newDate, lateFee: m.penalty, daysLate: m.days, actualAmount: Number(selectedInstallment.expected_amount) + m.penalty }));
  };

  const getLoanRate = (loan: any, installments: any[]): number => {
    const rateRaw = loan.interest_rate_monthly ?? loan.nominal_rate_mv ?? null;
    let rate = rateRaw !== null ? Number(rateRaw) / 100 : 0;
    if (!rate || rate <= 0) {
      const primera = installments.find(i => i.installment_number === 1);
      const principal = Number(loan.principal_amount || loan.loan_amount);
      if (primera && principal > 0) rate = Number(primera.interest_portion) / principal;
    }
    return rate;
  };

  const recalculateFutureInstallments = async (excedenteCapital: number, strategy: 'REDUCE_TIME' | 'REDUCE_QUOTA') => {
    if (!selectedLoan || !selectedInstallment) return;
    const futureInstallments = loanInstallments.filter(i => i.installment_number > selectedInstallment.installment_number && i.status === 'PENDING').sort((a, b) => a.installment_number - b.installment_number);
    if (futureInstallments.length === 0) return;
    const saldoPendiente = futureInstallments.reduce((sum, i) => sum + Number(i.principal_portion), 0);
    let newBalance = Math.max(saldoPendiente - excedenteCapital, 0);
    const rate = getLoanRate(selectedLoan, loanInstallments);
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
    const rate = getLoanRate(selectedLoan, loanInstallments);
    if (!rate || rate <= 0) { alert('Error: No se pudo determinar la tasa.'); return; }
    const fixedQuota = Number(selectedLoan.fixed_quota_amount);
    if (!fixedQuota || fixedQuota <= 0) { alert('Error: Cuota fija inválida.'); return; }
    const pending = loanInstallments.filter(i => i.status === 'PENDING').sort((a, b) => a.installment_number - b.installment_number);
    if (pending.length === 0) { alert('No hay cuotas pendientes.'); return; }
    const capitalOriginal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
    const capitalPagado = loanInstallments.filter(i => i.status === 'PAID' || i.status === 'LATE').reduce((s, i) => s + Number(i.principal_portion), 0);
    let currentBalance = Math.max(capitalOriginal - capitalPagado, 0);
    for (let i = 0; i < pending.length; i++) {
      const inst = pending[i];
      if (currentBalance <= 0.5) { await supabase.from('loan_installments').update({ expected_amount: 0, principal_portion: 0, interest_portion: 0, status: 'PAID_EARLY' }).eq('id', inst.id); continue; }
      const interest = Math.round(currentBalance * rate);
      let principal = fixedQuota - interest;
      if (principal >= currentBalance) {
        principal = Math.round(currentBalance);
        await supabase.from('loan_installments').update({ expected_amount: principal + interest, principal_portion: principal, interest_portion: interest, status: 'PENDING' }).eq('id', inst.id);
        currentBalance = 0; continue;
      }
      principal = Math.round(principal);
      await supabase.from('loan_installments').update({ expected_amount: principal + interest, principal_portion: principal, interest_portion: interest, status: 'PENDING' }).eq('id', inst.id);
      currentBalance = Math.round(currentBalance - principal);
    }
    alert('¡Plan recalculado correctamente!');
    await fetchInstallments(selectedLoan.id);
  };

  const handleRegisterPayment = async () => {
    if (!selectedInstallment || !selectedLoan) return;
    try {
      const pagoReal = parseFloat(paymentData.actualAmount.toString().replace(/[^0-9.-]+/g, '')) || 0;
      const moraCobrada = parseFloat(paymentData.lateFee.toString().replace(/[^0-9.-]+/g, '')) || 0;
      const cuotaBase = parseFloat(selectedInstallment.expected_amount.toString().replace(/[^0-9.-]+/g, '')) || 0;
      const isLate = paymentData.daysLate > 0;
      const abonoCapitalExtra = pagoReal - (cuotaBase + moraCobrada);
      const nuevoPrincipal = Number(selectedInstallment.principal_portion) + (abonoCapitalExtra > 0 ? abonoCapitalExtra : 0);
      const { error } = await supabase.from('loan_installments').update({ status: isLate ? 'LATE' : 'PAID', actual_payment_date: paymentData.actualDate, actual_amount_paid: pagoReal, late_fee_charged: moraCobrada, principal_portion: nuevoPrincipal }).eq('id', selectedInstallment.id);
      if (error) throw error;
      if (abonoCapitalExtra > 10) {
        await recalculateFutureInstallments(abonoCapitalExtra, paymentData.extraPaymentType as 'REDUCE_TIME' | 'REDUCE_QUOTA');
        alert(`¡Pago registrado! Abono extra de ${formatCurrency(abonoCapitalExtra)} aplicado.`);
      } else { alert('¡Pago registrado con éxito!'); }
      setShowPaymentModal(false); setLoanInstallments([]);
      await fetchInstallments(selectedLoan.id);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const calculateCurrentBalance = () => {
    if (!selectedLoan || loanInstallments.length === 0) return 0;
    const cap = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
    const pagado = loanInstallments.filter(i => i.status === 'PAID' || i.status === 'LATE').reduce((s, i) => s + Number(i.principal_portion), 0);
    return Math.max(cap - pagado, 0);
  };

  const exportToCSV = () => {
    if (!selectedLoan || loanInstallments.length === 0) return;
    let csv = 'data:text/csv;charset=utf-8,No. Cuota,Fecha Esperada,Saldo Inicial,Costos Asociados,Capital,Interes,Mora Cobrada,Vr. Cuota,Saldo Final,Estado,Fecha Real Pago,Monto Real Pagado\n';
    let bal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
    loanInstallments.forEach((row, idx) => {
      if (row.status === 'PAID_EARLY') return;
      const si = bal; let sf = Math.max(si - Number(row.principal_portion), 0); bal = sf;
      const costos = idx === 0 ? Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0) : 0;
      csv += [row.installment_number, row.expected_payment_date, si, costos, row.principal_portion, row.interest_portion, row.late_fee_charged, Number(row.expected_amount) + costos, sf, row.status, row.actual_payment_date || 'N/A', row.actual_amount_paid].join(',') + '\n';
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `PlanPagos_${selectedLoan.client_name.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const formatCurrency = (val: any) => { const n = Number(val); return isNaN(n) ? '$ 0' : '$ ' + n.toLocaleString('es-CO'); };

  const getStatusBadge = (status: string) => {
    const map: any = { PAID: ['bg-emerald-500/10 text-emerald-400 border-emerald-500/20','Al día'], LATE: ['bg-red-500/10 text-red-400 border-red-500/20','Mora'], PAID_EARLY: ['bg-slate-500/10 text-slate-400 border-slate-500/20','Anulada'] };
    const [cls, label] = map[status] || ['bg-amber-500/10 text-amber-400 border-amber-500/20','Pendiente'];
    return <span className={`px-2 py-1 ${cls} border rounded-full text-xs font-semibold`}>{label}</span>;
  };
  return (
    <div className="min-h-screen bg-slate-950 pb-12">

      {/* NAVBAR */}
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
            {([['solicitudes','Solicitudes Web',FileText],['cartera','Cartera Activa',Wallet],['simulador','Nuevo Crédito',Calculator],['configuracion','Configuración',Settings]] as any[]).map(([tab,label,Icon]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${activeTab === tab ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
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

        {/* CONFIGURACIÓN */}
        {activeTab === 'configuracion' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 mb-6">
              <h2 className="text-xl font-bold text-white mb-6">Tasas de Mora Diaria (Usura)</h2>
              <form onSubmit={handleAddUsuryRate} className="flex items-end gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 mb-8">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mes</label>
                  <select value={newRate.month} onChange={e => setNewRate({...newRate, month: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500">
                    {monthNames.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
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
                  <Plus size={18} /> Agregar
                </button>
              </form>
              <div className="overflow-x-auto bg-slate-900/30 rounded-xl border border-slate-700/50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase border-b border-slate-700/50">
                    <tr><th className="p-4">Periodo</th><th className="p-4 text-right">Tasa Diaria</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {usuryRates.length === 0
                      ? <tr><td colSpan={2} className="p-4 text-center text-slate-500">No hay tasas registradas.</td></tr>
                      : usuryRates.map(r => (
                        <tr key={r.id} className="hover:bg-slate-800/50">
                          <td className="p-4 text-slate-200 font-medium">{monthNames[r.period_month-1]} {r.period_year}</td>
                          <td className="p-4 text-emerald-400 font-mono text-right">{r.daily_late_rate}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CARTERA */}
        {activeTab === 'cartera' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className={`${selectedLoan ? 'lg:col-span-1' : 'lg:col-span-3'} bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all`}>
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4">Créditos Otorgados</h2>
                {!selectedLoan && (
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex justify-between">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capital Colocado</p>
                      <p className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(activeLoans.reduce((s,l) => s + Number(l.principal_amount || l.loan_amount), 0))}</p>
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
                        <td className="p-4 text-sm font-bold text-emerald-400 text-right tabular-nums">{formatCurrency(loan.principal_amount || loan.loan_amount)}</td>
                        {!selectedLoan && <td className="p-4 text-center"><button className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800 rounded-lg"><Eye size={16}/></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedLoan && (
              <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-6 border-b border-slate-700/50 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedLoan.client_name}</h2>
                    <p className="text-slate-400 text-sm">ID: {selectedLoan.client_id_number || selectedLoan.client_id} | Desembolso: {new Date(selectedLoan.disbursement_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleDeleteLoan} className="text-red-400 hover:text-white px-3 py-1.5 bg-red-900/20 hover:bg-red-600 rounded-lg text-sm border border-red-900/50 transition-colors flex items-center gap-1"><Trash2 size={14}/> Eliminar</button>
                    <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg text-sm border border-slate-700 transition-colors">Cerrar</button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capital Original</p>
                    <p className="text-lg font-bold text-white font-mono">{formatCurrency(selectedLoan.principal_amount || selectedLoan.loan_amount)}</p>
                  </div>
                  <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                    <p className="text-xs text-emerald-500 uppercase tracking-wider mb-1">Saldo Vivo Actual</p>
                    <p className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(calculateCurrentBalance())}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 flex flex-col justify-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estado de Cuotas</p>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold text-slate-300">{loanInstallments.filter(i => i.status === 'PAID' || i.status === 'LATE').length} pagadas</p>
                      {loanInstallments.filter(i => i.status === 'PAID_EARLY').length > 0 && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">{loanInstallments.filter(i => i.status === 'PAID_EARLY').length} anuladas</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOTONES GESTIÓN — AQUÍ ESTÁ EL BOTÓN RECALCULAR PLAN */}
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-lg font-bold text-white">Gestión de Pagos</h3>
                  <div className="flex gap-2">
                    <button onClick={repairFullSchedule} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-amber-600/50 rounded-lg text-amber-400 hover:text-white hover:bg-amber-600 hover:border-amber-500 text-sm transition-colors">
                      <Calculator size={14}/> Recalcular Plan
                    </button>
                    <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-emerald-500 text-sm transition-colors">
                      <Download size={14}/> Exportar Excel
                    </button>
                  </div>
                </div>

                {loading ? <p className="text-slate-400 text-center py-8">Cargando cuotas...</p> : (
                  <div className="overflow-x-auto bg-slate-900/30 rounded-xl border border-slate-700/50">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-900/80 text-slate-400 text-xs border-b border-slate-700/50 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Cuota</th><th className="p-3">Fecha Pago</th><th className="p-3 text-right">Saldo Inicio</th>
                          <th className="p-3 text-right">Costos Asoc.</th><th className="p-3 text-right">Capital</th><th className="p-3 text-right">Interés</th>
                          <th className="p-3 text-right">Mora</th><th className="p-3 text-right">Vr. Cuota</th><th className="p-3 text-right">Saldo Final</th>
                          <th className="p-3 text-center">Estado</th><th className="p-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {(() => {
                          let tempBal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
                          return loanInstallments.filter(i => i.status !== 'PAID_EARLY').map((inst, index) => {
                            const si = tempBal;
                            let sf = Math.max(si