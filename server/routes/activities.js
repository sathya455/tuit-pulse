const express = require('express');
const db = require('../db/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

router.use(verifyToken);

// GET /api/activities/daily?date=YYYY-MM-DD — Load scheduled subjects & existing logs for all teacher's students on a date
router.get('/daily', requireRole('teacher'), async (req, res) => {
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];
  const parsed = new Date(`${targetDate}T00:00:00`);
  const dayName = DAY_NAMES[parsed.getDay()];

  try {
    const studentsRes = await db.query(
      `SELECT id, student_name, grade, subjects, parent_mobile
       FROM students
       WHERE teacher_id = $1
       ORDER BY student_name ASC`,
      [req.user.id]
    );

    const studentIds = studentsRes.rows.map((s) => s.id);
    if (studentIds.length === 0) {
      return res.json({ date: targetDate, day_of_week: dayName, students: [] });
    }

    const [schedRes, logsRes] = await Promise.all([
      db.query(
        `SELECT student_id, subject FROM student_weekly_schedule
         WHERE student_id = ANY($1::int[]) AND day_of_week = $2
         ORDER BY id ASC`,
        [studentIds, dayName]
      ),
      db.query(
        `SELECT * FROM daily_activities
         WHERE student_id = ANY($1::int[]) AND activity_date = $2
         ORDER BY id ASC`,
        [studentIds, targetDate]
      ),
    ]);

    const payload = studentsRes.rows.map((st) => {
      const scheduledSubjects = schedRes.rows
        .filter((r) => r.student_id === st.id)
        .map((r) => r.subject);
      const existingLogs = logsRes.rows.filter((l) => l.student_id === st.id);

      // Combine scheduled subjects + any extra logged subjects for this date
      const subjectSet = new Set(scheduledSubjects);
      existingLogs.forEach((l) => subjectSet.add(l.subject));

      const subjectEntries = Array.from(subjectSet).map((subj) => {
        const match = existingLogs.find((l) => l.subject === subj);
        return {
          subject: subj,
          is_scheduled: scheduledSubjects.includes(subj),
          homework_status: match?.homework_status || 'Assigned',
          test_score: match?.test_score || '',
          teacher_remark: match?.teacher_remark || '',
        };
      });

      const attendance = existingLogs[0]?.attendance || 'Present';

      return {
        student_id: st.id,
        student_name: st.student_name,
        grade: st.grade,
        all_subjects: st.subjects || [],
        attendance,
        entries: subjectEntries,
      };
    });

    res.json({ date: targetDate, day_of_week: dayName, students: payload });
  } catch (err) {
    console.error('Fetch daily schedule activities error:', err);
    res.status(500).json({ error: 'Server error fetching daily activities.' });
  }
});

// POST /api/activities/bulk — Save attendance & subject-wise daily pulse logs for a date
router.post('/bulk', requireRole('teacher'), async (req, res) => {
  const { activity_date, entries } = req.body;
  // entries: [{ student_id, subject, attendance, homework_status, test_score, teacher_remark }]

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'At least one subject activity entry is required.' });
  }

  const logDate = activity_date || new Date().toISOString().split('T')[0];

  try {
    const savedRecords = [];
    for (const entry of entries) {
      const { student_id, subject, attendance, homework_status, test_score, teacher_remark } = entry;
      if (!student_id || !subject?.trim()) continue;

      // Verify teacher owns student
      const check = await db.query(
        'SELECT id FROM students WHERE id = $1 AND teacher_id = $2',
        [student_id, req.user.id]
      );
      if (check.rows.length === 0) continue;

      const result = await db.query(
        `INSERT INTO daily_activities
          (student_id, activity_date, subject, attendance, homework_status, test_score, teacher_remark)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id, activity_date, subject)
         DO UPDATE SET
           attendance = EXCLUDED.attendance,
           homework_status = EXCLUDED.homework_status,
           test_score = EXCLUDED.test_score,
           teacher_remark = EXCLUDED.teacher_remark
         RETURNING *`,
        [
          student_id,
          logDate,
          subject.trim(),
          attendance || 'Present',
          homework_status?.trim() || 'Assigned',
          test_score?.trim() || null,
          teacher_remark?.trim() || null,
        ]
      );
      savedRecords.push(result.rows[0]);
    }

    res.status(201).json({
      message: `Saved ${savedRecords.length} subject pulse log(s) for ${logDate}.`,
      date: logDate,
      records: savedRecords,
    });
  } catch (err) {
    console.error('Bulk log activities error:', err);
    res.status(500).json({ error: 'Server error saving daily activities.' });
  }
});

// GET /api/activities/parent/feed — Parent views linked children, their weekly subject timetable & daily logs
router.get('/parent/feed', requireRole('parent'), async (req, res) => {
  try {
    const childrenRes = await db.query(
      `SELECT s.id AS student_id, s.student_name, s.grade, s.subjects,
              COALESCE(u_direct.full_name, u_batch.full_name) AS teacher_name
       FROM parent_student_links psl
       JOIN students s ON s.id = psl.student_id
       LEFT JOIN users u_direct ON u_direct.id = s.teacher_id
       LEFT JOIN batches b ON b.id = s.batch_id
       LEFT JOIN users u_batch ON u_batch.id = b.teacher_id
       WHERE psl.parent_user_id = $1
       ORDER BY s.student_name ASC`,
      [req.user.id]
    );

    if (childrenRes.rows.length === 0) {
      return res.json({ children: [], activities: [] });
    }

    const studentIds = childrenRes.rows.map((c) => c.student_id);

    const [schedRes, activitiesRes] = await Promise.all([
      db.query(
        `SELECT * FROM student_weekly_schedule WHERE student_id = ANY($1::int[]) ORDER BY id ASC`,
        [studentIds]
      ),
      db.query(
        `SELECT da.*, s.student_name, s.grade,
                COALESCE(u_direct.full_name, u_batch.full_name) AS teacher_name
         FROM daily_activities da
         JOIN students s ON s.id = da.student_id
         LEFT JOIN users u_direct ON u_direct.id = s.teacher_id
         LEFT JOIN batches b ON b.id = s.batch_id
         LEFT JOIN users u_batch ON u_batch.id = b.teacher_id
         WHERE da.student_id = ANY($1::int[])
         ORDER BY da.activity_date DESC, da.id ASC
         LIMIT 100`,
        [studentIds]
      ),
    ]);

    const childrenWithSchedule = childrenRes.rows.map((c) => ({
      ...c,
      schedule: schedRes.rows.filter((r) => r.student_id === c.student_id),
    }));

    res.json({
      children: childrenWithSchedule,
      activities: activitiesRes.rows,
    });
  } catch (err) {
    console.error('Fetch parent feed error:', err);
    res.status(500).json({ error: 'Server error fetching parent feed.' });
  }
});

module.exports = router;
