import { useState } from 'react';
import { ApplicationFormData } from '../types';
import { ArrowRight, ArrowLeft, Upload, Check, Lock, Shield } from 'lucide-react';

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
        setErrors(prev => ({ ...prev, [type]: 'Por favor selecciona una imagen valida' }));
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
    if (!images.idFront) newErrors.idFront = 'Foto de cedula frontal es requerida';
    if (!images.idBack) newErrors.idBack = 'Foto de cedula trasera es requerida';
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
      <label className="block text-sm font-semibold text-navy-800 mb-2">{label} *</label>
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
          className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            previews[type]
              ? 'border-emerald-300 bg-emerald-50/50'
              : errors[type]
              ? 'border-red-300 bg-red-50/50'
              : 'border-slate-200 bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50/30'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {previews[type] ? (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-emerald-700">Imagen subida correctamente</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-navy-800">{label}</p>
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
          )}
        </label>
      </div>
      {previews[type] && (
        <div className="mt-3 relative rounded-xl overflow-hidden h-40 bg-slate-100 border border-slate-200">
          <img src={previews[type]!} alt={label} className="w-full h-full object-cover" />
        </div>
      )}
      {errors[type] && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors[type]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        <button
          onClick={onBack}
          disabled={isLoading}
          className={`mb-8 flex items-center gap-2 font-medium transition-colors group ${
            isLoading ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:text-navy-700'
          }`}
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Volver
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-2">Sube tus documentos</h1>
            <p className="text-slate-600 text-sm">Necesitamos tus documentos de identidad para completar tu solicitud</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <DocumentUploadField
              type="idFront"
              label="Cedula - Lado Frontal"
              description="Captura clara del frente de tu cedula"
            />

            <DocumentUploadField
              type="idBack"
              label="Cedula - Lado Trasero"
              description="Captura clara del reverso de tu cedula"
            />

            <DocumentUploadField
              type="selfie"
              label="Foto de Rostro"
              description="Selfie clara de tu rostro para verificacion"
            />

            <div className="bg-navy-50 border border-navy-200 rounded-xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-navy-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-navy-800">Tus datos estan protegidos</p>
                <p className="text-xs text-navy-600 mt-1">Las imagenes se transmiten con encriptacion AES-256 y se almacenan de forma segura. Maximo 5MB cada una.</p>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className={`flex-1 btn-secondary ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Atras
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 btn-primary inline-flex items-center justify-center gap-2 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
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
