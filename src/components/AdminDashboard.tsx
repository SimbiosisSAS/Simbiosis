import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditApplication } from '../types';
import { CheckCircle, XCircle, Clock, Eye, Sparkles, Filter, FileText, Calculator, LogOut, Wallet, DollarSign, Calendar, Download, Settings, Plus, Trash2, TrendingUp } from 'lucide-react'; // ← se agrega TrendingUp al final
import LoanOriginationEngine from './LoanOriginationEngine';
import IndicadoresCartera from './IndicadoresCartera'; // ← línea nueva

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
  
const [carteraView, setCarteraView] = useState<'creditos' | 'indicadores'>('creditos');
  const [historialCliente, setHistorialCliente] = useState<any[]>([]);
  const [showReversalModal, setShowReversalModal] = useState(false);
const [installmentToRevert, setInstallmentToRevert] = useState<any | null>(null);
const [showRestructuringModal, setShowRestructuringModal] = useState(false);
const [restructuringParams, setRestructuringParams] = useState({
  nuevaTasa: 0,
  nuevosPlazo: 0,
  capitalizarMora: false,
});
  const [showRestructuringModal, setShowRestructuringModal] = useState(false);
const [restructuringParams, setRestructuringParams] = useState({
  nuevaTasa: 0,
  nuevosPlazo: 0,
  capitalizarMora: false,
});
const [showNotificationModal, setShowNotificationModal] = useState(false);
const [notificationPhone, setNotificationPhone] = useState('');
const [notificationInstallment, setNotificationInstallment] = useState<any | null>(null);
const [sendingNotification, setSendingNotification] = useState(false);
const [showPazYSalvoModal, setShowPazYSalvoModal] = useState(false);
const [pazYSalvoData, setPazYSalvoData] = useState<any>(null);

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

  const fetchHistorialCliente = async (clientId: string, currentLoanId: string) => {
  const { data, error } = await supabase
    .from('active_loans')
    .select('*')
    .eq('client_id_number', clientId)
    .neq('id', currentLoanId)
    .order('created_at', { ascending: false });
  if (!error) setHistorialCliente(data || []);
};

