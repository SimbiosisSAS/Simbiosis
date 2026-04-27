import { useState } from 'react';
import { ApplicationFormData } from '../types';
import { ArrowRight, ArrowLeft, Upload, Check } from 'lucide-react';

interface DocumentUploadProps {
  formData: ApplicationFormData;
  onSubmit: (images: { idFront: File; idBack: File; selfie: File }) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function DocumentUpload({ formData, onSubmit, onBack, isLoading = false }: DocumentUploadProps) {
  const [images, setImages] = useState<{
    idFront: File | null;
    idBack: File | null;
    selfie: File | null;
  }>({
    idFront: null,
    idBack: null,
    selfie: null
  });

  const [previews, setPreviews] = useState<{
    idFront: string | null;
    idBack: string | null;
    selfie: string | null;
  }>({
    idFront: null,
    idBack: null,
    selfie: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'idFront' | 'idBack' | 'selfie') => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, [type]: 'Por favor selecciona una imagen válida' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [type]: 'La imagen no debe superar 5MB' }));
        return;
      }

      setImages(prev => ({ ...prev, [type]: file }));
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviews(prev => ({ ...prev, [type]: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
      setErrors(prev => ({ ...prev, [type]: '' }));
    }
  };

  const validateDocuments = () => {
    const newErrors: Record<string, string> = {};
    if (!images.idFront) newErrors.idFront = 'Foto de cédula frontal es requerida';
    if (!images.idBack) newErrors.idBack = 'Foto de cédula trasera es requerida';
    if (!images.selfie) newErrors.selfie = 'Foto de rostro es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateDocuments() && images.idFront && images.idBack && images.selfie) {
      onSubmit({
        idFront: images.idFront,
        idBack: images.idBack,
        selfie: images.selfie
      });
    }
  };

  const DocumentUploadField = ({
    type,
    label,
    description
  }: {
    type: 'idFront' | 'idBack' | 'selfie';
    label: string;
    description: string;
  }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-3">{label} *</label>
      <div className="relative">
        <input
          type="file"
          id={type}
          accept="image/*"
          onChange={(e) => handleFileChange(e, type)}
          className="hidden"
          disabled={isLoading}
        />
        <label
          htmlFor={type}
          className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            previews[type]
              ? 'border-green-300 bg-green-50'
              : errors[type]
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-gray-50 hover:border-orange-500 hover:bg-orange-50'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {previews[type] ? (
            <div className="flex flex-col items-center">
              <Check className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-sm font-semibold text-green-700">Imagen subida correctamente</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-semibold text-gray-700">{label}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          )}
        </label>
      </div>
      {previews[type] && (
        <div className="mt-4 relative rounded-lg overflow-hidden h-40 bg-gray-100">
          <img src={previews[type]!} alt={label} className="w-full h-full object-cover" />
        </div>
      )}
      {errors[type] && <p className="text-red-600 text-sm mt-2">{errors[type]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-32 pb-12">
      <div className="max-w-2xl mx-auto px-6">
        <button
          onClick={onBack}
          disabled={isLoading}
          className={`mb-8 flex items-center gap-2 font-medium transition-colors ${
            isLoading ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 border border-gray-100">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sube tus Documentos</h1>
            <p className="text-gray-600">Necesitamos tus documentos de identidad para completar tu solicitud</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <DocumentUploadField
              type="idFront"
              label="Cédula - Lado Frontal"
              description="Captura clara del frente de tu cédula"
            />

            <DocumentUploadField
              type="idBack"
              label="Cédula - Lado Trasero"
              description="Captura clara del reverso de tu cédula"
            />

            <DocumentUploadField
              type="selfie"
              label="Foto de Rostro"
              description="Selfie clara de tu rostro"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Requisitos:</span> Las imágenes deben ser claras, legibles y sin obstrucciones. Máximo 5MB cada una.
              </p>
            </div>

            <div className="flex gap-4 pt-8">
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className={`flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg transition-colors ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:from-red-700 hover:to-orange-600'
                }`}
              >
                {isLoading ? 'Procesando...' : 'Completar Solicitud'}
                {!isLoading && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
