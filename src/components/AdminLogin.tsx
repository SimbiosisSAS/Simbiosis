import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Key, MessageSquare, RefreshCw } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');

  // Paso 1: Credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Paso 2: OTP
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpExpiry, setOtpExpiry] = useState<number>(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const sendOtp = async (code: string) => {
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error('No se pudo enviar el código de verificación');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Generar código OTP de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpExpiry(Date.now() + 15 * 60 * 1000);

      await sendOtp(code);
      setStep('otp');
    } catch (err: any) {
      if (err.message.includes('código')) {
        setError(err.message);
      } else {
        setError('Correo o contraseña incorrectos.');
        await supabase.auth.signOut();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (Date.now() > otpExpiry) {
      setOtpError('El código expiró. Vuelve a iniciar sesión.');
      setStep('credentials');
      setOtpInput('');
      return;
    }

    if (otpInput !== generatedOtp) {
      setOtpError('Código incorrecto. Verifica el mensaje de WhatsApp.');
      return;
    }

    onLoginSuccess();
  };

  const handleResendOtp = async () => {
    setResending(true);
    setOtpError(null);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpExpiry(Date.now() + 15 * 60 * 1000);
      await sendOtp(code);
      setOtpInput('');
    } catch {
      setOtpError('No se pudo reenviar el código. Intenta de nuevo.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">

        {/* PASO 1: CREDENCIALES */}
        {step === 'credentials' && (
          <>
            <div className="text-center mb-8">
              <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="text-emerald-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-navy-900">Acceso Administrativo</h2>
              <p className="text-slate-500 text-sm mt-2">Ingresa tus credenciales para continuar</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="admin@simbiosis.la"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg transition-colors mt-6 disabled:opacity-50"
              >
                {isLoading ? 'Verificando...' : 'Continuar'}
              </button>
            </form>
          </>
        )}

        {/* PASO 2: CÓDIGO OTP */}
        {step === 'otp' && (
          <>
            <div className="text-center mb-8">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-green-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-navy-900">Verificación en 2 pasos</h2>
              <p className="text-slate-500 text-sm mt-2">
                Enviamos un código de 6 dígitos a tu WhatsApp registrado
              </p>
            </div>

            {otpError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código de verificación
                </label>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1 text-center">El código expira en 15 minutos</p>
              </div>

              <button
                type="submit"
                disabled={otpInput.length !== 6}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Verificar y Acceder
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={handleResendOtp}
                disabled={resending}
                className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
              >
                <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Reenviando...' : 'Reenviar código'}
              </button>
              <button
                onClick={() => { setStep('credentials'); setOtpInput(''); setOtpError(null); supabase.auth.signOut(); }}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                Volver al inicio
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}