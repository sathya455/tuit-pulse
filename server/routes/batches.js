const express = require('express');
const db = require('../db/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Normalize mobile number to last 10 digits
const normalizeMobile = (mobile) => (mobile ? mobile.replace(/\D/g, '').slice(-10) : null);

// All batch routes require a logged-in Teacher
router.use(verifyToken, requireRole('teacher'));

// POST /api/batches — Create a new tuition batch
router.post('/', async (req, res) => {
  const { batch_name, subject, timing } = req.body;

  if (!batch_name || !batch_name.trim()) {
    return res.status(400).json({ error: 'Batch name is required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO batches (teacher_id, batch_name, subject, timing)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, batch_name.trim(), subject?.trim() || null, timing?.trim() || null]
    );
    res.status(201).json({ message: 'Batch created!', batch: result.rows[0] });
  } catch (err) {
    console.error('Create batch error:', err);
    res.status(500).json({ error: 'Server error creating batch.' });
  }
});

// GET /api/batches — List all batches owned by the logged-in teacher (with student count)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, COUNT(s.id)::int AS student_count
       FROM batches b
       LEFT JOIN students s ON s.batch_id = b.id
       WHERE b.teacher_id = $1
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ batches: result.rows });
  } catch (err) {
    console.error('Fetch batches error:', err);
    res.status(500).json({ error: 'Server error fetching batches.' });
  }
});

// POST /api/batches/:batchId/students — Add a student to a batch & auto-link existing parent/student users
router.post('/:batchId/students', async (req, res) => {
  const { batchId } = req.params;
  const { student_name, student_mobile, parent_mobile } = req.body;

  if (!student_name || !parent_mobile) {
    return res.status(400).json({ error: 'Student name and parent mobile are required.' });
  }

  const cleanParentMobile = normalizeMobile(parent_mobile);
  const cleanStudentMobile = normalizeMobile(student_mobile);

  if (!cleanParentMobile || cleanParentMobile.length !== 10) {
    return res.status(400).json({ error: 'Enter a valid 10-digit parent mobile number.' });
  }

  try {
    // Verify the batch belongs to this teacher
    const batchCheck = await db.query(
      'SELECT id FROM batches WHERE id = $1 AND teacher_id = $2',
      [batchId, req.user.id]
    );
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or unauthorized.' });
    }

    // Check if the student already registered a user account
    let linkedStudentUserId = null;
    if (cleanStudentMobile && cleanStudentMobile.length === 10) {
      const studentUser = await db.query(
        "SELECT id FROM users WHERE mobile = $1 AND role = 'student'",
        [cleanStudentMobile]
      );
      if (studentUser.rows.length > 0) {
        linkedStudentUserId = studentUser.rows[0].id;
      }
    }

    const insertResult = await db.query(
      `INSERT INTO students (batch_id, user_id, student_name, student_mobile, parent_mobile)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [batchId, linkedStudentUserId, student_name.trim(), cleanStudentMobile, cleanParentMobile]
    );
    const newStudent = insertResult.rows[0];

    // If a parent with this mobile already registered, link them immediately
    const parentUser = await db.query(
      "SELECT id FROM users WHERE mobile = $1 AND role = 'parent'",
      [cleanParentMobile]
    );
    let parentLinked = false;
    if (parentUser.rows.length > 0) {
      await db.query(
        `INSERT INTO parent_student_links (parent_user_id, student_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [parentUser.rows[0].id, newStudent.id]
      );
      parentLinked = true;
    }

    res.status(201).json({
      message: 'Student added to batch!',
      student: newStudent,
      parentLinked,
    });
  } catch (err) {
    console.error('Add student error:', err);
    res.status(500).json({ error: 'Server error adding student.' });
  }
});

// GET /api/batches/:batchId/students — Get all students in a specific batch
router.get('/:batchId/students', async (req, res) => {
  const { batchId } = req.params;

  try {
    const batchCheck = await db.query(
      'SELECT * FROM batches WHERE id = $1 AND teacher_id = $2',
      [batchId, req.user.id]
    );
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or unauthorized.' });
    }

    const studentsResult = await db.query(
      `SELECT s.*,
              EXISTS(SELECT 1 FROM parent_student_links psl WHERE psl.student_id = s.id) AS parent_registered
       FROM students s
       WHERE s.batch_id = $1
       ORDER BY s.student_name ASC`,
      [batchId]
    );

    res.json({
      batch: batchCheck.rows[0],
      students: studentsResult.rows,
    });
  } catch (err) {
    console.error('Fetch batch students error:', err);
    res.status(500).json({ error: 'Server error fetching students.' });
  }
});

module.exports = router;