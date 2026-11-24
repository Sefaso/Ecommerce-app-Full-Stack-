// For Database/schema startup (table creation)

/*You are importing Client and Pool from the pg library. 
This lets you connect to and interact with a PostgreSQL database 
in your back-end Node.js application.*/
const { Pool } = require('pg');
const fs = require('fs'); // FS module, for interacting with file system
const path = require('path'); // Path module, for routing assembling

// Pool is created, taking info from .env file, for SQL functionality
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT)
});

// Function for SQL behavior (SQL commmand reader)
async function initialize() {
    try { // Expected behaviors
        await pool.query('SELECT 1'); // Pool.query is used to connect to database by requesting to SELECT(return) 1
        console.log('✓ Database connected successfully'); // Notice of successful connection
        const schemaPath = path.join(__dirname, 'Schema.sql'); // Dynamically assembles file path through current folder and different file within same folder
        const schema = fs.readFileSync(schemaPath, 'utf8'); // Reads schema through synchronous API using assembled path
        const statements = schema.split(';').filter(stmt => stmt.trim().length > 0); //Split schema by ';' (Full SQL command for table creation) and filter out empty statements
        
        let successCount = 0;

        // Loop for each element in statements' array
        for (let i = 0; i < statements.length; i++) {
            let statement = statements[i].trim();
            if (statement && !statement.startsWith('--')) { // Executes only if statement is not a comment
                try {
                    await pool.query(statement); // Passes command from statements
                    successCount++;
                } catch (stmtErr) {
                    console.error(`✗ Error in statement ${i + 1}:`, stmtErr.message); // Only log errors (important for debugging)
                }
            }
        }
        console.log(`✓ Database schema initialized (${successCount}/${statements.length} tables)`); // Only log final result
    } catch (err) {
        console.error('✗ Database connection error:', err.message); // Keep this - important for debugging connection issues
    }
};

initialize(); // Kicks off on app start

module.exports = pool; // Exports db for routers