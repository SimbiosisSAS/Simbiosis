import { supabase } from './supabase';

export async function uploadImage(file: File, path: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}-${Date.now()}.${fileExt}`;

  // ¡Nota cómo aquí dice 'bucket' entre comillas explícitamente!
  const { data, error } = await supabase.storage
    .from('bucket')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Error uploading image: ${error.message}`);
  }

  // Y aquí también dice 'bucket'
  const { data: urlData } = supabase.storage
    .from('bucket')
    .getPublicUrl(fileName); // NOTA: cambié data.path por fileName

  return urlData.publicUrl;
}
