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
 * Valid Status Lifecycle:
 * reported -> assigned -> in_progress -> resolved
 */
const STATUS_STAGES = {
  reported: 0,
  assigned: 1,
  in_progress: 2,
  resolved: 3
};

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
  
  // Backward compatibility: Map legacy 'pending' or 'new' to 'reported'
  return data.map(report => ({
    ...report,
    status: (report.status === 'pending' || report.status === 'new') ? 'reported' : report.status
  }));
};

/**
 * Insert a single new report into the 'reports' table
 * @param {Object} reportData - { latitude, longitude, severity, description, ... }
 */
export const createReport = async (reportData) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check your credentials.');
  }

  // Ensure default status is 'reported'
  const finalStatus = 'reported';
  const DEFAULT_ZONE_ID = "b46a8b33-c277-4fd8-8e2d-97b5e6ba6a5c";

  // Calculate SLA deadline based on severity
  const now = Date.now();
  let deadline;
  if (reportData.severity === 'high') {
    deadline = now + (2 * 60 * 60 * 1000); // 2 hours
  } else if (reportData.severity === 'medium') {
    deadline = now + (6 * 60 * 60 * 1000); // 6 hours
  } else {
    deadline = now + (12 * 60 * 60 * 1000); // 12 hours
  }

  // STEP 1: Inject default zone_id and calculated SLA deadline into the insert
  const { data, error } = await supabase
    .from('reports')
    .insert([{ 
      ...reportData, 
      status: finalStatus,
      zone_id: DEFAULT_ZONE_ID,
      eta: deadline
    }])
    .select();

  if (error) {
    console.error('Supabase Insert Error:', error);
    throw error;
  }

  // AUTO-ASSIGNMENT LOGIC (Non-blocking)
  try {
    // STEP 2: Extract inserted report
    const newReport = data[0];
    if (!newReport) return data;

    // STEP 3: Fetch all workers globally (Removed zone-based filtering)
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*');

    if (workersError || !workers || workers.length === 0) {
      console.log('No workers found for global auto-assignment or fetch error:', workersError);
      return data;
    }

    // STEP 4: For each worker, count active tasks
    const workersWithLoad = await Promise.all(workers.map(async (worker) => {
      const { count, error: countError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', worker.id)
        .in('status', ['assigned', 'in_progress']);
      
      return { ...worker, taskCount: count || 0 };
    }));

    console.log('Worker task counts:', workersWithLoad.map(w => ({ name: w.name, load: w.taskCount })));

    // STEP 5 & 6: Filter (tasks < 3) and Sort by least tasks
    const eligibleWorkers = workersWithLoad
      .filter(w => w.taskCount < 3)
      .sort((a, b) => a.taskCount - b.taskCount);

    // STEP 7: Pick first worker
    const selectedWorker = eligibleWorkers[0];

    // STEP 8: If selectedWorker exists, update the report
    if (selectedWorker) {
      console.log('Selected Worker for auto-assignment:', selectedWorker.name);
      
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          assigned_to: selectedWorker.id,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', newReport.id);

      if (updateError) {
        console.error('Post-creation auto-assignment update failed:', updateError);
      }
    } else {
      console.log('No eligible workers found (all over-burdened or none filtered).');
    }

  } catch (autoAssignErr) {
    // STEP 9 (Implicit) & Safety: Log and continue
    console.error('Fatal error during auto-assignment logic:', autoAssignErr);
  }

  // STEP 10: Ensure function still returns original data
  return data;
};

/**
 * Update the status of an existing report with workflow validation
 * @param {string} id - The report ID
 * @param {string} nextStatus - The new status to transition to
 */
export const updateReportStatus = async (id, nextStatus) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  // 1. Fetch current status to validate transition
  const { data: current, error: fetchError } = await supabase
    .from('reports')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const currentStatus = (current.status === 'pending' || current.status === 'new') ? 'reported' : (current.status || 'reported');
  
  // 2. Validate transition (prevent going backwards or skipping stages except for direct assignment)
  // We allow transition if nextStatus is one step ahead in the lifecycle
  const currentStage = STATUS_STAGES[currentStatus] ?? 0;
  const nextStage = STATUS_STAGES[nextStatus] ?? 0;

  if (nextStage <= currentStage && currentStatus !== 'reported') {
    console.warn(`Invalid transition attempt: ${currentStatus} -> ${nextStatus}`);
    // still proceed if it's already in that status (idempotency)
    if (currentStatus === nextStatus) return current; 
    throw new Error(`Cannot transition from ${currentStatus} to ${nextStatus}`);
  }

  // 3. Perform update
  const { data, error } = await supabase
    .from('reports')
    .update({ status: nextStatus })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating status:', error);
    throw error;
  }
  return data;
};

/**
 * Assign a report to a specific responder/worker and advance status to 'assigned'
 * @param {string} reportId - The report ID (UUID)
 * @param {string} workerId - The worker/responder ID (UUID)
 */
export const assignReport = async (reportId, workerId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('reports')
    .update({
      assigned_to: workerId,
      assigned_at: new Date().toISOString(),
      status: 'assigned' // Standardized workflow step
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    console.error('Assignment failed:', error);
    throw error;
  }

  return data;
};

/**
 * Submit a new contact/demo request
 */
export const submitContactRequest = async ({ full_name, email, message }) => {
  try {
    const payload = {
      full_name: full_name?.trim(),
      email: email?.trim(),
      message: message?.trim(),
      status: 'pending'
    };

    console.log("📦 FINAL PAYLOAD:", payload);

    const { data, error } = await supabase
      .from('contact_requests')
      .insert([payload])
      .select();

    if (error) {
      console.error("❌ SUPABASE ERROR:", error);
      return { success: false, error };
    }

    console.log("✅ INSERTED:", data);
    return { success: true, data };

  } catch (err) {
    console.error("🔥 UNEXPECTED ERROR:", err);
    return { success: false, error: err };
  }
};

/**
 * Fetch all contact requests ordered by newest first
 */
export const getContactRequests = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('contact_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contact requests:', error);
    throw error;
  }
  return data;
};

/**
 * Update the status of a specific contact request (e.g., 'approved', 'rejected')
 */
export const updateContactStatus = async (id, status) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { error } = await supabase
    .from('contact_requests')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating contact status:', error);
    throw error;
  }
};

