const mysql = require('mysql2/promise'); // Use the promise-based API

// Create a connection pool (recommended for scalability)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: 'password', // Replace with your MySQL password
    database: 'userDB' // Replace with your database name
});

// Use async/await to handle the connection
async function connectDB() {
    try {
        const connection = await pool.getConnection(); // Get a connection from the pool
        console.log('Connected to the database');
        connection.release(); // Release the connection back to the pool
    } catch (err) {
        console.error('Error connecting to the database:', err.stack);
    }
}

connectDB(); // Call the async function to connect

// Export the pool for use in other files
module.exports = pool;
