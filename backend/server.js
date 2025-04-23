// backend/server.js
const express = require('express');
const fs = require('fs').promises; // Use promises for async file reading
const path = require('path');
const cors = require('cors'); // Import cors

const app = express();
const port = 3001; // Or any port you prefer that's not in use

// --- Configuration ---
// Directory where your GeoJSON files are stored
const dataDir = path.join(__dirname, 'data', 'processed');

// --- Middleware ---
// Enable CORS for all origins (adjust in production for security)
app.use(cors());

// --- API Endpoints ---

// Endpoint to get a list of available datasets (optional but helpful)
app.get('/api/datasets', async (req, res) => {
    try {
        const files = await fs.readdir(dataDir);
        // Filter for .json files and remove the extension
        const datasets = files
            .filter(file => path.extname(file).toLowerCase() === '.json')
            .map(file => path.basename(file, '.json'));
        res.json(datasets);
    } catch (error) {
        console.error('Error reading dataset directory:', error);
        res.status(500).send('Error listing datasets.');
    }
});

// Endpoint to get GeoJSON data for a specific dataset
// Example: /api/data/Flomdata%20%E2%80%94%20Elvbekk
app.get('/api/data/:datasetName', async (req, res) => {
    // Decode the dataset name from the URL
    const datasetName = decodeURIComponent(req.params.datasetName);

    // Basic security check (allow letters, numbers, spaces, underscore, dash)
    if (!/^[a-zA-Z0-9_\-\s—]+$/.test(datasetName)) {
        return res.status(400).send('Invalid dataset name format.');
    }

    const filePath = path.join(dataDir, `${datasetName}.json`);
    console.log(`Attempting to serve: ${filePath}`); // Log the path

    try {
        // Check if file exists
        await fs.access(filePath); // Throws error if file doesn't exist

        // Read the file content
        const fileData = await fs.readFile(filePath, 'utf8');

        // Parse and send the JSON data
        // Set content type explicitly to ensure browser interprets it correctly
        res.setHeader('Content-Type', 'application/geo+json');
        res.send(fileData); // Send raw string data, let browser parse JSON

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`File not found: ${filePath}`);
            res.status(404).send(`Dataset '${datasetName}' not found.`);
        } else {
            console.error(`Error reading file ${filePath}:`, error);
            res.status(500).send('Error retrieving dataset.');
        }
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});

// --- Optional: Add basic root route ---
app.get('/', (req, res) => {
  res.send('Backend API is running. Try /api/datasets or /api/data/:datasetName');
});
