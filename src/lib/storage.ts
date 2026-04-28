import { supabase } from './supabase';

export async function uploadImage(file: File, bucket: string, path: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(archivos)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Error uploading image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(archivos)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
