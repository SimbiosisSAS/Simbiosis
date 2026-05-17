import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Session { loanId: string; clientName: string; cedula: string; }

const fmt = (v: number) => '$ ' + Math.round(v).toLocaleString('es-CO');

export default function ClientPortal() {
  const [step, setStep]               = useState<'cedula' | 'otp' | 'dashboard'>('cedula');
  const [cedula, setCedula]           = useState('');
  const [otp, setOtp]                 = useState('');
  const [session, setSession]         = useState<Session | null>(null);
  const [clientName, setClientName]   = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [loan, setLoan]               = useState<any>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('simbiosis_portal_session');
    if (saved) {
      try {
        const s = JSON.parse(saved) as Session;
        setSession(s);
        loadLoanData(s.loanId);
        setStep('dashboard');
      } catch { localStorage.removeItem('simbiosis_portal_session'); }
    }
  }, []);

  const loadLoanData = async (loanId: string) => {
    setLoading(true);
    const [loanRes, instRes] = await Promise.all([
      supabase.from('active_loans').select('*').eq('id', loanId).single(),
      supabase.from('loan_installments').select('*').eq('loan_id', loanId).order('installment_number', { ascending: true }),
    ]);
    if (loanRes.data) setLoan(loanRes.data);
    if (instRes.data) setInstallments(instRes.data);
    setLoading(false);
  };

  const handleSendOtp = async () => {
  if (!cedula.trim()) { setError('Ingresa tu número de cédula'); return; }
  setLoading(true); setError('');
  try {
    // 1. Buscar crédito con Supabase JS (esto sí funciona)
    const { data: loans } = await supabase
      .from('active_loans')
      .select('id, client_name, client_phone')
      .eq('client_id_number', cedula.trim());

    if (!loans || loans.length === 0) {
      setError('No encontramos ningún crédito con esa cédula.');
      return;
    }

    // 2. Obtener teléfono
    let phone = loans[0].client_phone || '';
    if (!phone) {
      const { data: apps } = await supabase
        .from('credit_applications')
        .select('phone')
        .eq('id_number', cedula.trim())
        .order('created_at', { ascending: false })
        .limit(1);
      if (apps && apps.length > 0) phone = apps[0].phone || '';
    }

    if (!phone) {
      setError('No encontramos teléfono registrado para este cliente. Contacta a Simbiosis.');
      return;
    }

    // 3. Llamar API solo para generar OTP y enviar WhatsApp
    const res = await fetch('/api/client-portal-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cedula: cedula.trim(),
        phone,
        clientName: loans[0].client_name,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Error enviando código'); return; }

    setClientName(loans[0].client_name);
    setPhoneMasked(data.phoneMasked);
    setStep('otp');
  } catch { setError('Error de conexión. Intenta de nuevo.'); }
  finally { setLoading(false); }
};

const handleVerifyOtp = async () => {
  if (!otp.trim()) { setError('Ingresa el código'); return; }
  setLoading(true); setError('');
  try {
    const now = new Date().toISOString();
    const { data: otps } = await supabase
      .from('portal_otps')
      .select('id')
      .eq('cedula', cedula.trim())
      .eq('otp', otp.trim())
      .eq('used', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!otps || otps.length === 0) {
      setError('Código incorrecto o expirado. Solicita uno nuevo.');
      return;
    }

    await supabase.from('portal_otps').update({ used: true }).eq('id', otps[0].id);

    const { data: loans } = await supabase
      .from('active_loans')
      .select('id, client_name')
      .eq('client_id_number', cedula.trim())
      .limit(1);

    const s: Session = {
      loanId: loans![0].id,
      clientName: loans![0].client_name,
      cedula: cedula.trim(),
    };
    setSession(s);
    localStorage.setItem('simbiosis_portal_session', JSON.stringify(s));
    await loadLoanData(s.loanId);
    setStep('dashboard');
  } catch { setError('Error de conexión. Intenta de nuevo.'); }
  finally { setLoading(false); }
};
  const handleLogout = () => {
    localStorage.removeItem('simbiosis_portal_session');
    setSession(null); setLoan(null); setInstallments([]);
    setCedula(''); setOtp(''); setStep('cedula');
  };

  // ── CALCULAR DATOS DEL CRÉDITO ─────────────────────────────────────────
  const capitalOriginal = loan ? Number(loan.principal_amount || loan.loan_amount) + Number(loan.associated_costs || loan.origination_costs || 0) : 0;
  const capitalPagado = installments.filter(i => i.status === 'PAID' || i.status === 'LATE').reduce((s, i) => s + Number(i.principal_portion), 0);
  const saldoVivo = Math.max(capitalOriginal - capitalPagado, 0);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const proximaCuota = installments.find(i => i.status === 'PENDING' && new Date(i.expected_payment_date) >= hoy);
  const cuotasVencidas = installments.filter(i => { const f = new Date(i.expected_payment_date); f.setHours(0,0,0,0); return i.status === 'PENDING' && f < hoy; });
  const pagadas = installments.filter(i => i.status === 'PAID' || i.status === 'LATE');

  // ── PANTALLA LOGIN — CÉDULA ────────────────────────────────────────────
  if (step === 'cedula') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div style={{ fontSize:36, fontWeight:900, background:'linear-gradient(to right,#ef4444,#f97316,#f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            SIMBIOSIS
          </div>
          <p className="text-slate-500 text-xs tracking-widest mt-1">conoce, invierte, crece</p>
          <h2 className="text-xl font-bold text-slate-800 mt-6">Portal de Clientes</h2>
          <p className="text-slate-500 text-sm mt-1">Consulta tu crédito en cualquier momento</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Número de Cédula</label>
          <input
            type="text" value={cedula}
            onChange={e => { setCedula(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-lg font-mono focus:outline-none focus:border-emerald-500 mb-4"
            placeholder="12345678"
          />
          {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}
          <button onClick={handleSendOtp} disabled={loading} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
            {loading ? 'Verificando...' : 'Enviar Código por WhatsApp →'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── PANTALLA LOGIN — OTP ───────────────────────────────────────────────
  if (step === 'otp') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div style={{ fontSize:36, fontWeight:900, background:'linear-gradient(to right,#ef4444,#f97316,#f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            SIMBIOSIS
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Hola, {clientName}</h2>
            <p className="text-slate-500 text-sm mt-1">Enviamos un código a <strong>{phoneMasked}</strong></p>
          </div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Código de 6 dígitos</label>
          <input
            type="text" value={otp} maxLength={6}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-2xl font-mono text-center tracking-widest focus:outline-none focus:border-emerald-500 mb-4"
            placeholder="000000"
          />
          {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}
          <button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 mb-3">
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
          <button onClick={() => { setStep('cedula'); setOtp(''); setError(''); }} className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm transition-colors">
            ← Volver
          </button>
        </div>
      </div>
    </div>
  );

  // ── DASHBOARD ──────────────────────────────────────────────────────────
  if (step === 'dashboard' && loan) return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0f172a,#1e293b)' }} className="px-6 py-5">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <div style={{ fontSize:22, fontWeight:900, background:'linear-gradient(to right,#ef4444,#f97316,#f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              SIMBIOSIS
            </div>
            <p className="text-slate-400 text-xs">Hola, {session?.clientName} 👋</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white text-xs px-3 py-1.5 border border-slate-700 rounded-lg transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Alertas mora */}
        {cuotasVencidas.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-700 font-bold text-sm">⚠️ Tienes {cuotasVencidas.length} cuota{cuotasVencidas.length > 1 ? 's' : ''} vencida{cuotasVencidas.length > 1 ? 's' : ''}</p>
            <p className="text-red-600 text-xs mt-1">Comunícate con Simbiosis para evitar intereses de mora adicionales.</p>
          </div>
        )}

        {/* Saldo y próxima cuota */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Saldo Pendiente</p>
            <p className="text-2xl font-bold text-slate-800 font-mono">{fmt(saldoVivo)}</p>
            <p className="text-xs text-slate-400 mt-1">{pagadas.length} de {installments.filter(i=>i.status!=='PAID_EARLY').length} cuotas pagadas</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 shadow-sm">
            <p className="text-xs text-emerald-600 uppercase tracking-wider mb-1">Próxima Cuota</p>
            {proximaCuota ? (
              <>
                <p className="text-2xl font-bold text-emerald-700 font-mono">{fmt(Number(proximaCuota.expected_amount))}</p>
                <p className="text-xs text-emerald-600 mt-1">{new Date(proximaCuota.expected_payment_date).toLocaleDateString('es-CO', { day:'numeric', month:'long' })}</p>
              </>
            ) : (
              <p className="text-emerald-700 font-bold text-sm mt-2">¡Crédito al día! ✅</p>
            )}
          </div>
        </div>

        {/* Info del crédito */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Información del Crédito</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-slate-400 text-xs">Capital original</p><p className="font-semibold text-slate-700 font-mono">{fmt(capitalOriginal)}</p></div>
            <div><p className="text-slate-400 text-xs">Tasa mensual</p><p className="font-semibold text-slate-700">{loan.interest_rate_monthly ?? loan.nominal_rate_mv ?? '--'}% MV</p></div>
            <div><p className="text-slate-400 text-xs">Fecha desembolso</p><p className="font-semibold text-slate-700">{new Date(loan.disbursement_date).toLocaleDateString('es-CO')}</p></div>
            <div><p className="text-slate-400 text-xs">Cuota fija</p><p className="font-semibold text-slate-700 font-mono">{fmt(Number(loan.fixed_quota_amount))}</p></div>
          </div>
        </div>

        {/* Historial de pagos */}
        {pagadas.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">Historial de Pagos</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {[...pagadas].reverse().map(inst => (
                <div key={inst.id} className="px-5 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Cuota #{inst.installment_number}</p>
                    <p className="text-xs text-slate-400">{inst.actual_payment_date || inst.expected_payment_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600 font-mono">{fmt(Number(inst.actual_amount_paid || 0))}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${inst.status==='LATE' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {inst.status==='LATE' ? 'Con mora' : 'Al día'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan de pagos */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700">Plan de Pagos Completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Cuota</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {installments.filter(i => i.status !== 'PAID_EARLY').map(inst => {
                  const fechaVence = new Date(inst.expected_payment_date); fechaVence.setHours(0,0,0,0);
                  const vencida = inst.status === 'PENDING' && fechaVence < hoy;
                  return (
                    <tr key={inst.id} className={vencida ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-600">#{inst.installment_number}</td>
                      <td className="px-4 py-3 text-slate-500">{inst.actual_payment_date || inst.expected_payment_date}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{fmt(Number(inst.expected_amount))}</td>
                      <td className="px-4 py-3 text-center">
                        {inst.status === 'PAID' ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Pagada</span>
                        : inst.status === 'LATE' ? <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Con mora</span>
                        : vencida ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Vencida</span>
                        : <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Pendiente</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          Simbiosis — conoce, invierte, crece · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500">Cargando...</p>
    </div>
  );

  return null;
}