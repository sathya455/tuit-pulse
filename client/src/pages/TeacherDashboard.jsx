import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_SUBJECTS = ['Maths', 'Science', 'Social', 'English', 'Telugu', 'Hindi'];

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Student roster & onboarding state
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [subjectsInput, setSubjectsInput] = useState('Maths, Science, Social, English');

  // Weekly schedule editor state for selected student
  const [editSubjects, setEditSubjects] = useState([]);
  const [newSubjectTag, setNewSubjectTag] = useState('');
  const [scheduleMatrix, setScheduleMatrix] = useState({}); // { 'Mon-Maths': true }
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Daily Pulse state (subject-granular)
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [dailyStudents, setDailyStudents] = useState([]);
  const [extraSubjectMap, setExtraSubjectMap] = useState({}); // { [studentId]: 'Social' }
  const [savingPulse, setSavingPulse] = useState(false);

  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Load all students + their weekly schedules
  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      const list = res.data.students || [];
      setStudents(list);
      if (list.length > 0 && !selectedStudentId) {
        selectStudentForSchedule(list[0]);
      } else if (selectedStudentId) {
        const refreshed = list.find((s) => s.id === selectedStudentId);
        if (refreshed) selectStudentForSchedule(refreshed);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to load students.');
    }
  };

  // Load scheduled subjects & logs for selected date
  const fetchDailyPulse = async (dateStr) => {
    try {
      const res = await api.get(`/activities/daily?date=${dateStr}`);
      setDayOfWeek(res.data.day_of_week || '');
      setDailyStudents(res.data.students || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to load daily schedule.');
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchDailyPulse(activityDate);
  }, [activityDate]);

  const selectStudentForSchedule = (student) => {
    setSelectedStudentId(student.id);
    const subjList = Array.isArray(student.subjects) && student.subjects.length > 0
      ? student.subjects
      : ['Maths', 'Science', 'Social', 'English'];
    setEditSubjects(subjList);

    const map = {};
    (student.schedule || []).forEach((item) => {
      map[`${item.day_of_week}-${item.subject}`] = true;
    });
    setScheduleMatrix(map);
  };

  // Add a new student directly under teacher
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    try {
      const subjectsArray = subjectsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api.post('/students', {
        student_name: studentName,
        grade,
        parent_mobile: parentMobile,
        subjects: subjectsArray,
      });

      setStudentName('');
      setGrade('');
      setParentMobile('');
      setStatusMsg(
        res.data.parentLinked
          ? 'Student added and automatically linked to registered Parent!'
          : 'Student added! Assign their weekly subjects below. Parent will auto-link on registration.'
      );
      await fetchStudents();
      if (res.data.student) {
        selectStudentForSchedule(res.data.student);
      }
      await fetchDailyPulse(activityDate);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error adding student.');
    }
  };

  // Toggle subject on a weekday in the Mon-Sun timetable
  const toggleDaySubject = (day, subj) => {
    const key = `${day}-${subj}`;
    setScheduleMatrix((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Add another subject to the selected student's subject list
  const handleAddSubjectToStudent = () => {
    const clean = newSubjectTag.trim();
    if (!clean || editSubjects.includes(clean)) return;
    setEditSubjects((prev) => [...prev, clean]);
    setNewSubjectTag('');
  };

  // Save recurring weekly subject timetable
  const handleSaveSchedule = async () => {
    if (!selectedStudentId) return;
    setSavingSchedule(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const schedulePayload = [];
      DAYS.forEach((day) => {
        editSubjects.forEach((subj) => {
          if (scheduleMatrix[`${day}-${subj}`]) {
            schedulePayload.push({ day_of_week: day, subject: subj });
          }
        });
      });

      await api.put(`/students/${selectedStudentId}/schedule`, {
        subjects: editSubjects,
        schedule: schedulePayload,
      });

      setStatusMsg('Weekly subject timetable saved!');
      await fetchStudents();
      await fetchDailyPulse(activityDate);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save weekly timetable.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Update attendance for a student on the selected date
  const handleAttendanceChange = (studentId, value) => {
    setDailyStudents((prev) =>
      prev.map((st) => (st.student_id === studentId ? { ...st, attendance: value } : st))
    );
  };

  // Update homework, test score, or remark for a specific subject row
  const handleSubjectFieldChange = (studentId, subject, field, value) => {
    setDailyStudents((prev) =>
      prev.map((st) => {
        if (st.student_id !== studentId) return st;
        return {
          ...st,
          entries: st.entries.map((ent) =>
            ent.subject === subject ? { ...ent, [field]: value } : ent
          ),
        };
      })
    );
  };

  // Add an extra (unscheduled) subject row for today
  const handleAddExtraSubjectRow = (studentId) => {
    const st = dailyStudents.find((s) => s.student_id === studentId);
    if (!st) return;
    const candidate =
      (extraSubjectMap[studentId] || '').trim() ||
      st.all_subjects.find((sub) => !st.entries.some((e) => e.subject === sub)) ||
      'General';

    if (st.entries.some((e) => e.subject.toLowerCase() === candidate.toLowerCase())) return;

    setDailyStudents((prev) =>
      prev.map((item) =>
        item.student_id === studentId
          ? {
              ...item,
              entries: [
                ...item.entries,
                {
                  subject: candidate,
                  is_scheduled: false,
                  homework_status: 'Assigned',
                  test_score: '',
                  teacher_remark: '',
                },
              ],
            }
          : item
      )
    );
    setExtraSubjectMap((prev) => ({ ...prev, [studentId]: '' }));
  };

  // Save all subject-wise Daily Pulse entries for the chosen date
  const handleSaveDailyPulse = async () => {
    setSavingPulse(true);
    setErrorMsg('');
    setStatusMsg('');

    const flatEntries = [];
    dailyStudents.forEach((st) => {
      st.entries.forEach((ent) => {
        flatEntries.push({
          student_id: st.student_id,
          subject: ent.subject,
          attendance: st.attendance,
          homework_status: ent.homework_status,
          test_score: ent.test_score,
          teacher_remark: ent.teacher_remark,
        });
      });
    });

    if (flatEntries.length === 0) {
      setSavingPulse(false);
      setErrorMsg('No subjects scheduled or added for this date yet. Assign subjects in the weekly timetable or click "+ Add Subject".');
      return;
    }

    try {
      const res = await api.post('/activities/bulk', {
        activity_date: activityDate,
        entries: flatEntries,
      });
      setStatusMsg(res.data.message);
      await fetchDailyPulse(activityDate);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save daily pulse.');
    } finally {
      setSavingPulse(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div style={styles.page}>
      <header style={styles.navbar}>
        <div>
          <h1 style={styles.brand}>TuitPulse</h1>
          <span style={styles.badge}>Home Tuition Teacher Portal</span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.userName}>Welcome, {user?.full_name}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        {statusMsg && <div style={styles.successBox}>{statusMsg}</div>}
        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

        {/* Section 1: Add Student Directly + Student Roster */}
        <div style={styles.gridTwo}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Add Student</h2>
            <form onSubmit={handleAddStudent} style={styles.formCol}>
              <input
                type="text"
                placeholder="Student Full Name *"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Class / Grade (e.g., Class 8)"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                style={styles.input}
              />
              <input
                type="tel"
                placeholder="Parent Mobile (10 digits) *"
                value={parentMobile}
                onChange={(e) => setParentMobile(e.target.value)}
                required
                style={styles.input}
              />
              <label style={styles.smallLabel}>Subjects Taught (comma-separated):</label>
              <input
                type="text"
                placeholder="Maths, Science, Social, English"
                value={subjectsInput}
                onChange={(e) => setSubjectsInput(e.target.value)}
                style={styles.input}
              />
              <div style={styles.chipRow}>
                {DEFAULT_SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      const current = subjectsInput.split(',').map((s) => s.trim()).filter(Boolean);
                      if (!current.includes(sub)) {
                        setSubjectsInput([...current, sub].join(', '));
                      }
                    }}
                    style={styles.quickChip}
                  >
                    + {sub}
                  </button>
                ))}
              </div>
              <button type="submit" style={styles.primaryBtn}>+ Add Student</button>
            </form>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>My Tuition Students ({students.length})</h2>
            {students.length === 0 ? (
              <p style={styles.muted}>No students added yet. Add your first home tuition student on the left!</p>
            ) : (
              <div style={styles.studentList}>
                {students.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => selectStudentForSchedule(st)}
                    style={{
                      ...styles.studentItem,
                      ...(selectedStudentId === st.id ? styles.activeStudentItem : {}),
                    }}
                  >
                    <div>
                      <strong>{st.student_name}</strong>{' '}
                      {st.grade && <span style={styles.gradeTag}>{st.grade}</span>}
                      <div style={styles.smallText}>
                        Subjects: {(st.subjects || []).join(', ') || 'None'}
                      </div>
                      <div style={styles.smallText}>
                        Parent: {st.parent_mobile} •{' '}
                        <span style={{ color: st.parent_registered ? '#15803d' : '#b45309', fontWeight: 600 }}>
                          {st.parent_registered ? 'Parent Linked' : 'Awaiting Parent Signup'}
                        </span>
                      </div>
                    </div>
                    <span style={styles.countPill}>{(st.schedule || []).length} slots/wk</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Section 2: Recurring Mon-Sun Weekly Subject Timetable for Selected Student */}
        {selectedStudent && (
          <section style={styles.card}>
            <div style={styles.pulseHeader}>
              <div>
                <h2 style={styles.cardTitle}>
                  Weekly Subject Timetable — {selectedStudent.student_name} {selectedStudent.grade ? `(${selectedStudent.grade})` : ''}
                </h2>
                <p style={styles.muted}>Check which subjects you teach on each day of the week. Daily Pulse auto-loads from this schedule.</p>
              </div>
              <div style={styles.addSubRow}>
                <input
                  type="text"
                  placeholder="Add subject (e.g., Telugu)"
                  value={newSubjectTag}
                  onChange={(e) => setNewSubjectTag(e.target.value)}
                  style={styles.smallInput}
                />
                <button type="button" onClick={handleAddSubjectToStudent} style={styles.secondaryBtn}>
                  + Subject
                </button>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Subject</th>
                    {DAYS.map((day) => (
                      <th key={day} style={{ ...styles.th, textAlign: 'center' }}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editSubjects.map((subj) => (
                    <tr key={subj} style={styles.tr}>
                      <td style={styles.td}><strong>{subj}</strong></td>
                      {DAYS.map((day) => {
                        const checked = !!scheduleMatrix[`${day}-${subj}`];
                        return (
                          <td key={day} style={{ ...styles.td, textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDaySubject(day, subj)}
                              style={styles.checkbox}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.saveRow}>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                style={styles.primaryBtn}
              >
                {savingSchedule ? 'Saving Timetable...' : 'Save Weekly Timetable'}
              </button>
            </div>
          </section>
        )}

        {/* Section 3: Subject-Wise Daily Pulse Log (Attendance, Homework, Tests, Remarks) */}
        <section style={styles.card}>
          <div style={styles.pulseHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                Daily Pulse Log {dayOfWeek ? `(${dayOfWeek})` : ''}
              </h2>
              <p style={styles.muted}>
                Auto-loaded scheduled subjects for the selected date. Mark attendance, homework, test scores, and remarks.
              </p>
            </div>
            <div style={styles.datePickerRow}>
              <label style={styles.label}>Date:</label>
              <input
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          </div>

          {dailyStudents.length === 0 ? (
            <p style={styles.muted}>Add students above to start logging daily progress.</p>
          ) : (
            <div style={styles.dailyCardsWrap}>
              {dailyStudents.map((st) => (
                <div key={st.student_id} style={styles.dailyStudentCard}>
                  <div style={styles.dailyStudentTop}>
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{st.student_name}</strong>
                      {st.grade && <span style={styles.gradeTag}>{st.grade}</span>}
                    </div>

                    <div style={styles.dailyControlsRight}>
                      <label style={styles.label}>Attendance:</label>
                      <select
                        value={st.attendance}
                        onChange={(e) => handleAttendanceChange(st.student_id, e.target.value)}
                        style={styles.select}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                      </select>

                      <input
                        type="text"
                        list={`subj-list-${st.student_id}`}
                        placeholder="Extra subject..."
                        value={extraSubjectMap[st.student_id] || ''}
                        onChange={(e) =>
                          setExtraSubjectMap((prev) => ({ ...prev, [st.student_id]: e.target.value }))
                        }
                        style={styles.smallInput}
                      />
                      <datalist id={`subj-list-${st.student_id}`}>
                        {st.all_subjects.map((sub) => (
                          <option key={sub} value={sub} />
                        ))}
                      </datalist>
                      <button
                        type="button"
                        onClick={() => handleAddExtraSubjectRow(st.student_id)}
                        style={styles.secondaryBtn}
                      >
                        + Add Subject
                      </button>
                    </div>
                  </div>

                  {st.entries.length === 0 ? (
                    <p style={styles.muted}>
                      No subjects scheduled for {dayOfWeek}. Use "+ Add Subject" above if you taught today, or set up their weekly timetable.
                    </p>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Subject</th>
                            <th style={styles.th}>Homework</th>
                            <th style={styles.th}>Test Score</th>
                            <th style={styles.th}>Teacher Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {st.entries.map((ent) => (
                            <tr key={ent.subject} style={styles.tr}>
                              <td style={styles.td}>
                                <span style={styles.subjectPill}>{ent.subject}</span>
                              </td>
                              <td style={styles.td}>
                                <select
                                  value={ent.homework_status}
                                  onChange={(e) =>
                                    handleSubjectFieldChange(st.student_id, ent.subject, 'homework_status', e.target.value)
                                  }
                                  style={styles.select}
                                >
                                  <option value="Completed">Completed</option>
                                  <option value="Assigned">Assigned</option>
                                  <option value="Incomplete">Incomplete</option>
                                </select>
                              </td>
                              <td style={styles.td}>
                                <input
                                  type="text"
                                  placeholder="e.g., 18/20"
                                  value={ent.test_score}
                                  onChange={(e) =>
                                    handleSubjectFieldChange(st.student_id, ent.subject, 'test_score', e.target.value)
                                  }
                                  style={styles.cellInput}
                                />
                              </td>
                              <td style={styles.td}>
                                <input
                                  type="text"
                                  placeholder="e.g., Completed Fractions exercise"
                                  value={ent.teacher_remark}
                                  onChange={(e) =>
                                    handleSubjectFieldChange(st.student_id, ent.subject, 'teacher_remark', e.target.value)
                                  }
                                  style={styles.cellInput}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              <div style={styles.saveRow}>
                <button
                  type="button"
                  onClick={handleSaveDailyPulse}
                  disabled={savingPulse}
                  style={styles.saveBtn}
                >
                  {savingPulse ? 'Saving Daily Pulse...' : 'Save All Daily Pulse Updates'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' },
  navbar: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { display: 'inline', margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' },
  badge: {
    marginLeft: '0.75rem',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    padding: '0.25rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userName: { fontWeight: 600, color: '#334155', fontSize: '0.95rem' },
  logoutBtn: {
    padding: '0.45rem 0.9rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  main: { maxWidth: '1120px', margin: '0 auto', padding: '1.5rem' },
  gridTwo: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    marginBottom: '1.25rem',
  },
  cardTitle: { margin: '0 0 0.85rem', fontSize: '1.15rem', color: '#0f172a' },
  formCol: { display: 'flex', flexDirection: 'column', gap: '0.7rem' },
  smallLabel: { fontSize: '0.82rem', fontWeight: 600, color: '#475569' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  quickChip: {
    padding: '0.25rem 0.55rem',
    borderRadius: '999px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '0.78rem',
    cursor: 'pointer',
    color: '#334155',
  },
  input: { padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem' },
  smallInput: { padding: '0.42rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '150px' },
  primaryBtn: {
    padding: '0.65rem 1.1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '0.42rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  studentList: { display: 'flex', flexDirection: 'column', gap: '0.65rem' },
  studentItem: {
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  activeStudentItem: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  gradeTag: {
    marginLeft: '0.45rem',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  smallText: { fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' },
  countPill: { backgroundColor: '#f1f5f9', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 },
  pulseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' },
  addSubRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  datePickerRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  label: { fontWeight: 600, fontSize: '0.88rem', color: '#334155' },
  dateInput: { padding: '0.45rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '0.65rem 0.75rem', borderBottom: '2px solid #e2e8f0', fontSize: '0.83rem', color: '#475569' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.6rem 0.75rem', fontSize: '0.9rem' },
  checkbox: { width: '17px', height: '17px', cursor: 'pointer', accentColor: '#2563eb' },
  dailyCardsWrap: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  dailyStudentCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '1rem',
    backgroundColor: '#fcfcfd',
  },
  dailyStudentTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.65rem',
    borderBottom: '1px solid #e2e8f0',
  },
  dailyControlsRight: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' },
  subjectPill: {
    display: 'inline-block',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '0.84rem',
  },
  select: { padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' },
  cellInput: { padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', minWidth: '130px' },
  saveRow: { marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' },
  saveBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  successBox: { backgroundColor: '#dcfce7', color: '#166534', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 500 },
  errorBox: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 500 },
  muted: { color: '#64748b', fontSize: '0.9rem', margin: 0 },
};
