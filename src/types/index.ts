export type CreditType = 'ENTREPRENEURSHIP' | 'REAL_ESTATE' | 'FREE_INVESTMENT' | 'MICROCREDIT';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreditApplication {
  id: string;
  credit_type: CreditType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_number: string;
  credit_amount: number;
  id_front_image?: string;
  id_back_image?: string;
  selfie_image?: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface ApplicationFormData {
  credit_type: CreditType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_number: string;
  credit_amount: number;
}
