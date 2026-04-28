import { createClient } from '@supabase/supabase-js';

// Usamos las credenciales directas para garantizar la conexión
const supabaseUrl = 'https://yhzcgyjpvhpqhlkbaxwe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloemNneWpwdmhwcWhsa2JheHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMzE5MzYsImV4cCI6MjA5MjkwNzkzNn0.B7AO3ME8H61HlY6EF1MZqTQxlQYM-iFg4udPZX8wGRY'; // ¡Asegúrate de pegar la llave real aquí!
const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadImage(file: File, bucketName: string, path: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}-${Date.now()}.${fileExt}`;

  // Obligamos a que siempre use el bucket 'archivos'
  const targetBucket = 'archivos';

  console.log(`Intentando subir al bucket: ${targetBucket}`);

  const { data, error } = await supabase.storage
    .from(targetBucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error("Error completo de Supabase:", error);
    throw new Error(`Error uploading image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(targetBucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}