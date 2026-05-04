import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { uploadImage } from './lib/storage';
import { CreditType, ApplicationFormData } from './types';
import HomePage from './components/HomePage';
import CreditTypeSelector from './components/CreditTypeSelector';
import ApplicationForm from './components/ApplicationForm';
import DocumentUpload from './components/DocumentUpload';
import SuccessPage from './components/SuccessPage';
import AdminDashboard from './components/AdminDashboard';

type AppStep = 'home' | 'credit-type' | 'form' | 'documents' | 'success' | 'admin';

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('home');
  const [selectedCreditType, setSelectedCreditType] = useState<CreditType | null>(null);
  const [formData, setFormData] = useState<ApplicationFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setCurrentStep('admin');
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

  const handleDocumentSubmit = async (images: {
    idFront: File;
    idBack: File;
    selfie: File;
  }) => {
    if (!formData || !selectedCreditType) return;

    setIsLoading(true);
    setError(null);

    try {
      const idFrontUrl = await uploadImage(images.idFront, 'archivos', 'id-front');
      const idBackUrl = await uploadImage(images.idBack, 'archivos', 'id-back');
      const selfieUrl = await uploadImage(images.selfie, 'archivos', 'selfie');

      const { error: dbError } = await supabase
        .from('credit_applications')
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
      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}

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
      {currentStep === 'admin' && <AdminDashboard />}
    </div>
  );
}

export default App;
