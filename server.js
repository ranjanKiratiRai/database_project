const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Optional: Set path to v

app.set('view engine', 'ejs');


const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session handling
app.use(
  session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
  })
);

// Serve static files (e.g., CSS, JS)
app.use(express.static(__dirname));

// Serve the main page (login page)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/frontend.html');
});

// Serve the admin login page
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html'); // A separate login form for admin
});

// Handle registration
app.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.send('Passwords do not match!');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const connection = await db.getConnection();
    const query = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
    await connection.execute(query, [name, email, hashedPassword, 'user']); // Default role is 'user'
    connection.release();

    res.redirect('/'); // Redirect to login page after registration
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('An error occurred during registration.');
  }
});

// Handle login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const connection = await db.getConnection();
    const query = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await connection.execute(query, [email]);
    connection.release();

    if (rows.length === 0) {
      return res.send('User not found!');
    }

    const user = rows[0];

    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.send('Invalid email or password!');
    }

    // Start session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role, // Add role to session
    };

    // Redirect based on user role
    if (user.role === 'admin') {
      res.redirect('/admin-dashboard'); // Admin dashboard
    } else {
      res.redirect('/dashboard'); // User dashboard
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('An error occurred during login.');
  }
});

// Admin Login Route
app.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).send('Email and password are required.');
    }

    const connection = await db.getConnection();
    const query = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await connection.execute(query, [email]);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).send('User not found!');
    }

    const user = rows[0];


    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    if (user.role === 'admin') {
      return res.redirect('/admin-dashboard');
    } else {
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).send('An internal server error occurred.');
  }
});

// Admin Dashboard


// Route to render the admin dashboard
app.get('/admin-dashboard', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/'); // Redirect to login if not logged in as admin
  }

  try {
    const connection = await db.getConnection();
    const query = 'SELECT * FROM users'; // Fetch all user data
    const [users] = await connection.execute(query);
    connection.release();

    // Render the dashboard and pass dynamic data to the EJS template
    res.render('admin-dashboard', {
      username: req.session.user.name,
      useremail: req.session.user.email,
      users: users
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).send('An error occurred while fetching users.');
  }
});
  

// User Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/'); // Redirect to login if not logged in
  }

  const user = req.session.user;
  res.send(`
    <h1>Welcome, ${user.name}!</h1>
    <p>Email: ${user.email}</p>
    <a href="/logout">Logout</a>
  `);
});

// Handle logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/'); // Redirect to login page after logout
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
