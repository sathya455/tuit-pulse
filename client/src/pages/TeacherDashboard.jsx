import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, CheckCircle2, BookOpen, Plus, Trash2,
  MessageCircle, RefreshCw, LogOut, Clock, Award, Search
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_SUBJECTS = ['Maths', 'Science', 'Social', 'English', 'Telugu', 'Hindi'];

const SUBJECT_COLORS = {
  Maths: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Science: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Social: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  English: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  Telugu: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  Hindi: { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
};

const ATTENDANCE_STYLES = {
  Present: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  Late: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  Absent: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
};

const HW_STYLES = {
  Completed: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  Assigned: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  Incomplete: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
};

const getSubjectStyle = (subj) =>
  SUBJECT_COLORS[subj] || { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const todayIso = new Date().toISOString().split('T')[0];

  const [students, setStudents] = useState([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [joinedDateInput, setJoinedDateInput] = useState(todayIso);
  const [subjectsInput, setSubjectsInput] = useState('Maths, Science, Social, English');

  const [editSubjects, setEditSubjects] = useState([]);
  const [editJoinedDate, setEditJoinedDate] = useState(todayIso);
  const [newSubjectTag, setNewSubjectTag] = useState('');
  const [scheduleMatrix, setScheduleMatrix] = useState({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [activityDate, setActivityDate] = useState(todayIso);
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [dailyStudents, setDailyStudents] = useState([]);
  const [extraSubjectMap, setExtraSubjectMap] = useState({});
  const [savingPulse, setSavingPulse] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const selectStudentForSchedule = useCallback((student) => {
    setSelectedStudentId(student.id);
    setEditJoinedDate(student.joined_date || new Date().toISOString().split('T')[0]);
    const subjList =
      Array.isArray(student.subjects) && student.subjects.length > 0
        ? student.subjects
        : ['Maths', 'Science', 'Social', 'English'];
    setEditSubjects(subjList);

    const map = {};
    (student.schedule || []).forEach((item) => {
      map[`${item.day_of_week}-${item.subject}`] = true;
    });
    setScheduleMatrix(map);
  }, []);

  const fetchStudents = useCallback(async (silent = false) => {
    try {
      const res = await api.get('/students');
      const list = res.data.students || [];
      setStudents(list);
      setLastSynced(new Date());
      setSelectedStudentId((prevId) => {
        if (list.length === 0) return null;
        const target = list.find((s) => s.id === prevId) || list[0];
        if (!prevId) selectStudentForSchedule(target);
        return target.id;
      });
    } catch (err) {
      if (!silent) setErrorMsg(err.response?.data?.error || 'Failed to load students.');
    }
  }, [selectStudentForSchedule]);

  const fetchDailyPulse = useCallback(async (dateStr, silent = false) => {
    try {
      const res = await api.get(`/activities/daily?date=${dateStr}`);
      setDayOfWeek(res.data.day_of_week || '');
      setDailyStudents(res.data.students || []);
      setLastSynced(new Date());
    } catch (err) {
      if (!silent) setErrorMsg(err.response?.data?.error || 'Failed to load daily schedule.');
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchDailyPulse(activityDate);
  }, [activityDate, fetchDailyPulse]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStudents(true);
      }
    }, 15000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStudents(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchStudents]);

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
        joined_date: joinedDateInput,
        subjects: subjectsArray,
      });

      setStudentName('');
      setGrade('');
      setParentMobile('');
      setJoinedDateInput(todayIso);
      setStatusMsg(
        res.data.parentLinked
          ? 'Student added and linked to registered Parent!'
          : 'Student added! Assign weekly subjects below. Parent auto-links upon signup.'
      );
      await fetchStudents();
      if (res.data.student) selectStudentForSchedule(res.data.student);
      await fetchDailyPulse(activityDate);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error adding student.');
    }
  };

  const handleDeleteStudent = async (e, student) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${student.student_name} and all their activity logs?`)) return;
    setErrorMsg('');
    setStatusMsg('');
    try {
      await api.delete(`/students/${student.id}`);
      setStatusMsg(`Removed ${student.student_name}.`);
      if (selectedStudentId === student.id) setSelectedStudentId(null);
      await fetchStudents();
      await fetchDailyPulse(activityDate);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to remove student.');
    }
  };

  const toggleDaySubject = (day, subj) => {
    const key = `${day}-${subj}`;
    setScheduleMatrix((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddSubjectToStudent = () => {
    const clean = newSubjectTag.trim();
    if (!clean || editSubjects.includes(clean)) return;
    setEditSubjects((prev) => [...prev, clean]);
    setNewSubjectTag('');
  };

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
        joined_date: editJoinedDate,
        schedule: schedulePayload,
      });

      setStatusMsg('Weekly subject timetable & start date saved!');
      await fetchStudents();
      await fetchDailyPulse(activityDate);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save weekly timetable.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAttendanceChange = (studentId, value) => {
    setDailyStudents((prev) =>
      prev.map((st) => (st.student_id === studentId ? { ...st, attendance: value } : st))
    );
  };

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

  const handleSaveDailyPulse = async () => {
    setSavingPulse(true);
    setErrorMsg('');
    setStatusMsg('');

    const flatEntries = [];
    dailyStudents
      .filter((st) => !st.before_join || st.entries.length > 0)
      .forEach((st) => {
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
      setErrorMsg('No subjects scheduled or added for this date yet.');
      return;
    }

    try {
      const res = await api.post('/activities/bulk', {
        activity_date: activityDate,
        entries: flatEntries,
      });
      setStatusMsg(`${res.data.message} Parent feeds updated live.`);
      await fetchDailyPulse(activityDate);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save daily pulse.');
    } finally {
      setSavingPulse(false);
    }
  };

  const handleShareWhatsApp = (dailySt) => {
    const rosterInfo = students.find((s) => s.id === dailySt.student_id);
    const phone = rosterInfo?.parent_mobile ? `91${rosterInfo.parent_mobile}` : '';
    const dateLabel = new Date(activityDate).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const subjectLines = dailySt.entries
      .map((ent) => {
        let line = `- *${ent.subject}*: HW ${ent.homework_status}`;
        if (ent.test_score) line += ` | Test: ${ent.test_score}`;
        if (ent.teacher_remark) line += ` (${ent.teacher_remark})`;
        return line;
      })
      .join('\n');

    const msg =
      `*TuitPulse Daily Update - ${dateLabel}*\n` +
      `Student: *${dailySt.student_name}*${dailySt.grade ? ` (${dailySt.grade})` : ''}\n` +
      `Attendance: *${dailySt.attendance}*\n\n` +
      `${subjectLines || 'No subject entries logged.'}\n\n` +
      `- ${user?.full_name || 'Tuition Teacher'}`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const filteredRoster = students.filter(
    (st) =>
      st.student_name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      (st.grade || '').toLowerCase().includes(rosterSearch.toLowerCase())
  );

  // Separate enrolled students on the selected date from siblings who joined later
  const activeDailyStudents = dailyStudents.filter((st) => !st.before_join || st.entries.length > 0);
  const notYetJoinedStudents = dailyStudents.filter((st) => st.before_join && st.entries.length === 0);

  const totalStudents = students.length;
  const scheduledSubjectsToday = activeDailyStudents.reduce((acc, s) => acc + s.entries.length, 0);
  const presentToday = activeDailyStudents.filter((s) => s.is_logged && s.attendance === 'Present').length;
  const hwCompletedToday = activeDailyStudents.reduce(
    (acc, s) => acc + s.entries.filter((e) => e.homework_status === 'Completed').length,
    0
  );

  return (
    <div style={styles.page}>
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <div style={styles.logoMark}>TP</div>
          <h1 style={styles.brand}>TuitPulse</h1>
          <span style={styles.badge}>Teacher Studio</span>
          <span style={styles.livePill} title={`Last synced ${lastSynced.toLocaleTimeString()}`}>
            <span className="tp-live-dot" style={styles.liveDot} /> Live Sync
          </span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.userName}>{user?.full_name}</span>
          <button onClick={handleLogout} className="tp-btn" style={styles.logoutBtn}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {statusMsg && <div className="tp-animate-in" style={styles.successBox}>{statusMsg}</div>}
        {errorMsg && <div className="tp-animate-in" style={styles.errorBox}>{errorMsg}</div>}

        {/* KPI Summary Strip */}
        <div style={styles.kpiGrid}>
          <div className="tp-card tp-animate-in" style={styles.kpiCard}>
            <div style={{ ...styles.kpiIcon, backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={styles.kpiValue}>{totalStudents}</div>
              <div style={styles.kpiLabel}>Active Students</div>
            </div>
          </div>

          <div className="tp-card tp-animate-in" style={styles.kpiCard}>
            <div style={{ ...styles.kpiIcon, backgroundColor: '#faf5ff', color: '#7e22ce' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={styles.kpiValue}>{scheduledSubjectsToday}</div>
              <div style={styles.kpiLabel}>{dayOfWeek || 'Today'}'s Subjects</div>
            </div>
          </div>

          <div className="tp-card tp-animate-in" style={styles.kpiCard}>
            <div style={{ ...styles.kpiIcon, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={styles.kpiValue}>{presentToday}</div>
              <div style={styles.kpiLabel}>Present ({dayOfWeek || 'Today'})</div>
            </div>
          </div>

          <div className="tp-card tp-animate-in" style={styles.kpiCard}>
            <div style={{ ...styles.kpiIcon, backgroundColor: '#fef3c7', color: '#d97706' }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div style={styles.kpiValue}>{hwCompletedToday}</div>
              <div style={styles.kpiLabel}>HW Completed</div>
            </div>
          </div>
        </div>

        {/* Section 1: Add Student Directly + Searchable Roster */}
        <div style={styles.gridTwo}>
          <section className="tp-card" style={styles.card}>
            <h2 style={styles.cardTitle}>Onboard Student</h2>
            <form onSubmit={handleAddStudent} style={styles.formCol}>
              <input
                type="text"
                className="tp-input"
                placeholder="Student Full Name *"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                style={styles.input}
              />
              <div style={styles.twoColInputs}>
                <input
                  type="text"
                  className="tp-input"
                  placeholder="Class (e.g., Class 8)"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  style={styles.input}
                />
                <input
                  type="tel"
                  className="tp-input"
                  placeholder="Parent Mobile (10 digits) *"
                  value={parentMobile}
                  onChange={(e) => setParentMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.twoColInputs}>
                <div>
                  <label style={styles.smallLabel}>Tuition Start Date:</label>
                  <input
                    type="date"
                    className="tp-input"
                    value={joinedDateInput}
                    onChange={(e) => setJoinedDateInput(e.target.value)}
                    style={{ ...styles.input, marginTop: '0.25rem' }}
                  />
                </div>
                <div>
                  <label style={styles.smallLabel}>Subjects Taught:</label>
                  <input
                    type="text"
                    className="tp-input"
                    placeholder="Maths, Science, Social"
                    value={subjectsInput}
                    onChange={(e) => setSubjectsInput(e.target.value)}
                    style={{ ...styles.input, marginTop: '0.25rem' }}
                  />
                </div>
              </div>
              <div style={styles.chipRow}>
                {DEFAULT_SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    className="tp-btn"
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
              <button type="submit" className="tp-btn" style={styles.primaryBtn}>
                <Plus size={16} /> Add Student
              </button>
            </form>
          </section>

          <section className="tp-card" style={styles.card}>
            <div style={styles.cardHeaderRow}>
              <h2 style={{ ...styles.cardTitle, margin: 0 }}>Tuition Roster ({students.length})</h2>
              <button
                type="button"
                className="tp-btn"
                onClick={() => fetchStudents()}
                style={styles.iconGhostBtn}
                title="Refresh roster"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {students.length > 0 && (
              <div style={styles.searchWrap}>
                <Search size={15} color="#94a3b8" style={styles.searchIcon} />
                <input
                  type="text"
                  className="tp-input"
                  placeholder="Search student by name or class..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
            )}

            {students.length === 0 ? (
              <p style={styles.muted}>No students yet. Add your first home tuition student on the left!</p>
            ) : filteredRoster.length === 0 ? (
              <p style={styles.muted}>No students match "{rosterSearch}".</p>
            ) : (
              <div style={styles.studentList}>
                {filteredRoster.map((st) => (
                  <div
                    key={st.id}
                    className="tp-interactive-row"
                    onClick={() => selectStudentForSchedule(st)}
                    style={{
                      ...styles.studentItem,
                      ...(selectedStudentId === st.id ? styles.activeStudentItem : {}),
                    }}
                  >
                    <div style={styles.studentRowLeft}>
                      <div style={styles.avatar}>
                        {st.student_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div>
                          <strong>{st.student_name}</strong>
                          {st.grade && <span style={styles.gradeTag}>{st.grade}</span>}
                        </div>
                        <div style={styles.smallText}>
                          {(st.subjects || []).join(' | ') || 'No subjects'}
                        </div>
                        <div style={styles.smallText}>
                          Parent: {st.parent_mobile} | Joined {st.joined_date} |{' '}
                          <span style={{ color: st.parent_registered ? '#15803d' : '#b45309', fontWeight: 600 }}>
                            {st.parent_registered ? 'Linked' : 'Pending Signup'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={styles.studentRowRight}>
                      <span style={styles.countPill}>{(st.schedule || []).length}/wk</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteStudent(e, st)}
                        style={styles.deleteBtn}
                        title="Remove student"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Section 2: Recurring Mon-Sun Weekly Subject Timetable + Editable Start Date */}
        {selectedStudent && (
          <section className="tp-card tp-animate-in" style={styles.card}>
            <div style={styles.pulseHeader}>
              <div>
                <h2 style={styles.cardTitle}>
                  Weekly Subject Timetable - {selectedStudent.student_name}{' '}
                  {selectedStudent.grade ? `(${selectedStudent.grade})` : ''}
                </h2>
                <p style={styles.muted}>
                  Configure recurring subjects per day and adjust enrollment start date if needed.
                </p>
              </div>
              <div style={styles.addSubRow}>
                <label style={styles.smallLabel}>Joined:</label>
                <input
                  type="date"
                  className="tp-input"
                  value={editJoinedDate}
                  onChange={(e) => setEditJoinedDate(e.target.value)}
                  style={styles.dateInput}
                />
                <input
                  type="text"
                  className="tp-input"
                  placeholder="New subject..."
                  value={newSubjectTag}
                  onChange={(e) => setNewSubjectTag(e.target.value)}
                  style={styles.smallInput}
                />
                <button type="button" className="tp-btn" onClick={handleAddSubjectToStudent} style={styles.secondaryBtn}>
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
                  {editSubjects.map((subj) => {
                    const col = getSubjectStyle(subj);
                    return (
                      <tr key={subj} style={styles.tr}>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.subjectPill,
                              backgroundColor: col.bg,
                              color: col.text,
                              border: `1px solid ${col.border}`,
                            }}
                          >
                            {subj}
                          </span>
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={styles.saveRow}>
              <button
                type="button"
                className="tp-btn"
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                style={styles.primaryBtn}
              >
                {savingSchedule ? 'Saving Timetable...' : 'Save Weekly Timetable & Start Date'}
              </button>
            </div>
          </section>
        )}

        {/* Section 3: Subject-Wise Daily Pulse Log */}
        <section className="tp-card" style={styles.card}>
          <div style={styles.pulseHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                Daily Pulse Sheet {dayOfWeek ? `(${dayOfWeek})` : ''}
              </h2>
              <p style={styles.muted}>
                Tap attendance and homework status pills, log test scores or remarks, then publish live.
              </p>
            </div>
            <div style={styles.datePickerRow}>
              <Clock size={16} color="#475569" />
              <label style={styles.label}>Date:</label>
              <input
                type="date"
                className="tp-input"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          </div>

          {activeDailyStudents.length === 0 ? (
            <p style={styles.muted}>
              No students were enrolled on {activityDate}. Pick a date on or after your student's start date.
            </p>
          ) : (
            <div style={styles.dailyCardsWrap}>
              {activeDailyStudents.map((st) => (
                <div key={st.student_id} style={styles.dailyStudentCard}>
                  <div style={styles.dailyStudentTop}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                      <div style={styles.miniAvatar}>{st.student_name.slice(0, 2).toUpperCase()}</div>
                      <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{st.student_name}</strong>
                      {st.grade && <span style={styles.gradeTag}>{st.grade}</span>}
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.52rem',
                        borderRadius: '999px',
                        backgroundColor: st.is_logged ? '#dcfce7' : '#fef3c7',
                        color: st.is_logged ? '#166534' : '#b45309',
                      }}>
                        {st.is_logged ? 'Published' : 'Not Logged Yet'}
                      </span>
                    </div>

                    <div style={styles.dailyControlsRight}>
                      <div style={styles.pillGroup}>
                        {['Present', 'Late', 'Absent'].map((status) => {
                          const active = st.attendance === status;
                          const stCol = ATTENDANCE_STYLES[status];
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleAttendanceChange(st.student_id, status)}
                              style={{
                                ...styles.togglePill,
                                ...(active
                                  ? {
                                      backgroundColor: stCol.bg,
                                      color: stCol.text,
                                      borderColor: stCol.border,
                                      fontWeight: 700,
                                    }
                                  : {}),
                              }}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        className="tp-input"
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
                        className="tp-btn"
                        onClick={() => handleAddExtraSubjectRow(st.student_id)}
                        style={styles.secondaryBtn}
                      >
                        + Subject
                      </button>

                      <button
                        type="button"
                        className="tp-btn"
                        onClick={() => handleShareWhatsApp(st)}
                        style={styles.whatsappBtn}
                        title="Send formatted summary on WhatsApp"
                      >
                        <MessageCircle size={15} /> WhatsApp
                      </button>
                    </div>
                  </div>

                  {st.entries.length === 0 ? (
                    <p style={styles.muted}>
                      No subjects scheduled for {dayOfWeek}. Click "+ Subject" above to log an extra class.
                    </p>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Subject</th>
                            <th style={styles.th}>Homework Status</th>
                            <th style={styles.th}>Test Score</th>
                            <th style={styles.th}>Teacher Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {st.entries.map((ent) => {
                            const col = getSubjectStyle(ent.subject);
                            return (
                              <tr key={ent.subject} style={styles.tr}>
                                <td style={styles.td}>
                                  <span
                                    style={{
                                      ...styles.subjectPill,
                                      backgroundColor: col.bg,
                                      color: col.text,
                                      border: `1px solid ${col.border}`,
                                    }}
                                  >
                                    {ent.subject}
                                  </span>
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.pillGroup}>
                                    {['Completed', 'Assigned', 'Incomplete'].map((hwState) => {
                                      const active = ent.homework_status === hwState;
                                      const hwCol = HW_STYLES[hwState];
                                      return (
                                        <button
                                          key={hwState}
                                          type="button"
                                          onClick={() =>
                                            handleSubjectFieldChange(
                                              st.student_id,
                                              ent.subject,
                                              'homework_status',
                                              hwState
                                            )
                                          }
                                          style={{
                                            ...styles.togglePill,
                                            ...(active
                                              ? {
                                                  backgroundColor: hwCol.bg,
                                                  color: hwCol.text,
                                                  borderColor: hwCol.border,
                                                  fontWeight: 700,
                                                }
                                              : {}),
                                          }}
                                        >
                                          {hwState}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td style={styles.td}>
                                  <input
                                    type="text"
                                    className="tp-input"
                                    placeholder="e.g., 19/20"
                                    value={ent.test_score}
                                    onChange={(e) =>
                                      handleSubjectFieldChange(
                                        st.student_id,
                                        ent.subject,
                                        'test_score',
                                        e.target.value
                                      )
                                    }
                                    style={styles.cellInput}
                                  />
                                </td>
                                <td style={styles.td}>
                                  <input
                                    type="text"
                                    className="tp-input"
                                    placeholder="e.g., Solved quadratic equations well"
                                    value={ent.teacher_remark}
                                    onChange={(e) =>
                                      handleSubjectFieldChange(
                                        st.student_id,
                                        ent.subject,
                                        'teacher_remark',
                                        e.target.value
                                      )
                                    }
                                    style={styles.cellInput}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              <div style={styles.saveRow}>
                <button
                  type="button"
                  className="tp-btn"
                  onClick={handleSaveDailyPulse}
                  disabled={savingPulse}
                  style={styles.saveBtn}
                >
                  <Award size={17} />
                  {savingPulse ? 'Publishing Live Updates...' : 'Publish Daily Pulse Live'}
                </button>
              </div>
            </div>
          )}

          {notYetJoinedStudents.length > 0 && (
            <p style={{ ...styles.muted, marginTop: '0.9rem', fontSize: '0.82rem' }}>
              Hidden on {activityDate} (joined later):{' '}
              {notYetJoinedStudents.map((s) => `${s.student_name} (starts ${s.joined_date})`).join(', ')}.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f4f7fb' },
  navbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e2e8f0',
    padding: '0.85rem 1.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' },
  logoMark: {
    width: '32px',
    height: '32px',
    borderRadius: '9px',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' },
  badge: {
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    padding: '0.22rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.76rem',
    fontWeight: 700,
  },
  livePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    padding: '0.2rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  liveDot: { width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' },
  navRight: { display: 'flex', alignItems: 'center', gap: '0.9rem' },
  userName: { fontWeight: 600, color: '#334155', fontSize: '0.92rem' },
  logoutBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.45rem 0.85rem',
    borderRadius: '9px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.84rem',
  },
  main: { maxWidth: '1180px', margin: '0 auto', padding: '1.5rem' },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  kpiCard: {
    padding: '1.05rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.95rem',
  },
  kpiIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: { fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 },
  kpiLabel: { fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: '0.18rem' },
  gridTwo: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' },
  card: {
    padding: '1.45rem',
    marginBottom: '1.25rem',
  },
  cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' },
  cardTitle: { margin: '0 0 0.85rem', fontSize: '1.14rem', fontWeight: 700, color: '#0f172a' },
  formCol: { display: 'flex', flexDirection: 'column', gap: '0.72rem' },
  twoColInputs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' },
  smallLabel: { fontSize: '0.8rem', fontWeight: 600, color: '#475569' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  quickChip: {
    padding: '0.24rem 0.6rem',
    borderRadius: '999px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '0.76rem',
    cursor: 'pointer',
    color: '#334155',
    fontWeight: 600,
  },
  input: { padding: '0.62rem 0.82rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%' },
  smallInput: { padding: '0.42rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', width: '140px' },
  searchWrap: { position: 'relative', marginBottom: '0.8rem' },
  searchIcon: { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' },
  searchInput: {
    width: '100%',
    padding: '0.52rem 0.75rem 0.52rem 2.15rem',
    borderRadius: '9px',
    border: '1px solid #cbd5e1',
    fontSize: '0.86rem',
    backgroundColor: '#f8fafc',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.68rem 1.2rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 3px 10px rgba(37, 99, 235, 0.22)',
  },
  secondaryBtn: {
    padding: '0.42rem 0.78rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontWeight: 600,
    fontSize: '0.83rem',
    cursor: 'pointer',
  },
  whatsappBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.44rem 0.8rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.83rem',
    cursor: 'pointer',
  },
  iconGhostBtn: {
    padding: '0.38rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    color: '#475569',
    display: 'inline-flex',
  },
  studentList: { display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto' },
  studentItem: {
    padding: '0.82rem 0.95rem',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  activeStudentItem: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  studentRowLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    color: '#1d4ed8',
    fontWeight: 800,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  miniAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontWeight: 800,
    fontSize: '0.76rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentRowRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  deleteBtn: {
    padding: '0.35rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  gradeTag: {
    marginLeft: '0.45rem',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    padding: '0.15rem 0.52rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  smallText: { fontSize: '0.8rem', color: '#64748b', marginTop: '0.18rem' },
  countPill: { backgroundColor: '#f1f5f9', padding: '0.22rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, color: '#334155' },
  pulseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' },
  addSubRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' },
  datePickerRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  label: { fontWeight: 600, fontSize: '0.86rem', color: '#334155' },
  dateInput: { padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '0.65rem 0.75rem', borderBottom: '2px solid #e2e8f0', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.65rem 0.75rem', fontSize: '0.9rem' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' },
  dailyCardsWrap: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  dailyStudentCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '1.1rem',
    backgroundColor: '#f8fafc',
  },
  dailyStudentTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '0.8rem',
    paddingBottom: '0.7rem',
    borderBottom: '1px solid #e2e8f0',
  },
  dailyControlsRight: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' },
  pillGroup: {
    display: 'inline-flex',
    gap: '0.28rem',
    backgroundColor: '#ffffff',
    padding: '0.22rem',
    borderRadius: '9px',
    border: '1px solid #e2e8f0',
  },
  togglePill: {
    padding: '0.26rem 0.6rem',
    borderRadius: '7px',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.14s ease',
  },
  subjectPill: {
    display: 'inline-block',
    padding: '0.24rem 0.68rem',
    borderRadius: '7px',
    fontWeight: 700,
    fontSize: '0.82rem',
  },
  cellInput: { padding: '0.45rem 0.68rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', minWidth: '135px', fontSize: '0.88rem', backgroundColor: '#ffffff' },
  saveRow: { marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.78rem 1.55rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.94rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.26)',
  },
  successBox: { backgroundColor: '#dcfce7', color: '#166534', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontWeight: 600, border: '1px solid #bbf7d0' },
  errorBox: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontWeight: 600, border: '1px solid #fecaca' },
  muted: { color: '#64748b', fontSize: '0.9rem', margin: 0 },
};
