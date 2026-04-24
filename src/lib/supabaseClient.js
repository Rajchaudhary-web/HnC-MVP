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
 * AUTO-ASSIGNMENT ENGINE: Identifies least-burdened worker and dispatches them to a report.
 * Filtered by workload capacity (max 3 active tasks).
 */
export const autoAssignWorker = async (reportId) => {
  try {
    // 1. Fetch all workers globally
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*');

    if (workersError || !workers || workers.length === 0) return;

    // 2. Map workers to their current active workload
    const workersWithLoad = await Promise.all(workers.map(async (worker) => {
      const { count } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', worker.id)
        .in('status', ['assigned', 'in_progress']);
      
      return { ...worker, taskCount: count || 0 };
    }));

    // 3. Select worker with the lowest task count (must be under 3 tasks)
    const eligibleWorkers = workersWithLoad
      .filter(w => w.taskCount < 3)
      .sort((a, b) => a.taskCount - b.taskCount);

    const selectedWorker = eligibleWorkers[0];

    if (selectedWorker) {
      console.log(`📡 Auto-dispatching incident ${reportId} to ${selectedWorker.name}`);
      
      await supabase
        .from('reports')
        .update({
          assigned_to: selectedWorker.id,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', reportId);
    } else {
      console.warn("⚠️ ALL RESPONDERS AT FULL CAPACITY: Manual orchestration required for incident", reportId);
    }
  } catch (err) {
    console.error("Critical Failure in Auto-Assignment Engine:", err);
  }
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

  // Calculate SLA deadline based on severity (in minutes)
  let deadlineMinutes;
  if (reportData.severity === 'high') {
    deadlineMinutes = 120; // 2 hours
  } else if (reportData.severity === 'medium') {
    deadlineMinutes = 360; // 6 hours
  } else {
    deadlineMinutes = 720; // 12 hours
  }

  // STEP 1: Inject default zone_id and calculated SLA deadline into the insert
  const { data, error } = await supabase
    .from('reports')
    .insert([{ 
      ...reportData, 
      status: finalStatus,
      zone_id: DEFAULT_ZONE_ID,
      eta: deadlineMinutes
    }])
    .select();

  if (error) {
    console.error('Supabase Insert Error:', error);
    throw error;
  }

  // Immediately trigger the centralized auto-assignment engine
  if (data && data.length > 0) {
    autoAssignWorker(data[0].id); // Non-blocking
  }

  return data;
};

/**
 * Update the status of an existing report with workflow validation
 * @param {string} id - The report ID
 * @param {string} nextStatus - The new status to transition to
 */
export const updateReportStatus = async (id, nextStatus) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const updates = { status: nextStatus };

  const { data, error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Status Update Error:', error);
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


/**
 * SIMULATION ENGINE: Create realistic demo reports for system stress-testing
 * Generates 6 reports with varied severity, SLAs, and staggered locations.
 */
export const simulateReports = async () => {
  const now = Date.now();
  const DEFAULT_ZONE_ID = "b46a8b33-c277-4fd8-8e2d-97b5e6ba6a5c";

  const fakeReports = [
    {
      title: "Sewage Overflow",
      severity: "high",
      description: "Critical overflow near residential block Alpha. Potential health hazard.",
      location_name: "Sector A, Grid 402",
      latitude: 28.6139 + Math.random() * 0.01,
      longitude: 77.2090 + Math.random() * 0.01
    },
    {
      title: "Drain Blockage",
      severity: "medium",
      description: "Water clogging in main street causing traffic diversion.",
      location_name: "Sector B, Node 105",
      latitude: 28.6139 + Math.random() * 0.01,
      longitude: 77.2090 + Math.random() * 0.01
    },
    {
      title: "Pipeline Leak",
      severity: "low",
      description: "Minor leakage reported in secondary supply line.",
      location_name: "Sector C, Junction 88",
      latitude: 28.6139 + Math.random() * 0.01,
      longitude: 77.2090 + Math.random() * 0.01
    }
  ];

  console.log("🚀 Initiating Urban Simulation: Deploying realistic anomalies...");

  for (let i = 0; i < 6; i++) {
    const reportTemplate = fakeReports[Math.floor(Math.random() * fakeReports.length)];

    // Calculate SLA deadline based on severity (in minutes)
    let deadlineMinutes;
    if (reportTemplate.severity === 'high') {
      deadlineMinutes = 120; // 2 hours
    } else if (reportTemplate.severity === 'medium') {
      deadlineMinutes = 360; // 6 hours
    } else {
      deadlineMinutes = 720; // 12 hours
    }

    try {
      const { data, error } = await supabase.from('reports').insert([{
        title: reportTemplate.title || "Sewage Issue",
        description: reportTemplate.description || "Auto-generated simulation record",
        severity: reportTemplate.severity || "medium",
        priority: reportTemplate.severity || "medium", // Added priority to match schema requirements
        status: "reported",
        latitude: reportTemplate.latitude || 28.6139,
        longitude: reportTemplate.longitude || 77.2090,
        location_name: reportTemplate.location_name || "Unknown Area",
        area: "Demo Zone",
        zone_id: DEFAULT_ZONE_ID,
        eta: deadlineMinutes
      }]).select();

      if (error) throw error;
      console.log(`✅ Simulation Incident ${i+1} Materialized: ${reportTemplate.title}`);

      // Immediately trigger the centralized auto-assignment engine
      if (data && data.length > 0) {
        autoAssignWorker(data[0].id); // Non-blocking
      }
    } catch (err) {
      console.error("❌ FULL INSERT ERROR:", err);
    }

    // Randomized temporal delay (1.0s - 2.0s) for realistic, human-like telemetry flow
    await new Promise(res => setTimeout(res, 1000 + Math.random() * 1000));
  }

  console.log("🏁 Simulation Complete: 6 High-Fidelity Records Synchronized.");
};
