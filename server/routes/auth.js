const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/db');

const router = express.Router();

// Normalize mobile number (keeps last 10 digits for consistent matching)
const normalizeMobile = (mobile) => mobile.replace(/\D/g, '').slice(-10);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { full_name, mobile, password, role } = req.body;

  if (!full_name || !mobile || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!['teacher', 'parent'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role selected.' });
  }

  const cleanMobile = normalizeMobile(mobile);
  if (cleanMobile.length !== 10) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE mobile = $1', [cleanMobile]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This mobile number is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await db.query(
      `INSERT INTO users (full_name, mobile, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, mobile, role, created_at`,
      [full_name.trim(), cleanMobile, passwordHash, role]
    );
    const newUser = userResult.rows[0];

    // Auto-link Parent to any matching student entries
    let linkedCount = 0;
    if (role === 'parent') {
      const matchingStudents = await db.query(
        'SELECT id FROM students WHERE parent_mobile = $1',
        [cleanMobile]
      );
      for (const student of matchingStudents.rows) {
        await db.query(
          `INSERT INTO parent_student_links (parent_user_id, student_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newUser.id, student.id]
        );
        linkedCount++;
      }
    }

    // Auto-link Student account if teacher already added their mobile
    if (role === 'student') {
      await db.query(
        'UPDATE students SET user_id = $1 WHERE student_mobile = $2 AND user_id IS NULL',
        [newUser.id, cleanMobile]
      );
    }

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, mobile: newUser.mobile },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: newUser,
      linkedStudents: linkedCount,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ error: 'Mobile number and password are required.' });
  }

  const cleanMobile = normalizeMobile(mobile);

  try {
    const result = await db.query('SELECT * FROM users WHERE mobile = $1', [cleanMobile]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid mobile number or password.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid mobile number or password.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, mobile: user.mobile },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
