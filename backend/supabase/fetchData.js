// backend/supabase/fetchData.js
require('dotenv').config({ path: '../.env' }); // Load .env file from backend root
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises; // Use promises version of fs
const path = require('path');

// --- Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// IMPORTANT: Replace these with your actual table names containing 'flomdata'
const tableNames = [
    'Flomdata — Elvbekk',
    'Flomdata — Flomareal',
    'Flomdata — Flomarealgrense',
    'Flomdata — Flomhøydekontur',
    'Flomdata — Havflate',
    'Flomdata — Innsjø',
    'Flomdata — Kanalgrøft',
    'Flomdata — Tverrprofillinje',
];

// Output directory within the backend folder
const outputDir = path.join(__dirname, '..', 'data/processed'); // e.g., backend/data/

// --- Initialization ---
if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        'Error: Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env file'
    );
    process.exit(1); // Exit if credentials are not set
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Main Fetch Function ---
async function fetchAndSaveData() {
    console.log(`Starting data fetch for tables: ${tableNames.join(', ')}`);

    try {
        // Ensure the output directory exists
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`Ensured output directory exists: ${outputDir}`);
    } catch (error) {
        console.error(`Error creating directory ${outputDir}:`, error);
        return; // Stop if directory creation fails
    }

    for (const tableName of tableNames) {
        console.log(`\nFetching data from table: ${tableName}...`);
        try {
            // Fetch all data from the table
            const { data, error } = await supabase.from(tableName).select('*');

            if (error) {
                console.error(`Error fetching data from ${tableName}:`, error.message);
                continue; // Skip to the next table on error
            }

            if (data) {
                console.log(`Successfully fetched ${data.length} records from ${tableName}.`);
                const filePath = path.join(outputDir, `${tableName}.json`);
                const jsonData = JSON.stringify(data, null, 2); // Pretty print JSON

                // Write data to a JSON file
                await fs.writeFile(filePath, jsonData, 'utf8');
                console.log(`Data from ${tableName} saved to ${filePath}`);
            } else {
                console.log(`No data found in ${tableName}.`);
            }
        } catch (err) {
            // Catch errors during file writing or other unexpected issues
            console.error(`An error occurred processing ${tableName}:`, err);
        }
    }

    console.log('\nData fetching process completed.');
}

// --- Run the script ---
fetchAndSaveData();

