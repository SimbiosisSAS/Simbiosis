import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhzcgyjpvhpqhlkbaxwe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloemNneWpwdmhwcWhsa2JheHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMzE5MzYsImV4cCI6MjA5MjkwNzkzNn0.B7AO3ME8H61HlY6EF1MZqTQxlQYM-iFg4udPZX8wGRY';

export const supabase = createClient(supabaseUrl, supabaseKey);
