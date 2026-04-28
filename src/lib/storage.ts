import { supabase } from './supabase';

export async function uploadImage(file: File, bucketName: string, path: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}-${Date.now()}.${fileExt}`;

  // Mantenemos forzado el bucket que sabemos que funciona
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

  const { data: urlData } = supabase.storage
    .from(targetBucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}