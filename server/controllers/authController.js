const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const memoryStore = require('../config/memoryStore');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_s3_postgres_2026';

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const selectedRoleId = parseInt(role_id || '3', 10); // Default to 'User' (id: 3)

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (db.isPgConnected()) {
      // Check existing email
      const existing = await db.query('SELECT * FROM "user" WHERE LOWER(email) = LOWER($1)', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists.' });
      }

      // Fetch role name
      const roleResult = await db.query('SELECT name FROM roles WHERE id = $1', [selectedRoleId]);
      const roleName = roleResult.rows.length > 0 ? roleResult.rows[0].name : 'User';

      // Insert User
      const insertResult = await db.query(
        `INSERT INTO "user" (name, email, password_hash, role_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, email, role_id, created_at`,
        [name, email.toLowerCase(), passwordHash, selectedRoleId]
      );

      const user = insertResult.rows[0];
      user.role_name = roleName;

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role_id: user.role_id, role_name: roleName },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'User registered successfully!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role_id: user.role_id,
          role_name: roleName
        }
      });
    } else {
      // Fallback Memory Store
      if (memoryStore.findUserByEmail(email)) {
        return res.status(400).json({ error: 'User with this email already exists.' });
      }

      const newUser = memoryStore.addUser({
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role_id: selectedRoleId
      });

      const token = jwt.sign(
        { id: newUser.id, name: newUser.name, email: newUser.email, role_id: newUser.role_id, role_name: newUser.role_name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'User registered successfully!',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role_id: newUser.role_id,
          role_name: newUser.role_name
        }
      });
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during user registration.' });
  }
};

/**
 * User Login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (db.isPgConnected()) {
      const userRes = await db.query(
        `SELECT u.*, r.name as role_name 
         FROM "user" u 
         JOIN roles r ON u.role_id = r.id 
         WHERE LOWER(u.email) = LOWER($1)`,
        [email]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const user = userRes.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role_id: user.role_id, role_name: user.role_name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login successful!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role_id: user.role_id,
          role_name: user.role_name
        }
      });
    } else {
      // Memory store login
      const user = memoryStore.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role_id: user.role_id, role_name: user.role_name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login successful!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role_id: user.role_id,
          role_name: user.role_name
        }
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

/**
 * Get logged in user profile
 */
const getMe = async (req, res) => {
  try {
    return res.json({
      user: req.user
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching profile.' });
  }
};

module.exports = {
  register,
  login,
  getMe
};
