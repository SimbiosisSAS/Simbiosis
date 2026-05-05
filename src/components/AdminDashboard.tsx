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
    extraPaymentType: 'REDUCE_TIME' // Usado si paga MÁS
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
    const { data } = await query;
    setApplications(data || []);
    setLoading(false);
  };

  const fetchActiveLoans = async () => {
    setLoading(true);
    const { data } = await supabase.from('active_loans').select('*').order('created_at', { ascending: false });
    setActiveLoans(data || []);
    setLoading(false);
  };

  const fetchInstallments = async (loanId: string) => {
    setLoading(true);
    const { data } = await supabase.from('loan_installments').select('*').eq('loan_id', loanId).order('installment_number', { ascending: true });
    setLoanInstallments(data || []);
    setLoading(false);
  };

  const fetchUsuryRates = async () => {
    const { data } = await supabase.from('usury_rates').select('*').order('period_year', { ascending: false }).order('period_month', { ascending: false });
    setUsuryRates(data || []);
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
    } catch (err: any) { alert('Error guardando tasa. Detalle: ' + err.message); }
  };

  const handleSelectLoan = (loan: any) => {
    setSelectedLoan(loan);
    fetchInstallments(loan.id);
  };

  const handleDeleteLoan = async () => {
    if (!selectedLoan) return;
    if (window.confirm(`¿Estás seguro de que quieres ELIMINAR el crédito de ${selectedLoan.client_name}? Se borrará todo su historial de pagos.`)) {
      try {
        await supabase.from('active_loans').delete().eq('id', selectedLoan.id);
        alert('Crédito eliminado exitosamente');
        setSelectedLoan(null);
        fetchActiveLoans();
      } catch (err: any) { alert('Error al eliminar el crédito: ' + err.message); }
    }
  };

  // --- MORA: Busca la tasa del mes en que DEBIÓ PAGAR ---
  const calculateLateFee = (expectedDateStr: string, actualDateStr: string, openingBalanceAndCosts: number) => {
    const expected = new Date(expectedDateStr);
    const actual = new Date(actualDateStr);
    expected.setHours(0, 0, 0, 0); actual.setHours(0, 0, 0, 0);

    const diffTime = actual.getTime() - expected.getTime();
    const totalDaysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (totalDaysLate <= 0) return { days: 0, penalty: 0 };

    // La regla dice: La mora se cobra con la tasa del mes en que se DEBIÓ hacer el pago.
    const expectedMonth = expected.getMonth() + 1;
    const expectedYear = expected.getFullYear();
    const rateRecord = usuryRates.find(r => r.period_month === expectedMonth && r.period_year === expectedYear);
    
    // Si no hay tasa configurada, asume 0 para no frenar la app
    const dailyRate = rateRecord ? Number(rateRecord.daily_late_rate) : 0;
    
    // Mora = Saldo Incial * Tasa del Mes * Días de Atraso
    const penalty = Math.round(openingBalanceAndCosts * dailyRate * totalDaysLate);
    
    return { days: totalDaysLate, penalty };
  };

  const openPaymentModal = (installment: any) => {
    // Calculamos el Saldo Inicio + Costos para la mora y los intereses
    const excelRows = generateExcelStyleRows();
    const currentExcelRow = excelRows.find(r => r.id === installment.id);
    const openingBalanceAndCosts = currentExcelRow ? (currentExcelRow.openingBalance + currentExcelRow.associatedCosts) : Number(installment.expected_amount);

    const today = new Date().toISOString().split('T')[0];
    const moraCalc = calculateLateFee(installment.expected_payment_date, today, openingBalanceAndCosts);
    
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
    
    const excelRows = generateExcelStyleRows();
    const currentExcelRow = excelRows.find(r => r.id === selectedInstallment.id);
    const openingBalanceAndCosts = currentExcelRow ? (currentExcelRow.openingBalance + currentExcelRow.associatedCosts) : Number(selectedInstallment.expected_amount);

    const moraCalc = calculateLateFee(selectedInstallment.expected_payment_date, newDate, openingBalanceAndCosts);
    setPaymentData(prev => ({
      ...prev, actualDate: newDate, lateFee: moraCalc.penalty, daysLate: moraCalc.days,
      actualAmount: Number(selectedInstallment.expected_amount) + moraCalc.penalty
    }));
  };

  // --- LÓGICA FINANCIERA PERFECCIONADA: RECALCULAR AMORTIZACIÓN Y EXTENDER PLAZO ---
  const recalculateFutureInstallments = async (nuevoSaldoVivo: number, strategy: 'REDUCE_TIME' | 'REDUCE_QUOTA' | 'EXTEND_TIME', currentInstNumber: number) => {
    
    // Obtenemos todas las cuotas futuras "vivas"
    const futureInstallments = loanInstallments.filter(i => i.installment_number > currentInstNumber && i.status === 'PENDING');
    
    const rate = Number(selectedLoan.nominal_rate_mv) / 100;
    const originalFixedQuota = Number(selectedLoan.fixed_quota_amount);
    let currentBalance = nuevoSaldoVivo;

    const updates = [];
    const inserts = []; // Para crear meses adicionales si el cliente pagó de menos

    if (strategy === 'REDUCE_QUOTA') {
      const remainingMonths = futureInstallments.length;
      // Nueva cuota más barata, manteniendo los mismos meses de plazo original
      const newFixedQuota = currentBalance <= 0 ? 0 : currentBalance * (rate * Math.pow(1 + rate, remainingMonths)) / (Math.pow(1 + rate, remainingMonths) - 1);
      
      for (let i = 0; i < futureInstallments.length; i++) {
        const inst = futureInstallments[i];
        
        if (currentBalance <= 0.5) {
          updates.push({ id: inst.id, expected_amount: 0, principal_portion: 0, interest_portion: 0, status: 'PAID_EARLY' });
          continue;
        }

        const interest = currentBalance * rate;
        let principal = newFixedQuota - interest;

        if (i === futureInstallments.length - 1) principal = currentBalance;
        if (currentBalance <= 0) { principal = 0; interest = 0; }

        updates.push({
          id: inst.id,
          expected_amount: Math.round(principal + interest),
          principal_portion: Math.round(principal),
          interest_portion: Math.round(interest),
          status: 'PENDING'
        });
        currentBalance -= principal;
      }

    } else {
      // ESTRATEGIA: REDUCIR TIEMPO O EXTENDER TIEMPO (La cuota original se mantiene, varían los meses)
      
      for (let i = 0; i < futureInstallments.length; i++) {
        const inst = futureInstallments[i];
        
        if (currentBalance <= 0.5) { 
          updates.push({ id: inst.id, expected_amount: 0, principal_portion: 0, interest_portion: 0, status: 'PAID_EARLY' });
          continue;
        }

        const interest = currentBalance * rate;
        let principal = originalFixedQuota - interest;
        
        // Si el saldo es menor a lo que va a capital, es la última cuota ajustada
        if (currentBalance < principal) principal = currentBalance;

        updates.push({
          id: inst.id,
          expected_amount: Math.round(principal + interest),
          principal_portion: Math.round(principal),
          interest_portion: Math.round(interest),
          status: 'PENDING'
        });
        
        currentBalance -= principal;
      }

      // LA MAGIA DE EXTENDER EL PLAZO: 
      // Si después de actualizar todas las cuotas futuras, AÚN HAY SALDO, creamos cuotas nuevas.
      if (currentBalance > 0.5) {
        let extraMonthCounter = 1;
        // Tomar la fecha de la última cuota conocida para proyectar el calendario
        const lastKnownDate = futureInstallments.length > 0 
            ? new Date(futureInstallments[futureInstallments.length - 1].expected_payment_date) 
            : new Date(selectedInstallment.expected_payment_date);

        while (currentBalance > 0.5) {
          const interest = currentBalance * rate;
          let principal = originalFixedQuota - interest;
          
          if (currentBalance < principal) principal = currentBalance;

          const newPaymentDate = new Date(lastKnownDate);
          newPaymentDate.setMonth(newPaymentDate.getMonth() + extraMonthCounter);

          inserts.push({
            loan_id: selectedLoan.id,
            installment_number: (futureInstallments.length > 0 ? futureInstallments[futureInstallments.length - 1].installment_number : selectedInstallment.installment_number) + extraMonthCounter,
            expected_payment_date: newPaymentDate.toISOString().split('T')[0],
            expected_amount: Math.round(principal + interest),
            principal_portion: Math.round(principal),
            interest_portion: Math.round(interest),
            status: 'PENDING'
          });

          currentBalance -= principal;
          extraMonthCounter++;
          if (extraMonthCounter > 120) break; // Límite de seguridad infinito (10 años extra)
        }
      }
    }

    // 1. Ejecutar las actualizaciones de las cuotas existentes
    for (const update of updates) {
      await supabase.from('loan_installments').update({
        expected_amount: update.expected_amount,
        principal_portion: update.principal_portion,
        interest_portion: update.interest_portion,
        status: update.status
      }).eq('id', update.id);
    }

    // 2. Si se crearon cuotas nuevas (por pago de menos), las insertamos en la BD
    if (inserts.length > 0) {
      await supabase.from('loan_installments').insert(inserts);
    }
  };

  // --- CAUSACIÓN PURA (EL CEREBRO DEL PAGO) ---
  const handleRegisterPayment = async () => {
    if (!selectedInstallment || !selectedLoan) return;
    
    try {
      const pagoRealIngresado = parseFloat(paymentData.actualAmount.toString().replace(/[^0-9.-]+/g,"")) || 0;
      const moraCobrada = parseFloat(paymentData.lateFee.toString().replace(/[^0-9.-]+/g,"")) || 0;
      
      const isLate = paymentData.daysLate > 0;
      const status = isLate ? 'LATE' : 'PAID';

      // 1. REGLA CONTABLE: Recalcular el Interés Real de este mes antes de cobrar
      const excelRows = generateExcelStyleRows();
      const currentExcelRow = excelRows.find(r => r.id === selectedInstallment.id);
      
      // Saldo Base = Saldo Inicio de este mes + Costos de Originación de este mes (si los hay)
      const saldoBaseParaInteres = currentExcelRow ? (currentExcelRow.openingBalance + currentExcelRow.associatedCosts) : Number(selectedInstallment.expected_amount);
      const rate = Number(selectedLoan.nominal_rate_mv) / 100;
      
      // El interés de esta cuota SIEMPRE se cobra sobre el saldo base real del mes
      const interesCausadoReal = Math.round(saldoBaseParaInteres * rate);

      // 2. REGLA CONTABLE: El Capital es LA DIFERENCIA (El Residuo)
      // Lo que pagó el cliente MENOS la mora MENOS el interés del mes = Abono a Capital Neto
      const abonoCapitalNeto = pagoRealIngresado - moraCobrada - interesCausadoReal;

      // Actualizar esta fila en Supabase con los valores verdaderos
      const { error } = await supabase.from('loan_installments').update({
        status: status,
        actual_payment_date: paymentData.actualDate,
        actual_amount_paid: pagoRealIngresado,
        late_fee_charged: moraCobrada,
        interest_portion: interesCausadoReal, // Guardamos el interés que causamos
        principal_portion: abonoCapitalNeto > 0 ? abonoCapitalNeto : 0 // Guardamos la diferencia pura como capital
      }).eq('id', selectedInstallment.id);

      if (error) throw error;

      // 3. CALCULAR EL NUEVO SALDO VIVO ACTUAL (Para proyectar el futuro)
      const capitalOriginalDelCredito = Number(selectedLoan.principal_amount || selectedLoan.loan_amount) + Number(selectedLoan.origination_costs || selectedLoan.associated_costs || 0);
      
      // Sumamos el capital que pagó en TODAS las cuotas, INCLUYENDO EL NETO DE HOY
      const capitalYaPagadoHistorico = loanInstallments
        .filter(i => (i.status === 'PAID' || i.status === 'LATE') && i.id !== selectedInstallment.id)
        .reduce((sum, i) => sum + Number(i.principal_portion), 0) + (abonoCapitalNeto > 0 ? abonoCapitalNeto : 0);
      
      let saldoVivoRestante = capitalOriginalDelCredito - capitalYaPagadoHistorico;
      if (saldoVivoRestante < 0) saldoVivoRestante = 0;

      // 4. EJECUTAR RECÁLCULO BASADO EN EL PAGO (DE MÁS O DE MENOS)
      // Si pagó menos, el saldo no bajó lo suficiente, así que el sistema "Extenderá el tiempo".
      // Si pagó más, el sistema hará caso al radio button (Reducir Tiempo o Cuota).
      const estrategiaElegida = pagoRealIngresado < (interesCausadoReal + moraCobrada + Number(selectedInstallment.principal_portion)) ? 'EXTEND_TIME' : paymentData.extraPaymentType;

      await recalculateFutureInstallments(saldoVivoRestante, estrategiaElegida as 'REDUCE_TIME' | 'REDUCE_QUOTA' | 'EXTEND_TIME', selectedInstallment.installment_number);

      alert(`¡Pago registrado con causación exitosa! Nuevo Saldo Vivo: ${formatCurrency(saldoVivoRestante)}.`);

      setShowPaymentModal(false);
      setLoanInstallments([]);
      await fetchInstallments(selectedLoan.id); 
      
    } catch (err: any) { alert('Error al registrar pago: ' + err.message); }
  };

  // --- MOTOR VISUAL DE LA TABLA (EXCEL) ---
  const generateExcelStyleRows = () => {
    if (!selectedLoan || loanInstallments.length === 0) return [];
    
    // El balance de partida incluye el monto prestado + los costos financiados
    let currentBalance = Number(selectedLoan.principal_amount || selectedLoan.loan_amount) + Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0);
    const rows = [];

    for (const inst of loanInstallments) {
      if (inst.status === 'PAID_EARLY') continue; // Ocultamos las anuladas visualmente

      const openingBalance = currentBalance;
      const associatedCosts = inst.installment_number === 1 ? Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0) : 0;
      
      const principal = Number(inst.principal_portion);
      const interest = Number(inst.interest_portion);
      const mora = Number(inst.late_fee_charged || 0);
      const expectedAmount = Number(inst.expected_amount);
      const totalPaid = Number(inst.actual_amount_paid || 0);
      
      // Saldo Final es el Saldo Inicial de ese mes MENOS el Capital de ese mes
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
        expectedAmount,
        closingBalance,
        status: inst.status,
        actual_payment_date: inst.actual_payment_date,
        totalPaid,
        originalInstallment: inst
      });

      // El Saldo Inicial del próximo mes es el Saldo Final de este
      currentBalance = closingBalance;
    }
    return rows;
  };

  const excelRows = generateExcelStyleRows();

  const calculateCurrentBalance = () => {
    if (!selectedLoan || loanInstallments.length === 0) return 0;
    const firstPendingRow = excelRows.find(r => r.status === 'PENDING');
    if (firstPendingRow) return firstPendingRow.openingBalance;
    return 0; // Si no hay PENDING, deuda saldada
  };

  const exportToCSV = () => {
    if (!selectedLoan || loanInstallments.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,No. Cuota,Fecha Esperada,Saldo Inicio,Costos Asociados,Capital,Interes,Mora,Vr. Cuota,Saldo Final,Estado,Fecha Real Pago\n";
    excelRows.forEach(row => {
      const rowData = [
        row.installment_number, row.expected_payment_date, row.openingBalance, row.associatedCosts,
        row.principal, row.interest, row.mora, row.status === 'PENDING' ? row.expectedAmount : row.totalPaid,
        row.closingBalance, row.status, row.status === 'PENDING' ? 'N/A' : row.actual_payment_date
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
              <p className="text-slate-400 text-sm mb-6">El sistema usa esta tabla para calcular la penalidad exacta por cada día de retraso, dependiendo del mes en el que cae el atraso del cliente.</p>
              
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

        {/* PESTAÑA: CARTERA ACTIVA */}
        {activeTab === 'cartera' && (
          <div className="grid lg:grid-cols-4 gap-6">
            <div className={`${selectedLoan ? 'lg:col-span-1' : 'lg:col-span-4'} bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all`}>
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4">Créditos Otorgados</h2>
                {!selectedLoan && (
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
                          <p className="text-xs text-slate-500 font-mono">ID: {loan.loan_number || loan.client_id_number || loan.client_id}</p>
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
              <div className="lg:col-span-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 relative">
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
                          <th className="p-3 font-semibold">Fecha Pago</th>
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
                            <td className="p-3 text-red-400/80 text-right tabular-nums">
                              {row.mora > 0 ? formatCurrency(row.mora) : '--'}
                            </td>
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

        {/* PESTAÑA 3: SOLICITUDES WEB */}
        {activeTab === 'solicitudes' && (
          <div className="text-center p-12 bg-slate-800/40 rounded-2xl border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Solicitudes Entrantes</h2>
            <p className="text-slate-400">Aquí mantuvimos tu código original de solicitudes. Cambia de pestaña para ver el Core.</p>
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
                   <span className="text-slate-400">Cuota Base (Capital + Int):</span>
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
                   <span className="text-slate-300 font-bold">Cobro Obligatorio (Mínimo):</span>
                   <span className="text-emerald-500 font-mono font-bold">{formatCurrency(Number(selectedInstallment.expected_amount) + paymentData.lateFee)}</span>
                 </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-emerald-400 uppercase mb-1">2. Monto Real Recibido</label>
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
                
                {paymentData.actualAmount > (Number(selectedInstallment.expected_amount) + paymentData.lateFee) ? (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-xs text-emerald-400 mb-3 font-semibold flex items-center gap-1">
                      <Sparkles size={14}/> Sobran {formatCurrency(paymentData.actualAmount - (Number(selectedInstallment.expected_amount) + paymentData.lateFee))} que se abonarán a capital.
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
                        Reducir Plazo (El crédito terminará antes)
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
                        Reducir Cuota (Las cuotas futuras serán más baratas)
                      </label>
                    </div>
                  </div>
                ) : (
                  paymentData.actualAmount < (Number(selectedInstallment.expected_amount) + paymentData.lateFee) && paymentData.actualAmount > 0 && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                        Pago incompleto. Faltan {formatCurrency((Number(selectedInstallment.expected_amount) + paymentData.lateFee) - paymentData.actualAmount)} para cubrir el interés y la mora. Se añadirán cuotas extra al final del crédito.
                      </p>
                    </div>
                  )
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