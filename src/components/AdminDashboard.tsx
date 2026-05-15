import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditApplication } from '../types';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Sparkles,
  Filter,
  FileText,
  Calculator,
  LogOut,
  Wallet,
  DollarSign,
  Calendar,
  Download,
  Settings,
  Plus,
  Trash2,
} from 'lucide-react';
import LoanOriginationEngine from './LoanOriginationEngine';

type AdminTab = 'solicitudes' | 'cartera' | 'simulador' | 'configuracion';

export default function AdminDashboard({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('solicitudes');
  const [applications, setApplications] = useState<CreditApplication[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [usuryRates, setUsuryRates] = useState<any[]>([]);
  const [newRate, setNewRate] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    rate: '',
  });

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
    extraPaymentType: 'REDUCE_TIME',
  });

  useEffect(() => {
    if (activeTab === 'solicitudes') fetchApplications();
    else if (activeTab === 'cartera') {
      fetchActiveLoans();
      setSelectedLoan(null);
    } else if (activeTab === 'configuracion') fetchUsuryRates();
  }, [filterStatus, activeTab]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FETCH FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchApplications = async () => {
    setLoading(true);
    let query = supabase
      .from('credit_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (filterStatus !== 'ALL') query = query.eq('status', filterStatus);
    const { data, error } = await query;
    if (!error) setApplications(data || []);
    setLoading(false);
  };

  const fetchActiveLoans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('active_loans')
      .select('*')
      .order('created_at', { ascending: false });
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

  const fetchUsuryRates = async () => {
    const { data, error } = await supabase
      .from('usury_rates')
      .select('*')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });
    if (!error) setUsuryRates(data || []);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // USURY RATES
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddUsuryRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('usury_rates').upsert(
        {
          period_month: newRate.month,
          period_year: newRate.year,
          daily_late_rate: Number(newRate.rate),
        },
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

  // ─────────────────────────────────────────────────────────────────────────────
  // LOAN MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSelectLoan = (loan: any) => {
    setSelectedLoan(loan);
    fetchInstallments(loan.id);
  };

  const handleDeleteLoan = async () => {
    if (!selectedLoan) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres ELIMINAR el crédito de ${selectedLoan.client_name}? Se borrará todo su historial de pagos y no se puede deshacer.`
    );

    if (confirmDelete) {
      try {
        const { error } = await supabase
          .from('active_loans')
          .delete()
          .eq('id', selectedLoan.id);
        if (error) throw error;
        alert('Crédito eliminado exitosamente');
        setSelectedLoan(null);
        fetchActiveLoans();
      } catch (err: any) {
        alert('Error al eliminar el crédito: ' + err.message);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // APPLICATION STATUS
  // ─────────────────────────────────────────────────────────────────────────────

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const { error } = await supabase
        .from('credit_applications')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      alert(`Solicitud ${status === 'APPROVED' ? 'aprobada' : 'rechazada'} exitosamente.`);
      fetchApplications();
      setSelectedApp(null);
    } catch (err: any) {
      alert('Error actualizando estado: ' + err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LATE FEE CALCULATION
  // ─────────────────────────────────────────────────────────────────────────────

  const calculateLateFee = (
    expectedDateStr: string,
    actualDateStr: string,
    amount: number
  ) => {
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

      const rateRecord = usuryRates.find(
        (r) => r.period_month === currentMonth && r.period_year === currentYear
      );
      const dailyRate = rateRecord ? Number(rateRecord.daily_late_rate) : 0;
      penalty += amount * dailyRate;
    }
    return { days: totalDaysLate, penalty: Math.round(penalty) };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENT MODAL
  // ─────────────────────────────────────────────────────────────────────────────

  const openPaymentModal = (installment: any) => {
    const today = new Date().toISOString().split('T')[0];
    const moraCalc = calculateLateFee(
      installment.expected_payment_date,
      today,
      installment.expected_amount
    );

    setSelectedInstallment(installment);
    setPaymentData({
      actualDate: today,
      lateFee: moraCalc.penalty,
      daysLate: moraCalc.days,
      actualAmount: Number(installment.expected_amount) + moraCalc.penalty,
      extraPaymentType: 'REDUCE_TIME',
    });
    setShowPaymentModal(true);
  };

  const handleDateChangeInModal = (newDate: string) => {
    if (!selectedInstallment) return;
    const moraCalc = calculateLateFee(
      selectedInstallment.expected_payment_date,
      newDate,
      selectedInstallment.expected_amount
    );
    setPaymentData((prev) => ({
      ...prev,
      actualDate: newDate,
      lateFee: moraCalc.penalty,
      daysLate: moraCalc.days,
      actualAmount: Number(selectedInstallment.expected_amount) + moraCalc.penalty,
    }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RECALCULATE FUTURE INSTALLMENTS — FUNCIÓN CORREGIDA
  // ─────────────────────────────────────────────────────────────────────────────

  const recalculateFutureInstallments = async (
    excedenteCapital: number,
    strategy: 'REDUCE_TIME' | 'REDUCE_QUOTA'
  ) => {
    if (!selectedLoan || !selectedInstallment) return;

    // 1. Obtener cuotas futuras pendientes, ordenadas por número de cuota
    const futureInstallments = loanInstallments
      .filter(
        (i) =>
          i.installment_number > selectedInstallment.installment_number &&
          i.status === 'PENDING'
      )
      .sort((a, b) => a.installment_number - b.installment_number);

    if (futureInstallments.length === 0) return;

    // 2. Calcular el nuevo saldo real después del abono extra
    // La suma de los principal_portion pendientes = saldo adeudado
    // antes del abono extra (ya descontada la cuota normal actual).
    const saldoPendienteAnterior = futureInstallments.reduce(
      (sum, i) => sum + Number(i.principal_portion),
      0
    );

    let newBalance = saldoPendienteAnterior - excedenteCapital;
    if (newBalance < 0) newBalance = 0;

    // 3. Validar la tasa nominal mensual
    // El campo nominal_rate_mv se asume guardado como porcentaje (ej: 1 para 1% MV).
    // Si tu BD guarda el decimal directamente (0.01), elimina el /100.
    const rate = Number(selectedLoan.nominal_rate_mv) / 100;

    if (!rate || rate <= 0) {
      alert(
        'Error: La tasa nominal del crédito es inválida o cero. Verifica el campo nominal_rate_mv en Supabase.'
      );
      return;
    }

    const updates: {
      id: string;
      expected_amount: number;
      principal_portion: number;
      interest_portion: number;
      status: string;
    }[] = [];

    let currentBalance = newBalance;

    // ── ESTRATEGIA A: REDUCE_QUOTA ──────────────────────────────────────────
    // Nueva cuota fija con el nuevo saldo y los mismos n períodos restantes.
    if (strategy === 'REDUCE_QUOTA') {
      const n = futureInstallments.length;

      const newFixedQuota =
        currentBalance <= 0
          ? 0
          : currentBalance *
            (rate * Math.pow(1 + rate, n)) /
            (Math.pow(1 + rate, n) - 1);

      for (let i = 0; i < futureInstallments.length; i++) {
        const inst = futureInstallments[i];

        if (currentBalance <= 0.5) {
          updates.push({
            id: inst.id,
            expected_amount: 0,
            principal_portion: 0,
            interest_portion: 0,
            status: 'PAID_EARLY',
          });
          continue;
        }

        // Redondear el interés aquí para evitar drift acumulado
        const interest = Math.round(currentBalance * rate);
        let principal = Math.round(newFixedQuota) - interest;

        // Ajuste de última cuota: pagar exactamente lo que queda
        if (principal >= currentBalance || i === futureInstallments.length - 1) {
          principal = Math.round(currentBalance);
        }

        if (principal < 0) principal = 0;

        updates.push({
          id: inst.id,
          expected_amount: principal + interest,
          principal_portion: principal,
          interest_portion: interest,
          status: 'PENDING',
        });

        currentBalance = Math.round(currentBalance - principal);
      }

    // ── ESTRATEGIA B: REDUCE_TIME ───────────────────────────────────────────
    // La cuota mensual NO cambia. Lo que cambia es cuántas cuotas quedan.
    } else {
      const fixedQuota = Number(selectedLoan.fixed_quota_amount);

      if (!fixedQuota || fixedQuota <= 0) {
        alert(
          'Error: El monto de cuota fija del crédito es inválido. Verifica el campo fixed_quota_amount en Supabase.'
        );
        return;
      }

      let balanceFinished = false;

      for (let i = 0; i < futureInstallments.length; i++) {
        const inst = futureInstallments[i];

        // Si el saldo ya se agotó en una iteración previa → anular cuota
        if (balanceFinished || currentBalance <= 0.5) {
          updates.push({
            id: inst.id,
            expected_amount: 0,
            principal_portion: 0,
            interest_portion: 0,
            status: 'PAID_EARLY',
          });
          continue;
        }

        // Calcular interés sobre el saldo real actual
        const interest = Math.round(currentBalance * rate);
        let principal = fixedQuota - interest;

        // Si el saldo restante es menor que el capital normal de esta cuota
        // → cuota de cierre: pagar exactamente lo que queda
        if (principal >= currentBalance) {
          principal = Math.round(currentBalance);
          updates.push({
            id: inst.id,
            expected_amount: principal + interest,
            principal_portion: principal,
            interest_portion: interest,
            status: 'PENDING',
          });
          currentBalance = 0;
          balanceFinished = true;
          continue;
        }

        principal = Math.round(principal);
        currentBalance = Math.round(currentBalance - principal);

        updates.push({
          id: inst.id,
          expected_amount: principal + interest,
          principal_portion: principal,
          interest_portion: interest,
          status: 'PENDING',
        });
      }
    }

    // 4. Persistir todos los cambios en Supabase
    for (const update of updates) {
      const { error } = await supabase
        .from('loan_installments')
        .update({
          expected_amount: update.expected_amount,
          principal_portion: update.principal_portion,
          interest_portion: update.interest_portion,
          status: update.status,
        })
        .eq('id', update.id);

      if (error) {
        console.error(`Error actualizando cuota ${update.id}:`, error.message);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTER PAYMENT
  // ─────────────────────────────────────────────────────────────────────────────

  const handleRegisterPayment = async () => {
    if (!selectedInstallment || !selectedLoan) return;

    try {
      const pagoReal =
        parseFloat(paymentData.actualAmount.toString().replace(/[^0-9.-]+/g, '')) || 0;
      const moraCobrada =
        parseFloat(paymentData.lateFee.toString().replace(/[^0-9.-]+/g, '')) || 0;
      const cuotaBase =
        parseFloat(selectedInstallment.expected_amount.toString().replace(/[^0-9.-]+/g, '')) || 0;

      const isLate = paymentData.daysLate > 0;
      const status = isLate ? 'LATE' : 'PAID';

      const cobroObligatorio = cuotaBase + moraCobrada;
      const abonoCapitalExtra = pagoReal - cobroObligatorio;

      const nuevoPrincipalPagadoEstaCuota =
        Number(selectedInstallment.principal_portion) +
        (abonoCapitalExtra > 0 ? abonoCapitalExtra : 0);

      const { error } = await supabase
        .from('loan_installments')
        .update({
          status: status,
          actual_payment_date: paymentData.actualDate,
          actual_amount_paid: pagoReal,
          late_fee_charged: moraCobrada,
          principal_portion: nuevoPrincipalPagadoEstaCuota,
        })
        .eq('id', selectedInstallment.id);

      if (error) throw error;

      if (abonoCapitalExtra > 10) {
        await recalculateFutureInstallments(
          abonoCapitalExtra,
          paymentData.extraPaymentType as 'REDUCE_TIME' | 'REDUCE_QUOTA'
        );
        alert(
          `¡Pago registrado! Abono extra a capital de ${formatCurrency(abonoCapitalExtra)} aplicado con éxito.`
        );
      } else {
        alert('¡Pago registrado con éxito!');
      }

      setShowPaymentModal(false);
      setLoanInstallments([]);
      await fetchInstallments(selectedLoan.id);
    } catch (err: any) {
      alert('Error al registrar pago: ' + err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const calculateCurrentBalance = () => {
    if (!selectedLoan || loanInstallments.length === 0) return 0;

    const capitalOriginal = Number(
      selectedLoan.principal_amount || selectedLoan.loan_amount
    );

    const capitalYaPagado = loanInstallments
      .filter((i) => i.status === 'PAID' || i.status === 'LATE')
      .reduce((sum, i) => sum + Number(i.principal_portion), 0);

    const saldo = capitalOriginal - capitalYaPagado;
    return saldo > 0 ? saldo : 0;
  };

  const exportToCSV = () => {
    if (!selectedLoan || loanInstallments.length === 0) return;
    let csvContent =
      'data:text/csv;charset=utf-8,No. Cuota,Fecha Esperada,Saldo Inicial,Costos Asociados,Capital,Interes,Mora Cobrada,Vr. Cuota,Saldo Final,Estado,Fecha Real Pago,Monto Real Pagado\n';

    let tempBalanceForExcel = Number(
      selectedLoan.principal_amount || selectedLoan.loan_amount
    );

    loanInstallments.forEach((row, index) => {
      if (row.status !== 'PAID_EARLY') {
        const saldoInicio = tempBalanceForExcel;
        const capitalRestar = Number(row.principal_portion);
        let saldoFinal = saldoInicio - capitalRestar;
        if (saldoFinal < 0) saldoFinal = 0;

        tempBalanceForExcel = saldoFinal;

        const costosAsociados =
          index === 0
            ? Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0)
            : 0;
        const valorCuotaTotal = Number(row.expected_amount) + costosAsociados;

        const rowData = [
          row.installment_number,
          row.expected_payment_date,
          saldoInicio,
          costosAsociados,
          row.principal_portion,
          row.interest_portion,
          row.late_fee_charged,
          valorCuotaTotal,
          saldoFinal,
          row.status,
          row.actual_payment_date || 'N/A',
          row.actual_amount_paid,
        ];
        csvContent += rowData.join(',') + '\n';
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `PlanPagos_${selectedLoan.client_name.replace(/ /g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return '$ 0';
    return '$ ' + num.toLocaleString('es-CO');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
            Al día
          </span>
        );
      case 'LATE':
        return (
          <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-semibold">
            Mora
          </span>
        );
      case 'PAID_EARLY':
        return (
          <span className="px-2 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-xs font-semibold">
            Anulada
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">
            Pendiente
          </span>
        );
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

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
            <button
              onClick={() => setActiveTab('solicitudes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'solicitudes'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" /> Solicitudes Web
            </button>
            <button
              onClick={() => setActiveTab('cartera')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'cartera'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-4 h-4" /> Cartera Activa
            </button>
            <button
              onClick={() => setActiveTab('simulador')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'simulador'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-4 h-4" /> Nuevo Crédito
            </button>
            <button
              onClick={() => setActiveTab('configuracion')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'configuracion'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" /> Configuración
            </button>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" /> Cerrar
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* PESTAÑA: SIMULADOR */}
        {activeTab === 'simulador' && <LoanOriginationEngine />}

        {/* PESTAÑA: CONFIGURACIÓN */}
        {activeTab === 'configuracion' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 mb-6">
              <h2 className="text-xl font-bold text-white mb-2">
                Tasas de Mora Diaria (Usura)
              </h2>
              <form
                onSubmit={handleAddUsuryRate}
                className="flex items-end gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/30 mb-8"
              >
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                    Mes
                  </label>
                  <select
                    value={newRate.month}
                    onChange={(e) => setNewRate({ ...newRate, month: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"
                  >
                    {monthNames.map((m, i) => (
                      <option key={i} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                    Año
                  </label>
                  <input
                    type="number"
                    value={newRate.year}
                    onChange={(e) => setNewRate({ ...newRate, year: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-xs font-semibold text-emerald-400 uppercase mb-2">
                    Tasa Diaria (Ej: 0.00062)
                  </label>
                  <input
                    type="number"
                    step="0.000000001"
                    required
                    value={newRate.rate}
                    onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                    className="w-full bg-slate-800 border border-emerald-500/50 rounded-lg p-2.5 text-white font-mono outline-none focus:border-emerald-500"
                    placeholder="0.00000"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                >
                  <Plus size={18} /> Agregar
                </button>
              </form>

              <div className="overflow-x-auto bg-slate-900/30 rounded-xl border border-slate-700/50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase border-b border-slate-700/50">
                    <tr>
                      <th className="p-4">Periodo</th>
                      <th className="p-4 text-right">Tasa Diaria Registrada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {usuryRates.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-slate-500">
                          No hay tasas registradas. El sistema no cobrará mora.
                        </td>
                      </tr>
                    ) : (
                      usuryRates.map((rate) => (
                        <tr key={rate.id} className="hover:bg-slate-800/50">
                          <td className="p-4 text-slate-200 font-medium">
                            {monthNames[rate.period_month - 1]} {rate.period_year}
                          </td>
                          <td className="p-4 text-emerald-400 font-mono text-right">
                            {rate.daily_late_rate}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: CARTERA */}
        {activeTab === 'cartera' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div
              className={`${
                selectedLoan ? 'lg:col-span-1' : 'lg:col-span-3'
              } bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all`}
            >
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4">Créditos Otorgados</h2>
                {!selectedLoan && (
                  <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex justify-between">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Capital Colocado
                      </p>
                      <p className="text-xl font-bold text-emerald-400 font-mono">
                        {formatCurrency(
                          activeLoans.reduce(
                            (sum, loan) =>
                              sum + Number(loan.principal_amount || loan.loan_amount),
                            0
                          )
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        Créditos Activos
                      </p>
                      <p className="text-xl font-bold text-slate-200 font-mono">
                        {activeLoans.length}
                      </p>
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
                    {activeLoans.map((loan) => (
                      <tr
                        key={loan.id}
                        onClick={() => handleSelectLoan(loan)}
                        className={`cursor-pointer transition-colors ${
                          selectedLoan?.id === loan.id
                            ? 'bg-emerald-500/10 border-l-4 border-emerald-500'
                            : 'hover:bg-slate-700/20'
                        }`}
                      >
                        <td className="p-4">
                          <p className="font-bold text-slate-200 text-sm truncate">
                            {loan.client_name}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            {loan.client_id_number || loan.client_id}
                          </p>
                        </td>
                        <td className="p-4 text-sm font-bold text-emerald-400 text-right tabular-nums">
                          {formatCurrency(loan.principal_amount || loan.loan_amount)}
                        </td>
                        {!selectedLoan && (
                          <td className="p-4 text-center">
                            <button className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800 rounded-lg">
                              <Eye size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedLoan && (
              <div className="lg:col-span-2 bg