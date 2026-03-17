import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client-side Supabase instance
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Server-side Supabase instance (for API routes)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

/**
 * Save student progress to Supabase
 */
export async function saveProgress(studentId, data) {
  if (!supabase) {
    console.warn('Supabase not configured — progress saved locally only');
    return null;
  }
  try {
    const { error } = await supabase
      .from('student_progress')
      .upsert({ student_id: studentId, ...data, updated_at: new Date().toISOString() });
    if (error) console.error('Save progress error:', error);
    return !error;
  } catch (e) {
    console.warn('Supabase save failed (non-critical):', e);
    return null;
  }
}

/**
 * Load student progress from Supabase
 */
export async function loadProgress(studentId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', studentId)
      .single();
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Save chat message to history
 */
export async function saveChatMessage(studentId, message) {
  if (!supabase) return null;
  try {
    const { error } = await supabase
      .from('chat_history')
      .insert({ student_id: studentId, ...message });
    return !error;
  } catch (e) {
    return null;
  }
}

/**
 * Load textbook sections from Supabase
 */
export async function loadTextbookSections() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('textbook_sections')
      .select('*')
      .order('id');
    if (error || !data) return [];
    return data;
  } catch (e) {
    return [];
  }
}

/**
 * Save textbook sections to Supabase
 */
export async function saveTextbookSections(sections) {
  if (!supabase) return false;
  try {
    const rows = sections.map(s => ({
      title: s.title,
      chapter: s.chapter,
      page: s.page,
      content: s.content,
    }));
    const { error } = await supabase.from('textbook_sections').insert(rows);
    if (error) console.error('Save textbook sections error:', error);
    return !error;
  } catch (e) {
    console.warn('Supabase textbook save failed:', e);
    return false;
  }
}
