import { supabase } from '@/lib/supabase';

export type Deadline = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  category: string;
  priority: string;
  reminder: string;
  completed: boolean;
};

export type DeadlineInput = Omit<Deadline, 'id' | 'completed'>;

const pad = (n: number) => String(n).padStart(2, '0');

function fromRow(r: any): Deadline {
  const d = new Date(r.due_at);
  return {
    id: r.id,
    title: r.title,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    category: r.category,
    priority: r.priority,
    reminder: r.reminder,
    completed: r.completed,
  };
}

function toRow(v: DeadlineInput) {
  return {
    title: v.title,
    due_at: new Date(`${v.date}T${v.time}:00`).toISOString(),
    category: v.category,
    priority: v.priority,
    reminder: v.reminder,
  };
}

export async function listDeadlines(): Promise<Deadline[]> {
  const { data, error } = await supabase.from('deadlines').select('*').order('due_at');
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function getDeadline(id: string): Promise<Deadline | null> {
  const { data, error } = await supabase
    .from('deadlines').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function addDeadline(v: DeadlineInput) {
  const { error } = await supabase.from('deadlines').insert(toRow(v));
  if (error) throw error;
}

export async function updateDeadline(id: string, v: DeadlineInput) {
  const { error } = await supabase.from('deadlines').update(toRow(v)).eq('id', id);
  if (error) throw error;
}

export async function setCompleted(id: string, completed: boolean) {
  const { error } = await supabase.from('deadlines').update({ completed }).eq('id', id);
  if (error) throw error;
}

export async function removeDeadline(id: string) {
  const { error } = await supabase.from('deadlines').delete().eq('id', id);
  if (error) throw error;
}