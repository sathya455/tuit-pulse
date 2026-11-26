const express = require('express');
const db = require('../db/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const normalizeMobile = (mobile) => (mobile ? mobile.replace(/\D/g, '').slice(-10) : null);
const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

router.use(verifyToken, requireRole('teacher'));

// GET /api/students — List all students for this teacher with their weekly schedule
router.get('/', async (req, res) => {
  try {
    const studentsRes = await db.query(
      `SELECT s.*,
              EXISTS(SELECT 1 FROM parent_student_links psl WHERE psl.student_id = s.id) AS parent_registered
       FROM students s
       WHERE s.teacher_id = $1
       ORDER BY s.student_name ASC`,
      [req.user.id]
    );

    const studentIds = studentsRes.rows.map((s) => s.id);
    let scheduleRows = [];
    if (studentIds.length > 0) {
      const schedRes = await db.query(
        `SELECT * FROM student_weekly_schedule WHERE student_id = ANY($1::int[]) ORDER BY id ASC`,
        [studentIds]
      );
      scheduleRows = schedRes.rows;
    }

    const students = studentsRes.rows.map((s) => ({
      ...s,
      schedule: scheduleRows.filter((row) => row.student_id === s.id),
    }));

    res.json({ students });
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ error: 'Server error fetching students.' });
  }
});

// POST /api/students — Add a student directly with grade, subjects & parent mobile
router.post('/', async (req, res) => {
  const { student_name, grade, parent_mobile, subjects, weekly_schedule } = req.body;

  if (!student_name || !parent_mobile) {
    return res.status(400).json({ error: 'Student name and parent mobile are required.' });
  }

  const cleanParentMobile = normalizeMobile(parent_mobile);
  if (!cleanParentMobile || cleanParentMobile.length !== 10) {
    return res.status(400).json({ error: 'Enter a valid 10-digit parent mobile number.' });
  }

  const cleanSubjects = Array.isArray(subjects)
    ? [...new Set(subjects.map((s) => s.trim()).filter(Boolean))]
    : typeof subjects === 'string'
      ? [...new Set(subjects.split(',').map((s) => s.trim()).filter(Boolean))]
      : [];

  try {
    const insertRes = await db.query(
      `INSERT INTO students (teacher_id, student_name, grade, parent_mobile, subjects)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, student_name.trim(), grade?.trim() || null, cleanParentMobile, cleanSubjects]
    );
    const newStudent = insertRes.rows[0];

    // Insert optional initial weekly schedule if provided: [{ day_of_week: 'Mon', subject: 'Maths' }]
    if (Array.isArray(weekly_schedule)) {
      for (const slot of weekly_schedule) {
        if (VALID_DAYS.includes(slot.day_of_week) && slot.subject?.trim()) {
          await db.query(
            `INSERT INTO student_weekly_schedule (student_id, day_of_week, subject)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [newStudent.id, slot.day_of_week, slot.subject.trim()]
          );
        }
      }
    }

    // Auto-link Parent if already registered
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
      message: 'Student added!',
      student: { ...newStudent, schedule: weekly_schedule || [], parent_registered: parentLinked },
      parentLinked,
    });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Server error adding student.' });
  }
});

// PUT /api/students/:studentId/schedule — Replace recurring Mon-Sun weekly subject timetable & subjects list
router.put('/:studentId/schedule', async (req, res) => {
  const { studentId } = req.params;
  const { subjects, schedule } = req.body; // schedule: [{ day_of_week: 'Mon', subject: 'Maths' }, ...]

  try {
    const ownerCheck = await db.query(
      'SELECT id FROM students WHERE id = $1 AND teacher_id = $2',
      [studentId, req.user.id]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found or unauthorized.' });
    }

    if (Array.isArray(subjects)) {
      const cleanSubjects = [...new Set(subjects.map((s) => s.trim()).filter(Boolean))];
      await db.query('UPDATE students SET subjects = $1 WHERE id = $2', [cleanSubjects, studentId]);
    }

    await db.query('DELETE FROM student_weekly_schedule WHERE student_id = $1', [studentId]);

    const inserted = [];
    if (Array.isArray(schedule)) {
      for (const item of schedule) {
        if (VALID_DAYS.includes(item.day_of_week) && item.subject?.trim()) {
          const r = await db.query(
            `INSERT INTO student_weekly_schedule (student_id, day_of_week, subject)
             VALUES ($1, $2, $3)
             ON CONFLICT (student_id, day_of_week, subject) DO NOTHING
             RETURNING *`,
            [studentId, item.day_of_week, item.subject.trim()]
          );
          if (r.rows[0]) inserted.push(r.rows[0]);
        }
      }
    }

    res.json({ message: 'Weekly schedule updated!', schedule: inserted });
  } catch (err) {
    console.error('Update schedule error:', err);
    res.status(500).json({ error: 'Server error updating weekly schedule.' });
  }
});

// DELETE /api/students/:studentId — Remove a student
router.delete('/:studentId', async (req, res) => {
  const { studentId } = req.params;
  try {
    const del = await db.query(
      'DELETE FROM students WHERE id = $1 AND teacher_id = $2 RETURNING id',
      [studentId, req.user.id]
    );
    if (del.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found or unauthorized.' });
    }
    res.json({ message: 'Student removed.' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Server error removing student.' });
  }
});

module.exports = router;
