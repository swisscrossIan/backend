const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express(); // Initialize the Express app

// Allow requests from your frontend domain
app.use(cors({
    origin: 'https://leannesapp.surgicaldives.org',
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type',
}));

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

// Define route to get resources
app.get("/api/resources", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                resource_id, 
                resource_name, 
                asset_tag, 
                serial_number, 
                current_status, 
                current_user_name, 
                date_out, 
                date_in, 
                is_retired, 
                last_updated, 
                last_updated_by
            FROM resources`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching resources:", error);
        res.status(500).send("Server error");
    }
});


// Define route to update resources
app.put('/api/resources/:resourceId', async (req, res) => {
    const { resourceId } = req.params;
    const { current_status, current_user_name, date_out, date_in, last_updated_by} = req.body;
   
    console.log("Received payload:", req.body); 
    console.log("last_updated_by received:", last_updated_by); // Add this log

    try {
        // Update the resource in the database
        const query = `
            UPDATE resources
            SET current_status = $1, 
                current_user_name = $2, 
                date_out = $3, 
                date_in = $4, 
                last_updated_by = $5
            WHERE resource_id = $6
        `;
        const values = [current_status, current_user_name, date_out, date_in, last_updated_by, resourceId];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            // No rows were updated, meaning the resourceId does not exist
            return res.status(404).json({ error: 'Resource not found' });
        }

        console.log(`Resource ${resourceId} updated successfully by ${last_updated_by}`);
        res.status(200).json({ message: 'Resource updated successfully.' });
    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ error: 'Failed to update resource.' });
    }
});

//update locations from take Modal
app.post("/api/locations_onloan/take", async (req, res) => {
    const { location_description, user_id, create_date, resource_id, active } = req.body;

    if (!location_description || !user_id || !create_date || !resource_id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO locations_onloan (
                location_description,
                user_id,
                create_date,
                resource_id,
                active
            ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [location_description, user_id, create_date, resource_id, active]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error processing loan:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//on-loan locations
app.post("/api/locations_onloan/return", async (req, res) => {
    const {
        location_description,
        user_id,
        create_date,
        resource_id,
        active,
        location_id,
        bin_id,
    } = req.body;

    if (!location_description || !user_id || !create_date || !resource_id || !location_id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
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
                location_description,
                user_id,
                create_date,
                resource_id,
                active,
                location_id,
                bin_id || null,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error processing return:", error);
        res.status(500).json({ error: "Internal server error" });
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

//check if user is in the postgres user table
app.post("/api/authorize", async (req, res) => {
    const { email } = req.body; // Email is sent from the frontend after successful OAuth login

    try {
        const result = await pool.query(
            "SELECT username, user_role, active FROM users WHERE useremail = $1",
            [email]
        );

        if (result.rows.length === 0) {
            // User not found in the database
            return res.status(403).json({ error: "Access denied. User not found." });
        }

        const user = result.rows[0];
        if (!user.active) {
            // User exists but is inactive
            return res.status(403).json({ error: "Access denied. User is inactive." });
        }

        // User is authorized
        res.status(200).json({
            username: user.username,
            role: user.user_role,
        });
    } catch (error) {
        console.error("Error during authorization:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

//get active users
app.get("/api/active_users", async (req, res) => {
    try {
        const result = await pool.query("SELECT username FROM active_users");
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching active users:", error);
        res.status(500).json({ error: "Failed to fetch active users." });
    }
});

// Get active resource statuses
app.get("/api/active_resource_statuses", async (req, res) => {
    try {
        const result = await pool.query("SELECT resource_status FROM active_resource_statuses");
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching active resource statuses:", error);
        res.status(500).json({ error: "Failed to fetch active resource statuses." });
    }
});


//post reserve requests
app.post("/api/resource_requests", async (req, res) => {
    const { resources, user_request, date_start, date_end, anytime, last_updated_by, request_note } = req.body;

    try {
        const client = await pool.connect();

        // Step 1: Create a new request_list
        const listResult = await client.query(
            `INSERT INTO request_list (user_request, date_start, date_end, anytime, last_updated_by, request_note)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING request_list_id`,
            [user_request, date_start, date_end, anytime, last_updated_by, request_note]
        );
        const requestListId = listResult.rows[0].request_list_id;
        console.log("Request list created with ID:", requestListId);

        // Step 2: Insert resource_requests for each resource
        for (const resourceId of resources) {
            console.log("Inserting resource into resource_requests:", resourceId);
            await client.query(
                `INSERT INTO resource_requests (resource_id, request_list_id, last_updated_by)
                 VALUES ($1, $2, $3)`,
                [resourceId, requestListId, last_updated_by]
            );
        }

        client.release();
        res.status(201).json({ message: "Request submitted successfully", request_list_id: requestListId });
    } catch (error) {
        console.error("Error creating request list:", error.stack);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// edit resources
app.put("/api/resources/updateDetails/:id", async (req, res) => {
    const resourceId = req.params.id;
    const {
        resource_name,
        asset_tag,
        serial_number,
        current_status,
        current_user_name,
        date_out,
        date_in,
        is_retired,
        last_updated_by,
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE resources
             SET resource_name = COALESCE(NULLIF($1, ''), resource_name),
                 asset_tag = COALESCE(NULLIF($2, ''), asset_tag),
                 serial_number = COALESCE(NULLIF($3, ''), serial_number),
                 current_status = $4,
                 current_user_name = COALESCE(NULLIF($5, ''), current_user_name),
                 date_out = $6,
                 date_in = $7,
                 is_retired = $8,
                 last_updated_by = $9
             WHERE resource_id = $10`,
            [
                resource_name,
                asset_tag,
                serial_number,
                current_status,
                current_user_name,
                date_out,
                date_in,
                is_retired,
                last_updated_by,
                resourceId,
            ]
        );

        if (result.rowCount === 0) {
            // No rows updated
            return res.status(404).json({ error: "Resource not found or no changes made." });
        }

        res.status(200).json({ message: "Resource updated successfully." });
    } catch (error) {
        console.error("Error updating resource:", error);
        res.status(500).json({ error: "Failed to update resource." });
    }
});



/* Placeholder for dropdown endpoints
app.get("/api/active_users", async (req, res) => {
    // Fetch active users when ready
});

app.get("/api/active_statuses", async (req, res) => {
    // Fetch active statuses when ready
});
*/



