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

// Update locations from take modal
app.post("/api/locations_onloan/take", async (req, res) => {
    const { location_description, username, create_date, resource_id, active, last_updated_by } = req.body;

    if (!location_description || !username || !create_date || !resource_id || !last_updated_by) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Fetch user_id based on username
        const userResult = await pool.query(
            "SELECT user_id FROM users WHERE username = $1",
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const user_id = userResult.rows[0].user_id;

        // Insert into locations_onloan with the fetched user_id
        const result = await pool.query(
            `INSERT INTO locations_onloan (
                location_description,
                user_id,
                create_date,
                resource_id,
                active,
                last_updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [location_description, user_id, create_date, resource_id, active, last_updated_by]
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
        bin_name,
        last_updated_by, // Accept last_updated_by
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
                bin_name,
                last_updated_by -- Add last_updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                location_description,
                user_id,
                create_date,
                resource_id,
                active,
                location_id,
                bin_name || null,
                last_updated_by, // Store last_updated_by
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

// Add a new resource
app.post("/api/resources/new", async (req, res) => {
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
            `INSERT INTO resources (
                resource_name,
                asset_tag,
                serial_number,
                current_status,
                current_user_name,
                date_out,
                date_in,
                is_retired,
                last_updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                resource_name,
                asset_tag,
                serial_number,
                current_status,
                current_user_name,
                date_out || null,
                date_in || null,
                is_retired,
                last_updated_by,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding resource:", error);
        res.status(500).json({ error: "Failed to add resource." });
    }
});

app.get("/api/track_locations", async (req, res) => {
    const { resource_id } = req.query;

    if (!resource_id) {
        return res.status(400).json({ error: "Missing resource_id parameter" });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM locations_onloan WHERE resource_id = $1",
            [resource_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching track locations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/api/user_request_list', async (req, res) => {
    const { user_id: username, resource_id } = req.query; // Note: user_id is actually username here

    try {
        // Retrieve user_id from username
        const userQuery = `SELECT user_id FROM users WHERE username = $1`;
        const userResult = await pool.query(userQuery, [username]);
        
        if (userResult.rows.length === 0) {
            return res.json([]); // No matching user
        }

        const userId = userResult.rows[0].user_id; // Extract user_id

        // Query for the request list
        const query = `
            SELECT 
                rl.request_list_id, 
                rl.user_request, 
                rl.date_start, 
                rl.date_end, 
                rl.anytime, 
                rl.active AS list_active, 
                rr.resource_id, 
                rr.active AS item_active
            FROM 
                request_list rl
            JOIN 
                resource_requests rr 
            ON 
                rl.request_list_id = rr.request_list_id
            WHERE 
                rl.user_id = $1 AND rr.resource_id = $2 AND rr.active = TRUE;
        `;
        const result = await pool.query(query, [userId, resource_id]);

        res.json(result.rows); // Send the query result
    } catch (error) {
        console.error("Error fetching user request list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//checking take against requests
app.get('/api/active_resource_requests', async (req, res) => {
    const { user_id, resource_id } = req.query;

    let finalUserId = user_id; // Assume it's already a user_id
    if (!user_id.match(/^[0-9a-fA-F-]{36}$/)) {
        try {
            const userQuery = `SELECT user_id FROM users WHERE username = $1 LIMIT 1;`;
            const userResult = await pool.query(userQuery, [user_id]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }
            finalUserId = userResult.rows[0].user_id;
        } catch (error) {
            console.error("Error looking up user_id:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    const query = `
        SELECT 
            rl.request_list_id,
            rl.last_update,
            rl.date_start,
            rl.date_end,
            rl.active AS list_active,
            rr.resource_id,
            rr.active AS item_active,
            r.resource_name
        FROM 
            request_list rl
        JOIN 
            resource_requests rr ON rl.request_list_id = rr.request_list_id
        JOIN 
            resources r ON rr.resource_id = r.resource_id
        WHERE 
            rl.user_id = $1
            AND rr.active = TRUE
            AND rl.request_list_id IN (
                SELECT request_list_id
                FROM resource_requests
                WHERE resource_id = $2
                  AND active = TRUE
            )
        ORDER BY 
            rl.request_list_id DESC, rr.resource_id;
    `;

    try {
        const result = await pool.query(query, [finalUserId, resource_id]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching active resource requests:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

//update items taken
app.put('/api/update_items_active', async (req, res) => {
    const { updates } = req.body;

    console.log("Received updates payload:", updates);

    if (!Array.isArray(updates) || updates.length === 0) {
        console.error("No valid updates provided.");
        return res.status(400).json({ error: 'No updates provided.' });
    }

    try {
        const requestListIds = updates.map((u) => u.request_list_id).filter(Boolean);
        const resourceIds = updates.map((u) => u.resource_id).filter(Boolean);

        // Add detailed logging
        console.log("Payload validation:");
        console.log("Updates:", updates); // Log the full updates array
        console.log("Request List IDs:", requestListIds); // Log extracted request_list_ids
        console.log("Resource IDs:", resourceIds); // Log extracted resource_ids

        if (requestListIds.length === 0 || resourceIds.length === 0) {
            console.error("Invalid UUIDs provided.");
            return res.status(400).json({ error: 'Invalid UUIDs in updates.' });
        }

        const query = `
        UPDATE resource_requests
        SET active = false
        WHERE (request_list_id::uuid, resource_id::uuid) IN (
            SELECT unnest($1::uuid[]),
                   unnest($2::uuid[])
        )
    `;
    const result = await pool.query(query, [requestListIds, resourceIds]);
    
    

        res.status(200).json({ message: `${result.rowCount} resources updated.` });
    } catch (error) {
        console.error('Error executing update query:', error);
        res.status(500).json({ error: 'Failed to update resources.' });
    }
});

app.post('/api/update_location', async (req, res) => {
    const { resource_id, location_description, bin_name, last_updated_by } = req.body;

    if (!resource_id || !location_description || !last_updated_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
            INSERT INTO locations_onloan (
                resource_id, 
                location_description, 
                bin_name, 
                last_updated_by
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *`;
        const values = [resource_id, location_description, bin_name || null, last_updated_by];

        const result = await pool.query(query, values);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//resource repair code
app.get("/api/resource_repairs", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                rr.repair_id, 
                rr.repair_number, 
                rr.resource_id, 
                rr.repair_notes, 
                rr.repair_status, 
                rr.date_start
            FROM resource_repairs rr
            ORDER BY rr.date_start DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching resource repairs:", error);
        res.status(500).json({ error: "Failed to fetch resource repairs." });
    }
});

//when repair status is update in table
app.put("/api/resource_repairs/:repairId", async (req, res) => {
    const { repairId } = req.params;
    const { repair_status, last_updated_by } = req.body;

    if (!repair_status || !last_updated_by) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const result = await pool.query(
            `UPDATE resource_repairs
             SET repair_status = $1, last_updated_by = $2
             WHERE repair_id = $3
             RETURNING *`,
            [repair_status, last_updated_by, repairId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Repair not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating repair status:", error);
        res.status(500).json({ error: "Failed to update repair status" });
    }
});

app.put("/api/resource_repairs/:repairId/notes", async (req, res) => {
    const { repairId } = req.params;
    const { repair_notes, last_updated_by } = req.body;

    if (!repair_notes || !last_updated_by) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const result = await pool.query(
            `UPDATE resource_repairs
             SET repair_notes = $1, last_updated_by = $2
             WHERE repair_id = $3
             RETURNING *`,
            [repair_notes, last_updated_by, repairId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Repair not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating repair note:", error);
        res.status(500).json({ error: "Failed to update repair note" });
    }
});

app.get('/api/resource_requests', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                rr.request_list_id, 
                rr.resource_id, 
                rr.active, 
                rl.user_request, 
                rl.date_start, 
                rl.anytime, 
                rl.request_note
            FROM resource_requests rr
            JOIN request_list rl ON rr.request_list_id = rl.request_list_id
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching resource requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.put('/api/resource_requests/:requestListId/notes', async (req, res) => {
    const { requestListId } = req.params;
    const { request_note } = req.body;

    if (!request_note) {
        return res.status(400).json({ error: 'Missing request note' });
    }

    try {
        const result = await pool.query(
            `UPDATE request_list
             SET request_note = $1
             WHERE request_list_id = $2
             RETURNING *`,
            [request_note, requestListId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating request note:', error);
        res.status(500).json({ error: 'Failed to update request note' });
    }
});

app.put('/api/resource_requests/:requestListId/active', async (req, res) => {
    const { requestListId } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
        return res.status(400).json({ error: 'Invalid active status' });
    }

    try {
        const result = await pool.query(
            `UPDATE resource_requests
             SET active = $1
             WHERE request_list_id = $2
             RETURNING *`,
            [active, requestListId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error toggling active status:', error);
        res.status(500).json({ error: 'Failed to toggle active status' });
    }
});

