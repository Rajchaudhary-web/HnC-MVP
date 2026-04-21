import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://syojfdhluhsxmtnknbjl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5b2pmZGhsdWhzeG10bmtuYmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTQ5MTMsImV4cCI6MjA5MjA3MDkxM30.N5igGYXByWiRf75JE9OrA9OJUaeQHeBqBxaC38nBM1A'
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
    console.log('Initiating high-fidelity area backfill...');
    const { data, error } = await supabase
        .from('reports')
        .select('id, location_name')
        .is('area', null)

    if (error) {
        console.error('Fetch protocol failure:', error)
        return
    }

    console.log(`Detected ${data.length} records requiring zone categorization.`);

    for (const report of data) {
        if (!report.location_name) continue
        
        const area = report.location_name.split(',')[0].trim()
        console.log(`Synchronizing ID ${report.id}: Mapping to "${area}"`);
        
        const { error: updateError } = await supabase
            .from('reports')
            .update({ area })
            .eq('id', report.id)

        if (updateError) {
            console.error(`Linkage error for ID ${report.id}:`, updateError)
        }
    }

    console.log('Mission Complete: All urban anomalies synchronized.');
}

migrate()
