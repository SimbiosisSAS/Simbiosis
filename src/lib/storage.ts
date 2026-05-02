import { supabase } from './supabase';

export async function uploadImage(file: File, bucketName: string, path: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}-${Date.now()}.${fileExt}`;

  // Forzamos siempre el bucket que creamos ayer
  const targetBucket = 'archivos';

  const { data, error } = await supabase.storage
    .from(targetBucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Error uploading image: ${error.message}`);
  }

  // Fíjate que aquí usamos fileName, no data.path
  const { data: urlData } = supabase.storage
    .from(targetBucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}