const handleSelectLoan = (loan: any) => {
  setSelectedLoan(loan);
  fetchInstallments(loan.id);
  fetchHistorialCliente(loan.client_id_number || loan.client_id, loan.id);
  setHistorialCliente([]);
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
  const capitalOriginal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount) 
  + Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0);
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
const calculatePazYSalvo = () => {
  if (!selectedLoan || loanInstallments.length === 0) return;

  const rateRaw = selectedLoan.interest_rate_monthly ?? selectedLoan.nominal_rate_mv ?? null;
  let rate = rateRaw !== null ? Number(rateRaw) / 100 : 0;
  if (!rate || rate <= 0) {
    const primera = loanInstallments.find(i => i.installment_number === 1);
    const principal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
    if (primera && principal > 0) rate = Number(primera.interest_portion) / principal;
  }

  const saldoActual = calculateCurrentBalance();

  // Última fecha de pago o fecha de desembolso
  const pagadas = loanInstallments
    .filter(i => i.status === 'PAID' || i.status === 'LATE')
    .sort((a, b) => b.installment_number - a.installment_number);

  const ultimaFecha = pagadas.length > 0
    ? new Date(pagadas[0].actual_payment_date || pagadas[0].expected_payment_date)
    : new Date(selectedLoan.disbursement_date);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  ultimaFecha.setHours(0, 0, 0, 0);

  const diasTranscurridos = Math.max(
    0,
    Math.floor((hoy.getTime() - ultimaFecha.getTime()) / 86400000)
  );

  // Interés corrido: saldo * ((1 + tasa_mensual)^(días/30) - 1)
  const interesCorrido = diasTranscurridos > 0
    ? Math.round(saldoActual * (Math.pow(1 + rate, diasTranscurridos / 30) - 1))
    : 0;

  // Moras calculadas en tiempo real para cuotas vencidas
const hoyStr = hoy.toISOString().split('T')[0];
const morasPendientes = loanInstallments
  .filter(i => i.status === 'PENDING')
  .reduce((sum, i) => {
    const fechaEsperada = new Date(i.expected_payment_date);
    fechaEsperada.setHours(0, 0, 0, 0);
    if (fechaEsperada < hoy) {
      const moraCalc = calculateLateFee(
        i.expected_payment_date,
        hoyStr,
        Number(i.expected_amount)
      );
      return sum + moraCalc.penalty;
    }
    return sum;
  }, 0);

  const totalAPagar = saldoActual + interesCorrido + morasPendientes;

  setPazYSalvoData({
    saldoActual,
    diasTranscurridos,
    interesCorrido,
    morasPendientes,
    totalAPagar,
    tienePagos: pagadas.length > 0,
    fechaCalculo: hoy.toLocaleDateString('es-CO'),
    ultimaFecha: ultimaFecha.toLocaleDateString('es-CO'),
  });

  setShowPazYSalvoModal(true);
};
const generarEstadoCuenta = () => {
  if (!selectedLoan || loanInstallments.length === 0) return;

  const capitalOriginal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount);
  let saldoTemp = capitalOriginal + Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0);

  const filas = loanInstallments
    .filter(i => i.status !== 'PAID_EARLY')
    .map((inst, index) => {
      const saldoInicio = saldoTemp;
      const capital = Number(inst.principal_portion);
      let saldoFinal = Math.max(saldoInicio - capital, 0);
      saldoTemp = saldoFinal;
      const costos = index === 0 ? Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0) : 0;

let moraFila = Number(inst.late_fee_charged || 0);
if (inst.status === 'PENDING') {
  const fechaEsp = new Date(inst.expected_payment_date);
  fechaEsp.setHours(0, 0, 0, 0);
  const hoyDoc = new Date(); hoyDoc.setHours(0, 0, 0, 0);
  if (fechaEsp < hoyDoc) {
    const moraCalc = calculateLateFee(
      inst.expected_payment_date,
      new Date().toISOString().split('T')[0],
      Number(inst.expected_amount)
    );
    moraFila = moraCalc.penalty;
  }
}

      const estadoLabel: any = {
        PAID: 'Al día', LATE: 'Mora', PENDING: 'Pendiente', PAID_EARLY: 'Anulada'
      };

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; text-align:center;">${inst.installment_number}</td>
          <td style="padding: 8px;">${inst.actual_payment_date || inst.expected_payment_date}</td>
          <td style="padding: 8px; text-align:right;">$ ${Math.round(saldoInicio).toLocaleString('es-CO')}</td>
          <td style="padding: 8px; text-align:right;">${costos > 0 ? '$ ' + costos.toLocaleString('es-CO') : '--'}</td>
          <td style="padding: 8px; text-align:right;">$ ${Math.round(capital).toLocaleString('es-CO')}</td>
          <td style="padding: 8px; text-align:right;">$ ${Math.round(Number(inst.interest_portion)).toLocaleString('es-CO')}</td>
          <td style="padding: 8px; text-align:right; color: ${moraFila > 0 ? '#dc2626' : '#6b7280'};">
  ${moraFila > 0 ? '$ ' + Math.round(moraFila).toLocaleString('es-CO') : '--'}
</td>
          <td style="padding: 8px; text-align:right; font-weight:bold;">$ ${Math.round(Number(inst.expected_amount)).toLocaleString('es-CO')}</td>
          <td style="padding: 8px; text-align:right;">$ ${Math.round(saldoFinal).toLocaleString('es-CO')}</td>
          <td style="padding: 8px; text-align:center;">
            <span style="padding: 2px 8px; border-radius: 9999px; font-size:11px; background: ${inst.status === 'PAID' ? '#d1fae5' : inst.status === 'LATE' ? '#fee2e2' : '#fef9c3'}; color: ${inst.status === 'PAID' ? '#065f46' : inst.status === 'LATE' ? '#991b1b' : '#854d0e'};">
              ${estadoLabel[inst.status] || inst.status}
            </span>
          </td>
          <td style="padding: 8px; text-align:right; color: #059669; font-weight:bold;">
            ${inst.actual_amount_paid > 0 ? '$ ' + Math.round(Number(inst.actual_amount_paid)).toLocaleString('es-CO') : '--'}
          </td>
        </tr>`;
    }).join('');

  const totalIntereses = loanInstallments.reduce((s, i) => s + Number(i.interest_portion), 0);
const totalPagado = loanInstallments.filter(i => i.status === 'PAID' || i.status === 'LATE').reduce((s, i) => s + Number(i.actual_amount_paid || 0), 0);
const saldoVivo = calculateCurrentBalance();

const hoyDocStr = new Date().toISOString().split('T')[0];
const hoyDocDate = new Date(); hoyDocDate.setHours(0, 0, 0, 0);

const totalMoras = loanInstallments.reduce((s, i) => {
  if (i.status === 'PENDING') {
    const fechaEsp = new Date(i.expected_payment_date);
    fechaEsp.setHours(0, 0, 0, 0);
    const hoyD = new Date(); hoyD.setHours(0, 0, 0, 0);
    if (fechaEsp < hoyD) {
      const m = calculateLateFee(i.expected_payment_date, hoyDocStr, Number(i.expected_amount));
      return s + m.penalty;
    }
  }
  return s + Number(i.late_fee_charged || 0);
}, 0);

const cuotasVencidas = loanInstallments.filter(i => {
  if (i.status !== 'PENDING') return false;
  const f = new Date(i.expected_payment_date); f.setHours(0, 0, 0, 0);
  return f < hoyDocDate;
});
const cuotasFuturas = loanInstallments.filter(i => {
  if (i.status !== 'PENDING') return false;
  const f = new Date(i.expected_payment_date); f.setHours(0, 0, 0, 0);
  return f >= hoyDocDate;
});
const totalCuotasVencidas = cuotasVencidas.reduce((s, i) => s + Number(i.expected_amount), 0);
const totalCuotasFuturas = cuotasFuturas.reduce((s, i) => s + Number(i.expected_amount), 0);
const totalARegularizar = totalCuotasVencidas + totalMoras;
const totalDeudaHoy = totalARegularizar + totalCuotasFuturas;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <title>Estado de Cuenta - ${selectedLoan.client_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111827; padding: 32px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #059669; padding-bottom: 16px; }
        .logo { font-size: 22px; font-weight: bold; color: #059669; }
        .subtitle { font-size: 11px; color: #6b7280; margin-top: 2px; }
        h2 { font-size: 16px; margin-bottom: 4px; }
        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .info-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
        .info-label { font-size: 10px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
        .info-value { font-size: 15px; font-weight: bold; color: #111827; }
        .info-value.green { color: #059669; }
        .info-value.red { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        thead { background: #059669; color: white; }
        th { padding: 8px; text-align: right; white-space: nowrap; }
        th:first-child, th:nth-child(2) { text-align: left; }
        tbody tr:nth-child(even) { background: #f9fafb; }
        .summary { margin-top: 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; }
        .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; text-align: center; }
        @media print { body { padding: 16px; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div style="font-size:30px; font-weight:900; font-family:Arial,sans-serif; background:linear-gradient(to right, #ef4444, #f97316, #f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1;">
  SIMBIOSIS
</div>
<div style="font-size:11px; color:#9ca3af; letter-spacing:2px; margin-top:2px;">conoce, invierte, crece</div>
        </div>
        <div style="text-align:right;">
          <h2>Estado de Cuenta</h2>
          <p style="color:#6b7280; font-size:12px;">Fecha de corte: ${new Date().toLocaleDateString('es-CO')}</p>
          <button onclick="window.print()" style="margin-top:8px; padding:6px 16px; background:#059669; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Cliente</div>
          <div class="info-value">${selectedLoan.client_name}</div>
          <div style="font-size:11px; color:#6b7280;">ID: ${selectedLoan.client_id_number || selectedLoan.client_id}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Capital Original</div>
          <div class="info-value">$ ${capitalOriginal.toLocaleString('es-CO')}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Saldo Vivo Actual</div>
          <div class="info-value ${saldoVivo > 0 ? 'red' : 'green'}">$ ${Math.round(saldoVivo).toLocaleString('es-CO')}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Fecha Desembolso</div>
          <div class="info-value">${new Date(selectedLoan.disbursement_date).toLocaleDateString('es-CO')}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Tasa Nominal MV</div>
          <div class="info-value">${selectedLoan.interest_rate_monthly ?? selectedLoan.nominal_rate_mv ?? '--'}%</div>
        </div>
        <div class="info-card">
          <div class="info-label">Cuotas Pagadas</div>
          <div class="info-value green">${loanInstallments.filter(i => i.status === 'PAID' || i.status === 'LATE').length} de ${loanInstallments.filter(i => i.status !== 'PAID_EARLY').length}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align:center;">No.</th>
            <th style="text-align:left;">Fecha</th>
            <th>Saldo Inicio</th>
            <th>Costos</th>
            <th>Capital</th>
            <th>Interés</th>
            <th>Mora</th>
            <th>Vr. Cuota</th>
            <th>Saldo Final</th>
            <th>Estado</th>
            <th>Pagado</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>

      <div class="summary">
        <div class="summary-card">
          <div class="info-label">Total Intereses</div>
          <div class="info-value">$ ${Math.round(totalIntereses).toLocaleString('es-CO')}</div>
        </div>
        <div class="summary-card">
          <div class="info-label">Total Moras</div>
          <div class="info-value red">$ ${Math.round(totalMoras).toLocaleString('es-CO')}</div>
        </div>
        <div class="summary-card">
          <div class="info-label">Total Pagado</div>
          <div class="info-value green">$ ${Math.round(totalPagado).toLocaleString('es-CO')}</div>
        </div>
        <div class="summary-card" style="background:#fff7ed; border-color:#fed7aa;">
          <div class="info-label">Saldo Pendiente</div>
          <div class="info-value" style="color:#c2410c;">$ ${Math.round(saldoVivo).toLocaleString('es-CO')}</div>
        </div>
      </div>
<div style="margin-top: 24px; border: 2px solid #dc2626; border-radius: 8px; overflow: hidden;">
        <div style="background: #dc2626; padding: 10px 16px;">
          <p style="color: white; font-weight: bold; font-size: 13px; margin: 0;">Resumen de Deuda a la Fecha — ${new Date().toLocaleDateString('es-CO')}</p>
        </div>
        <div style="padding: 16px; background: #fff5f5;">
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #fecaca;">
              <td style="padding: 8px 4px; color: #374151;">Cuotas vencidas sin pagar (${cuotasVencidas.length})</td>
              <td style="padding: 8px 4px; text-align: right; font-weight: bold; color: #dc2626;">$ ${Math.round(totalCuotasVencidas).toLocaleString('es-CO')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #fecaca;">
              <td style="padding: 8px 4px; color: #374151;">Mora acumulada</td>
              <td style="padding: 8px 4px; text-align: right; font-weight: bold; color: #dc2626;">$ ${Math.round(totalMoras).toLocaleString('es-CO')}</td>
            </tr>
            <tr style="border-bottom: 2px solid #dc2626; background: #fee2e2;">
              <td style="padding: 10px 4px; font-weight: bold; color: #991b1b;">TOTAL A REGULARIZAR HOY</td>
              <td style="padding: 10px 4px; text-align: right; font-weight: bold; font-size: 15px; color: #991b1b;">$ ${Math.round(totalARegularizar).toLocaleString('es-CO')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 4px; color: #6b7280;">Cuotas futuras pendientes (${cuotasFuturas.length})</td>
              <td style="padding: 8px 4px; text-align: right; color: #6b7280;">$ ${Math.round(totalCuotasFuturas).toLocaleString('es-CO')}</td>
            </tr>
            <tr style="background: #f0fdf4;">
              <td style="padding: 10px 4px; font-weight: bold; color: #065f46;">DEUDA TOTAL DEL CRÉDITO</td>
              <td style="padding: 10px 4px; text-align: right; font-weight: bold; font-size: 15px; color: #065f46;">$ ${Math.round(totalDeudaHoy).toLocaleString('es-CO')}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="footer">
        Documento generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')} — Simbiosis Loan Management System
      </div>
    </body>
    </html>`;

  const ventana = window.open('', '_blank', 'width=1100,height=800');
  if (ventana) {
    ventana.document.write(html);
    ventana.document.close();
  }
};
  const handleReversarPago = async () => {
  if (!installmentToRevert || !selectedLoan) return;
  try {
    const capitalOriginalPlanificado = Number(installmentToRevert.expected_amount) - Number(installmentToRevert.interest_portion);
    const { error } = await supabase.from('loan_installments').update({
      status: 'PENDING',
      actual_payment_date: null,
      actual_amount_paid: 0,
      late_fee_charged: 0,
      principal_portion: capitalOriginalPlanificado,
    }).eq('id', installmentToRevert.id);
    if (error) throw error;
    setShowReversalModal(false);
    setInstallmentToRevert(null);
    await fetchInstallments(selectedLoan.id);
    await repairFullSchedule();
    alert('¡Pago revertido correctamente! El plan de pagos fue recalculado.');
  } catch (err: any) {
    alert('Error al reversar el pago: ' + err.message);
  }
};
  const handleAplicarReestructuracion = async () => {
  if (!selectedLoan || loanInstallments.length === 0) return;
  if (!window.confirm(`¿Confirmas la reestructuración del crédito de ${selectedLoan.client_name}? Esta acción cancela el plan actual y crea uno nuevo.`)) return;

  try {
    const nuevaTasa = restructuringParams.nuevaTasa / 100;
    const nuevosPlazo = restructuringParams.nuevosPlazo;

    if (!nuevaTasa || nuevaTasa <= 0) { alert('Ingresa una tasa válida.'); return; }
    if (!nuevosPlazo || nuevosPlazo <= 0) { alert('Ingresa un plazo válido.'); return; }

    let nuevoSaldo = calculateCurrentBalance();

    if (restructuringParams.capitalizarMora) {
      const hoyStr = new Date().toISOString().split('T')[0];
      const moraAcumulada = loanInstallments.reduce((s, i) => {
        if (i.status === 'PENDING') {
          const f = new Date(i.expected_payment_date); f.setHours(0,0,0,0);
          const h = new Date(); h.setHours(0,0,0,0);
          if (f < h) {
            const m = calculateLateFee(i.expected_payment_date, hoyStr, Number(i.expected_amount));
            return s + m.penalty;
          }
        }
        return s + Number(i.late_fee_charged || 0);
      }, 0);
      nuevoSaldo += moraAcumulada;
    }

    const nuevaCuota = Math.round(nuevoSaldo * (nuevaTasa * Math.pow(1 + nuevaTasa, nuevosPlazo)) / (Math.pow(1 + nuevaTasa, nuevosPlazo) - 1));

    // Cancelar cuotas pendientes
    const pendientes = loanInstallments.filter(i => i.status === 'PENDING');
    for (const inst of pendientes) {
      await supabase.from('loan_installments').update({
        status: 'PAID_EARLY', expected_amount: 0, principal_portion: 0, interest_portion: 0
      }).eq('id', inst.id);
    }

    // Crear nuevas cuotas
    const ultimaCuota = [...loanInstallments].sort((a, b) => b.installment_number - a.installment_number)[0];
    let nextInstNumber = ultimaCuota.installment_number + 1;
    let lastDate = new Date(ultimaCuota.expected_payment_date);
    let currentBalance = nuevoSaldo;

    for (let i = 0; i < nuevosPlazo; i++) {
      lastDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate());
      const interest = Math.round(currentBalance * nuevaTasa);
      let principal = nuevaCuota - interest;
      if (principal >= currentBalance || i === nuevosPlazo - 1) principal = Math.round(currentBalance);
      principal = Math.round(principal);

      await supabase.from('loan_installments').insert({
        loan_id: selectedLoan.id,
        installment_number: nextInstNumber,
        expected_payment_date: lastDate.toISOString().split('T')[0],
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

    // Actualizar active_loans con nuevas condiciones
    await supabase.from('active_loans').update({
      interest_rate_monthly: restructuringParams.nuevaTasa,
      fixed_quota_amount: nuevaCuota,
      installments: nuevosPlazo,
    }).eq('id', selectedLoan.id);

    setShowRestructuringModal(false);
    await fetchInstallments(selectedLoan.id);
    alert(`¡Crédito reestructurado! Nueva cuota: ${formatCurrency(nuevaCuota)} por ${nuevosPlazo} meses.`);
  } catch (err: any) {
    alert('Error en la reestructuración: ' + err.message);
  }
};
  const handleEnviarNotificacion = async () => {
  if (!notificationInstallment || !selectedLoan || !notificationPhone) return;
  setSendingNotification(true);
  try {
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: notificationPhone,
        clientName: selectedLoan.client_name,
        installmentNumber: notificationInstallment.installment_number,
        amount: notificationInstallment.expected_amount,
        dueDate: new Date(notificationInstallment.expected_payment_date).toLocaleDateString('es-CO'),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error enviando mensaje');
    alert(`¡Notificación enviada exitosamente a ${notificationPhone}!`);
    setShowNotificationModal(false);
    setNotificationPhone('');
    setNotificationInstallment(null);
  } catch (err: any) {
    alert('Error: ' + err.message);
  } finally {
    setSendingNotification(false);
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
    
    const capitalOriginal = Number(selectedLoan.principal_amount || selectedLoan.loan_amount) 
  + Number(selectedLoan.associated_costs || selectedLoan.origination_costs || 0);
    
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
const vrCuota = Number(row.expected_amount); // costos ya capitalizados en la cuota
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
const handleDeleteApplication = async (appId: string) => {
    const confirmDelete = window.confirm('¿Estás seguro de que quieres eliminar esta solicitud permanentemente?');
    if (confirmDelete) {
      try {
        const { error } = await supabase.from('credit_applications').delete().eq('id', appId);
        if (error) throw error;
        alert('Solicitud eliminada.');
        fetchApplications();
        setSelectedApp(null);
      } catch (err: any) {
        alert('Error eliminando solicitud: ' + err.message);
      }
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
        
        {/* PESTAÑA: SIMULADOR */}
        {activeTab === 'simulador' && <LoanOriginationEngine prefillData={dataForSimulator} />}

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
  <div className="space-y-6">

    {/* SUB-NAVEGACIÓN */}
    <div className="flex gap-2 bg-slate-800/40 border border-slate-700/50 rounded-xl p-1 w-fit">
      <button
        onClick={() => setCarteraView('creditos')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${carteraView === 'creditos' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <Wallet className="w-4 h-4" /> Créditos
      </button>
      <button
        onClick={() => { setCarteraView('indicadores'); setSelectedLoan(null); }}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${carteraView === 'indicadores' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <TrendingUp className="w-4 h-4" /> Indicadores
      </button>
    </div>

    {/* VISTA: INDICADORES */}
    {carteraView === 'indicadores' && <IndicadoresCartera />}

    {/* VISTA: CRÉDITOS (lo que ya existe) */}
    {carteraView === 'creditos' && (
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
                  <div className="flex gap-2 flex-wrap">
  <button
    onClick={calculatePazYSalvo}
    className="text-emerald-400 hover:text-white px-3 py-1.5 bg-emerald-900/20 hover:bg-emerald-600 rounded-lg text-sm border border-emerald-900/50 transition-colors flex items-center gap-1"
  >
    <DollarSign size={14} /> Paz y Salvo
  </button>
                    <button
  onClick={calculatePazYSalvo}
  className="text-emerald-400 hover:text-white px-3 py-1.5 bg-emerald-900/20 hover:bg-emerald-600 rounded-lg text-sm border border-emerald-900/50 transition-colors flex items-center gap-1"
>
  <DollarSign size={14} /> Paz y Salvo
</button>

<button
  onClick={() => {
    setRestructuringParams({
      nuevaTasa: Number(selectedLoan.interest_rate_monthly || selectedLoan.nominal_rate_mv || 0),
      nuevosPlazo: 12,
      capitalizarMora: false,
    });
    setShowRestructuringModal(true);
  }}
  className="text-amber-400 hover:text-white px-3 py-1.5 bg-amber-900/20 hover:bg-amber-600 rounded-lg text-sm border border-amber-900/50 transition-colors flex items-center gap-1"
>
  <Settings size={14} /> Reestructurar
</button>
  <button
    onClick={generarEstadoCuenta}
    className="text-blue-400 hover:text-white px-3 py-1.5 bg-blue-900/20 hover:bg-blue-600 rounded-lg text-sm border border-blue-900/50 transition-colors flex items-center gap-1"
  >
    <FileText size={14} /> Estado de Cuenta
  </button>
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
{historialCliente.length > 0 && (
  <div className="mb-6 bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
      <FileText size={14} className="text-amber-400" />
      Historial crediticio del cliente
      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
        {historialCliente.length} crédito{historialCliente.length !== 1 ? 's' : ''} anterior{historialCliente.length !== 1 ? 'es' : ''}
      </span>
    </h4>
    <div className="space-y-2">
      {historialCliente.map(loan => {
        const monto = Number(loan.principal_amount || loan.loan_amount);
        return (
          <div key={loan.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-300">
                  Crédito #{loan.loan_number || loan.id.slice(0,8)}
                </p>
                <p className="text-xs text-slate-500">
                  Desembolso: {new Date(loan.disbursement_date).toLocaleDateString('es-CO')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-400 font-mono">
                {formatCurrency(monto)}
              </p>
              <p className="text-xs text-slate-500">
                {loan.interest_rate_monthly ?? loan.nominal_rate_mv ?? '--'}% MV · {loan.installments || loan.term_months || '--'} meses
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
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
const valorCuotaTotal = Number(inst.expected_amount); // costos ya capitalizados en la cuota

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
  <div className="flex flex-col items-center gap-1">
    <span className="text-emerald-500 font-mono font-bold text-xs">{formatCurrency(inst.actual_amount_paid)}</span>
    <button
      onClick={() => { setInstallmentToRevert(inst); setShowReversalModal(true); }}
      className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded text-xs transition-colors"
    >
      Reversar
    </button>
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
                    {selectedApp.status === 'REJECTED' && (
                      <div className="space-y-3 pt-6 border-t border-slate-700/50">
                        <button onClick={() => handleDeleteApplication(selectedApp.id)} className="w-full bg-slate-800 hover:bg-red-900/50 text-red-400 py-2 rounded-xl text-sm font-bold border border-red-900/50 transition-colors flex items-center justify-center gap-2">
                          <Trash2 size={16} /> Eliminar Permanentemente
                        </button>
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
      {/* MODAL REVERSIÓN DE PAGO */}
{showReversalModal && installmentToRevert && (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
      <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <XCircle className="text-red-500" /> Reversar Pago
      </h2>
      <p className="text-slate-400 text-sm mb-6">Esta acción anula el pago registrado y devuelve la cuota a estado pendiente.</p>
      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Cuota:</span>
          <span className="text-slate-200">#{installmentToRevert.installment_number}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Fecha pagada:</span>
          <span className="text-slate-200">{installmentToRevert.actual_payment_date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Monto registrado:</span>
          <span className="text-red-400 font-mono font-bold">{formatCurrency(installmentToRevert.actual_amount_paid)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Cuota esperada:</span>
          <span className="text-slate-200 font-mono">{formatCurrency(installmentToRevert.expected_amount)}</span>
        </div>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6">
        <p className="text-xs text-amber-400">El plan de pagos se recalculará automáticamente después de la reversión.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => { setShowReversalModal(false); setInstallmentToRevert(null); }} className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium">Cancelar</button>
        <button onClick={handleReversarPago} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors font-bold">Confirmar Reversión</button>
      </div>
    </div>
  </div>
)}

{/* MODAL REESTRUCTURACIÓN */}
{showRestructuringModal && selectedLoan && (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
      <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <Settings className="text-amber-500" /> Reestructuración de Deuda
      </h2>
      <p className="text-slate-400 text-sm mb-6">Modifica las condiciones del crédito de <span className="text-white font-semibold">{selectedLoan.client_name}</span></p>

      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Saldo actual:</span>
          <span className="text-white font-mono font-bold">{formatCurrency(calculateCurrentBalance())}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Tasa actual:</span>
          <span className="text-slate-300">{selectedLoan.interest_rate_monthly ?? selectedLoan.nominal_rate_mv ?? '--'}% MV</span>
        </div>
      </div>

      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nueva Tasa MV (%)</label>
          <input
            type="number" step="0.01" min="0"
            value={restructuringParams.nuevaTasa || ''}
            onChange={e => setRestructuringParams(p => ({ ...p, nuevaTasa: Number(e.target.value) }))}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500"
            placeholder="Ej: 0.8"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nuevo Plazo (meses)</label>
          <input
            type="number" min="1"
            value={restructuringParams.nuevosPlazo || ''}
            onChange={e => setRestructuringParams(p => ({ ...p, nuevosPlazo: Number(e.target.value) }))}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500"
            placeholder="Ej: 12"
          />
        </div>
        <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-amber-500/50 transition-colors">
          <input
            type="checkbox"
            checked={restructuringParams.capitalizarMora}
            onChange={e => setRestructuringParams(p => ({ ...p, capitalizarMora: e.target.checked }))}
            className="h-4 w-4 text-amber-500"
          />
          <div>
            <p className="text-sm text-slate-200 font-medium">Capitalizar mora acumulada</p>
            <p className="text-xs text-slate-500">Suma la mora al capital — el cliente no paga mora hoy pero aumenta su deuda</p>
          </div>
        </label>
      </div>

      {restructuringParams.nuevaTasa > 0 && restructuringParams.nuevosPlazo > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4">
          <p className="text-xs text-slate-400 mb-1">Nueva cuota estimada:</p>
          <p className="text-xl font-bold text-emerald-400 font-mono">
            {formatCurrency(Math.round(
              (calculateCurrentBalance() + (restructuringParams.capitalizarMora ? loanInstallments.filter(i => i.status === 'PENDING').reduce((s, i) => { const f = new Date(i.expected_payment_date); f.setHours(0,0,0,0); const h = new Date(); h.setHours(0,0,0,0); return f < h ? s + calculateLateFee(i.expected_payment_date, new Date().toISOString().split('T')[0], Number(i.expected_amount)).penalty : s; }, 0) : 0)) *
              ((restructuringParams.nuevaTasa / 100) * Math.pow(1 + restructuringParams.nuevaTasa / 100, restructuringParams.nuevosPlazo)) /
              (Math.pow(1 + restructuringParams.nuevaTasa / 100, restructuringParams.nuevosPlazo) - 1)
            ))}
          </p>
          <p className="text-xs text-slate-500 mt-1">por {restructuringParams.nuevosPlazo} meses</p>
        </div>
      )}

      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-6">
        <p className="text-xs text-red-400">Las cuotas pendientes actuales serán canceladas y se creará un nuevo plan de pagos.</p>
      </div>

      <div className="flex gap-3">
        <button onClick={() => setShowRestructuringModal(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium">Cancelar</button>
        <button onClick={handleAplicarReestructuracion} className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-colors font-bold">Aplicar Reestructuración</button>
      </div>
    </div>
  </div>
)}
{showPazYSalvoModal && pazYSalvoData && selectedLoan && (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
      <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <DollarSign className="text-emerald-500" /> Liquidación Anticipada
      </h2>
      <p className="text-slate-400 text-sm mb-6">
        Paz y Salvo para <span className="text-white font-semibold">{selectedLoan.client_name}</span>
      </p>

      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Saldo Capital:</span>
          <span className="text-slate-200 font-mono">{formatCurrency(pazYSalvoData.saldoActual)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">{pazYSalvoData.tienePagos ? 'Último pago:' : 'Fecha desembolso:'}</span>
          <span className="text-slate-300">{pazYSalvoData.ultimaFecha}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Días transcurridos:</span>
          <span className="text-amber-400 font-bold">{pazYSalvoData.diasTranscurridos} días</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Interés corrido:</span>
          <span className="text-amber-400 font-mono">+ {formatCurrency(pazYSalvoData.interesCorrido)}</span>
        </div>
        {pazYSalvoData.morasPendientes > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Moras pendientes:</span>
            <span className="text-red-400 font-mono">+ {formatCurrency(pazYSalvoData.morasPendientes)}</span>
          </div>
        )}
        <div className="border-t border-slate-700 pt-3 mt-2 flex justify-between">
          <span className="text-white font-bold text-base">Total a Pagar Hoy:</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{formatCurrency(pazYSalvoData.totalAPagar)}</span>
        </div>
        <p className="text-xs text-slate-500 text-right">Calculado al {pazYSalvoData.fechaCalculo}</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6">
        <p className="text-xs text-amber-400">
          Este valor es válido únicamente para el día de hoy. Si el pago se realiza en una fecha diferente, debe recalcularse.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setShowPazYSalvoModal(false)}
          className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium"
        >
          Cerrar
        </button>
        <button
          onClick={() => {
            generarEstadoCuenta();
            setShowPazYSalvoModal(false);
          }}
          className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-bold"
        >
          Ver Estado de Cuenta
        </button>
      </div>
    </div>
  </div>
)}
        
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