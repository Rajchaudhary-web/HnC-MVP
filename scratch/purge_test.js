import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://syojfdhluhsxmtnknbjl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5b2pmZGhsdWhzeG10bmtuYmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTQ5MTMsImV4cCI6MjA5MjA3MDkxM30.N5igGYXByWiRf75JE9OrA9OJUaeQHeBqBxaC38nBM1A'
const supabase = createClient(supabaseUrl, supabaseKey)

async function purgeTestData() {
    console.log('Initiating tactical data purge of legacy/fake anomalies...');
    
    // 1. Audit potential deletions
    const { data: audit, error: auditError } = await supabase
        .from('reports')
        .select('id, area, description')
        .or('area.is.null,description.ilike.%test%,title.ilike.%test%')

    if (auditError) {
        console.error('Audit failure:', auditError);
        return;
    }

    console.log(`Detected ${audit.length} non-operational records for decommissioning.`);
    
    if (audit.length === 0) {
        console.log('Neural grid is already sanitized.');
        return;
    }

    // 2. Execute Purge
    const { error: purgeError } = await supabase
        .from('reports')
        .delete()
        .or('area.is.null,description.ilike.%test%,title.ilike.%test%')

    if (purgeError) {
        console.error('Purge execution error:', purgeError);
    } else {
        console.log('Decommissioning complete: All fake assets neutralized.');
    }
}

purgeTestData();
