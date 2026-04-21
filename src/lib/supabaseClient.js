import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.error('CRITICAL: Supabase URL or Anon Key is missing in your .env file. The app will not be able to fetch or send data.');
}

export { supabase };

/**
 * Fetch all reports from the 'reports' table ordered by creation date
 */
export const getReports = async () => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
  return data;
};

/**
 * Insert a single new report into the 'reports' table
 * @param {Object} reportData - { latitude, longitude, severity, description, ... }
 */
export const createReport = async (reportData) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check your credentials.');
  }

  const sanitizedStatus = (reportData.status === 'pending' || reportData.status === 'new' || !reportData.status) 
    ? 'reported' 
    : reportData.status;

  const { data, error } = await supabase
    .from('reports')
    .insert([{ ...reportData, status: sanitizedStatus }])
    .select();

  if (error) {
    console.error('Supabase Insert Error:', error);
    throw error;
  }
  return data;
};

/**
 * Update the status of an existing report
 * @param {string} id - The report ID
 * @param {string} status - The new status (e.g., 'in_progress', 'resolved')
 */
export const updateReportStatus = async (id, status) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating status:', error);
    throw error;
  }
  return data[0];
};
