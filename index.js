const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://34.130.27.82' })); // Allow requests from your frontend
app.use(express.json()); // Middleware to parse JSON bodies

// Set up PostgreSQL connection
const pool = new Pool({
    user: 'bridges-admin',
    host: '0.0.0.0', // or your server's IP
    database: 'bridges-postgres',
    password: 'shamed-DISKS-simulate', // Replace XXXX with your actual password
    port: 5432,
});

// Define route to fetch active resources
app.get('/api/active_resources', async (req, res) => {
    console.log('Received GET request for /api/active_resources'); // Log when the route is hit
    try {
        const result = await pool.query('SELECT * FROM active_resources');
        console.log('Query result:', result.rows); // Log the query result
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching active resources:', error); // Log any errors
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Define route to handle repair submissions
app.post('/api/resource_repairs', async (req, res) => {
    console.log('Request received at /api/resource_repairs'); // Debug log
    console.log('Request Body:', req.body); // Log the request body

    const {
        resource_id,
        repair_status,
        date_start,
        date_end,
        indeterminent,
        user_send,
        repair_notes,
    } = req.body;

    // Validate required fields
    if (!resource_id || !repair_status || !date_start || !user_send || !repair_notes) {
        console.error('Validation Error: Missing required fields');
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO resource_repairs (
                resource_id, 
                repair_status, 
                date_start, 
                date_end, 
                indeterminent, 
                user_send, 
                repair_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                resource_id,
                repair_status,
                date_start,
                date_end,
                indeterminent,
                user_send,
                repair_notes,
            ]
        );

        console.log('Insert successful:', result.rows[0]); // Log the inserted row
        res.status(201).json(result.rows[0]); // Return the inserted row
    } catch (error) {
        console.error('Database Error:', error); // Log the database error
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Define route to update resources
app.put('/api/resources/:resourceId', async (req, res) => {
    const { resourceId } = req.params;
    const { current_status, current_user_name, date_out, date_in } = req.body;

    try {
        // Update the resource in the database
        const query = `
            UPDATE resources
            SET current_status = $1, current_user_name = $2, date_out = $3, date_in = $4
            WHERE resource_id = $5
        `;
        const values = [current_status, current_user_name, date_out, date_in, resourceId];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            // No rows were updated, meaning the resourceId does not exist
            return res.status(404).json({ error: 'Resource not found' });
        }

        console.log(`Resource ${resourceId} updated successfully`);
        res.status(200).json({ message: 'Resource updated successfully.' });
    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ error: 'Failed to update resource.' });
    }
});

// endpoint for on-loan function
app.post('/api/locations_onloan', async (req, res) => {
    const { resource_id, location_description, user_id, create_date, active } = req.body;

    // Validate required fields
    if (!resource_id || !location_description || !user_id || !create_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Insert data into the locations_onloan table
        const result = await pool.query(
            `INSERT INTO locations_onloan (
                 location_description, 
                 user_id, 
                 create_date, 
                 resource_id, 
                 active, 
                 location_id, 
                 bin_id
             ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                location_description, // $1
                user_id,              // $2
                create_date,          // $3
                resource_id,          // $4
                active,               // $5
                location_id,          // $6
                bin_id || null,       // $7
            ]
        );

        // Return the newly created row
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding location on loan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint to add a resource note
app.post('/api/resource_notes', async (req, res) => {
    const { resource_id, note, create_date, user_id } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO resource_notes (resource_id, note, create_date, user_id) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [resource_id, note, create_date, user_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding resource note:", error);
        res.status(500).json({ error: "Failed to add resource note" });
    }
});

// Endpoint to fetch active locations
app.get("/api/active_locations", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM active_locations");
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching active locations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// endpoint to fetch bins filtered by location_id
app.get("/api/active_bins", async (req, res) => {
    const { location_id } = req.query;

    if (!location_id) {
        return res.status(400).json({ error: "Missing location_id parameter" });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM active_bins WHERE location_id = $1",
            [location_id]
        );
        console.log("Bins fetched for location_id:", location_id, result.rows); // Debug log
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching bins:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// //add row to old audit log
// app.post('/api/audit_log_resources', async (req, res) => {
//     const {
//         resource_id,
//         current_user_id,
//         status_change,
//         date_out,
//         create_date,
//         audit_user,
//         audit_note
//     } = req.body;

//     // Validate required fields
//     if (!resource_id || !create_date) {
//         return res.status(400).json({ error: "Missing required fields" });
//     }

//     try {
//         const query = `
//             INSERT INTO audit_log_resources (
//                 resource_id,
//                 current_user_id,
//                 status_change,
//                 date_out,
//                 create_date,
//                 audit_user,
//                 audit_note
//             ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
//         const values = [
//             resource_id,
//             current_user_id || null, // Allow null for empty strings
//             status_change || null,   // Allow null for empty strings
//             date_out || null,        // Allow null for date_out
//             create_date || null,      // Allow null for empty strings,
//             audit_user || null,      // Allow null for empty strings
//             audit_note || null,      // Allow null for empty strings,
//         ];

//         console.log("Executing Query:", query);
//         console.log("With Values:", values);

//         const result = await pool.query(query, values);
//         res.status(201).json(result.rows[0]);
//     } catch (error) {
//         console.error("Database Error:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
