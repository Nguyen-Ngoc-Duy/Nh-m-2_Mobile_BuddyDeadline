import { supabase } from '@/lib/supabase';

export async function listCategories(): Promise<string[]> {
  const { data, error } = await supabase.from('categories').select('name').order('name');
  if (error) throw error;
  return (data ?? []).map((r) => r.name as string);
}

export async function addCategory(name: string) {
  const { error } = await supabase.from('categories').insert({ name });
  if (error) throw error;
}

export async function removeCategory(name: string) {
  const { error } = await supabase.from('categories').delete().eq('name', name);
  if (error) throw error;
}