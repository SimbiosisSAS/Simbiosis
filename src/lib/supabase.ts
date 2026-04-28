import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhzcgyjpvhpqhlkbaxwe.supabase.co';
const supabaseKey = 'PEGA_AQUI_LA_LLAVE_ANON_QUE_COPIASTE_EN_LA_PANTALLA_ANTERIOR';

export const supabase = createClient(supabaseUrl, supabaseKey);
