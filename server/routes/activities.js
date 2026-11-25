const express = require('express');
const db = require('../db/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All activity routes require authentication
router.use(verifyToken);

// POST /api/activities/bulk — Teacher logs/updates daily pulse for an entire batch
router.post('/bulk', requireRole('teacher'), async (req, res) => {
  const { batch_id, activity_date, entries } = req.body;

  if (!batch_id || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'Batch ID and student entries are required.' });
  }

  const logDate = activity_date || new Date().toISOString().split('T')[0];

  try {
    // Verify teacher owns this batch
    const batchCheck = await db.query(
      'SELECT id FROM batches WHERE id = $1 AND teacher_id = $2',
      [batch_id, req.user.id]
    );
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or unauthorized.' });
    }

    const savedRecords = [];
    for (const entry of entries) {
      const { student_id, attendance, homework_status, test_score, teacher_remark } = entry;
      if (!student_id) continue;

      const result = await db.query(
        `INSERT INTO daily_activities
          (student_id, batch_id, activity_date, attendance, homework_status, test_score, teacher_remark)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id, batch_id, activity_date)
         DO UPDATE SET
           attendance = EXCLUDED.attendance,
           homework_status = EXCLUDED.homework_status,
           test_score = EXCLUDED.test_score,
           teacher_remark = EXCLUDED.teacher_remark
         RETURNING *`,
        [
          student_id,
          batch_id,
          logDate,
          attendance || 'Present',
          homework_status?.trim() || 'Assigned',
          test_score?.trim() || null,
          teacher_remark?.trim() || null,
        ]
      );
      savedRecords.push(result.rows[0]);
    }

    res.status(201).json({
      message: `Saved daily pulse for ${savedRecords.length} student(s).`,
      date: logDate,
      records: savedRecords,
    });
  } catch (err) {
    console.error('Bulk log activities error:', err);
    res.status(500).json({ error: 'Server error saving daily activities.' });
  }
});

// GET /api/activities/batch/:batchId?date=YYYY-MM-DD — Teacher views a batch's logs for a given date
router.get('/batch/:batchId', requireRole('teacher'), async (req, res) => {
  const { batchId } = req.params;
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const batchCheck = await db.query(
      'SELECT id FROM batches WHERE id = $1 AND teacher_id = $2',
      [batchId, req.user.id]
    );
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found or unauthorized.' });
    }

    const result = await db.query(
      `SELECT s.id AS student_id, s.student_name, s.parent_mobile,
              da.id AS activity_id, da.activity_date,
              COALESCE(da.attendance, 'Present') AS attendance,
              COALESCE(da.homework_status, 'Assigned') AS homework_status,
              da.test_score, da.teacher_remark
       FROM students s
       LEFT JOIN daily_activities da
         ON da.student_id = s.id AND da.batch_id = $1 AND da.activity_date = $2
       WHERE s.batch_id = $1
       ORDER BY s.student_name ASC`,
      [batchId, targetDate]
    );

    res.json({ date: targetDate, entries: result.rows });
  } catch (err) {
    console.error('Fetch batch activities error:', err);
    res.status(500).json({ error: 'Server error fetching batch activities.' });
  }
});

// GET /api/activities/parent/feed — Parent views linked children and their daily pulse logs
router.get('/parent/feed', requireRole('parent'), async (req, res) => {
  try {
    // 1. Fetch all students linked to this parent
    const childrenResult = await db.query(
      `SELECT s.id AS student_id, s.student_name, b.id AS batch_id,
              b.batch_name, b.subject, b.timing, u.full_name AS teacher_name
       FROM parent_student_links psl
       JOIN students s ON s.id = psl.student_id
       JOIN batches b ON b.id = s.batch_id
       JOIN users u ON u.id = b.teacher_id
       WHERE psl.parent_user_id = $1
       ORDER BY s.student_name ASC`,
      [req.user.id]
    );

    if (childrenResult.rows.length === 0) {
      return res.json({ children: [], activities: [] });
    }

    const studentIds = childrenResult.rows.map((c) => c.student_id);

    // 2. Fetch recent daily activity logs for those linked students
    const activitiesResult = await db.query(
      `SELECT da.*, s.student_name, b.batch_name, b.subject, u.full_name AS teacher_name
       FROM daily_activities da
       JOIN students s ON s.id = da.student_id
       JOIN batches b ON b.id = da.batch_id
       JOIN users u ON u.id = b.teacher_id
       WHERE da.student_id = ANY($1::int[])
       ORDER BY da.activity_date DESC, da.created_at DESC
       LIMIT 50`,
      [studentIds]
    );

    res.json({
      children: childrenResult.rows,
      activities: activitiesResult.rows,
    });
  } catch (err) {
    console.error('Fetch parent feed error:', err);
    res.status(500).json({ error: 'Server error fetching parent feed.' });
  }
});

// GET /api/activities/student/feed — Student views their own daily pulse logs
router.get('/student/feed', requireRole('student'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT da.*, s.student_name, b.batch_name, b.subject, u.full_name AS teacher_name
       FROM daily_activities da
       JOIN students s ON s.id = da.student_id
       JOIN batches b ON b.id = da.batch_id
       JOIN users u ON u.id = b.teacher_id
       WHERE s.user_id = $1
       ORDER BY da.activity_date DESC, da.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ activities: result.rows });
  } catch (err) {
    console.error('Fetch student feed error:', err);
    res.status(500).json({ error: 'Server error fetching student feed.' });
  }
});

module.exports = router;