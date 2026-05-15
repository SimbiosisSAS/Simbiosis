import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CreditType, ApplicationFormData } from './types';
import HomePage from './components/HomePage';
import CreditTypeSelector from './components/CreditTypeSelector';
import ApplicationForm from './components/ApplicationForm';
import DocumentUpload from './components/DocumentUpload';
import SuccessPage from './components/SuccessPage';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';

// ============================================================================
// CONEXIÓN A SUPABASE (DIRECTA PARA EVITAR FALLOS DE CACHÉ EN BOLT)
// ============================================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yhzcgyjpvhpqhlkbaxwe.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloemNneWpwdmhwcWhsa2JheHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMzE5MzYsImV4cCI6MjA5MjkwNzkzNn0.B7AO3ME8H61HlY6EF1MZqTQxlQYM-iFg4udPZX8wGRY';

const directSupabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// FUNCIÓN BANCARIA PARA SUBIR IMÁGENES AL BUCKET 'archivos'
// ============================================================================
const uploadDirectly = async (file: File, path: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}-${Date.now()}.${fileExt}`;

  const { error } = await directSupabase.storage
    .from('archivos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw new Error(`Error subiendo imagen: ${error.message}`);

  const { data: urlData } = directSupabase.storage
    .from('archivos')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

// ============================================================================
// COMPONENTE PRINCIPAL (ENRUTADOR DE PANTALLAS)
// ============================================================================
type AppStep = 'home' | 'credit-type' | 'form' | 'documents' | 'success' | 'admin' | 'admin-login';

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('home');
  const [selectedCreditType, setSelectedCreditType] = useState<CreditType | null>(null);
  const [formData, setFormData] = useState<ApplicationFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      // Bloqueo de seguridad: Redirigir al Login en lugar del Panel Directo
      setCurrentStep('admin-login');
    }
  }, []);

  const handleStartApplication = () => {
    setCurrentStep('credit-type');
    setError(null);
  };

  const handleSelectCreditType = (type: CreditType) => {
    setSelectedCreditType(type);
    setCurrentStep('form');
  };

  const handleFormSubmit = (data: ApplicationFormData) => {
    setFormData(data);
    setCurrentStep('documents');
  };

  const handleDocumentSubmit = async (images: { idFront: File; idBack: File; selfie: File }) => {
    if (!formData || !selectedCreditType) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Subir las tres imágenes al bucket 'archivos'
      const idFrontUrl = await uploadDirectly(images.idFront, 'id-front');
      const idBackUrl = await uploadDirectly(images.idBack, 'id-back');
      const selfieUrl = await uploadDirectly(images.selfie, 'selfie');

      // 2. Guardar toda la solicitud de crédito en la base de datos
      const { error: dbError } = await directSupabase.from('credit_applications')
        .insert({
          credit_type: selectedCreditType,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          id_number: formData.id_number,
          credit_amount: formData.credit_amount,
          id_front_image: idFrontUrl,
          id_back_image: idBackUrl,
          selfie_image: selfieUrl,
          status: 'PENDING'
        });

      if (dbError) {
        throw new Error(dbError.message);
      }

      // 3. Mostrar pantalla de éxito al cliente
      setCurrentStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackHome = () => {
    setCurrentStep('home');
    setSelectedCreditType(null);
    setFormData(null);
    setError(null);
  };

  const handleBack = () => {
    if (currentStep === 'documents') {
      setCurrentStep('form');
    } else if (currentStep === 'form') {
      setCurrentStep('credit-type');
    } else if (currentStep === 'credit-type') {
      setCurrentStep('home');
    }
  };

  return (
    <div>
      {/* Mensajes de Error Globales */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}

      {/* Ruteador de Pantallas */}
      {currentStep === 'home' && <HomePage onStartApplication={handleStartApplication} />}
      
      {currentStep === 'credit-type' && (
        <CreditTypeSelector onSelect={handleSelectCreditType} onBack={handleBack} />
      )}
      
      {currentStep === 'form' && selectedCreditType && (
        <ApplicationForm
          creditType={selectedCreditType}
          onSubmit={handleFormSubmit}
          onBack={handleBack}
        />
      )}
      
      {currentStep === 'documents' && formData && (
        <DocumentUpload
          formData={formData}
          onSubmit={handleDocumentSubmit}
          onBack={handleBack}
          isLoading={isLoading}
        />
      )}
      
      {currentStep === 'success' && <SuccessPage onBackHome={handleBackHome} />}
      
      {/* Rutas Administrativas Seguras */}
      {currentStep === 'admin-login' && (
        <AdminLogin onLoginSuccess={() => setCurrentStep('admin')} />
      )}
      
      {currentStep === 'admin' && (
        <AdminDashboard onLogout={() => setCurrentStep('home')} />
      )}
    </div>
  );
}

export default App;
