import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PulseFeedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [childrenList, setChildrenList] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await api.get('/activities/parent/feed');
        setChildrenList(res.data.children || []);
        setActivities(res.data.activities || []);
      } catch (err) {
        setErrorMsg(err.response?.data?.error || 'Failed to load your Daily Pulse feed.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchFeed();
    }
  }, [user]);

  const getAttendanceBadge = (status) => {
    if (status === 'Present') return { backgroundColor: '#dcfce7', color: '#166534' };
    if (status === 'Absent') return { backgroundColor: '#fee2e2', color: '#b91c1c' };
    return { backgroundColor: '#fef3c7', color: '#b45309' };
  };

  // Group subject activity logs by Date + Student for clean daily summary cards
  const groupedDays = Object.values(
    activities.reduce((acc, item) => {
      const dateKey = String(item.activity_date).split('T')[0];
      const key = `${dateKey}_${item.student_id}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          activity_date: item.activity_date,
          student_name: item.student_name,
          grade: item.grade,
          teacher_name: item.teacher_name,
          attendance: item.attendance,
          subjects: [],
        };
      }
      acc[key].subjects.push(item);
      return acc;
    }, {})
  );

  return (
    <div style={styles.page}>
      <header style={styles.navbar}>
        <div>
          <h1 style={styles.brand}>TuitPulse</h1>
          <span style={styles.badge}>Parent Portal</span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.userName}>{user?.full_name}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

        {/* Linked Children & Recurring Weekly Subject Timetable */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Linked Student & Weekly Subject Timetable</h2>
          {loading ? (
            <p style={styles.muted}>Checking linked student profiles...</p>
          ) : childrenList.length === 0 ? (
            <p style={styles.muted}>
              No student profiles linked to <strong>{user?.mobile}</strong> yet. Once your child's teacher adds this mobile number, updates will appear here automatically.
            </p>
          ) : (
            <div style={styles.childStack}>
              {childrenList.map((child) => (
                <div key={child.student_id} style={styles.childCard}>
                  <div style={styles.childHeader}>
                    <div>
                      <span style={styles.childName}>{child.student_name}</span>
                      {child.grade && <span style={styles.gradeTag}>{child.grade}</span>}
                    </div>
                    <div style={styles.childSub}>Teacher: <strong>{child.teacher_name}</strong></div>
                  </div>

                  {Array.isArray(child.subjects) && child.subjects.length > 0 && (
                    <div style={styles.allSubjectsLine}>
                      Enrolled Subjects: <strong>{child.subjects.join(', ')}</strong>
                    </div>
                  )}

                  {/* Mon-Sun Subject Timetable Strip */}
                  <div style={styles.timetableGrid}>
                    {DAYS.map((day) => {
                      const daySubjects = (child.schedule || [])
                        .filter((s) => s.day_of_week === day)
                        .map((s) => s.subject);
                      return (
                        <div key={day} style={styles.dayBox}>
                          <div style={styles.dayLabel}>{day}</div>
                          {daySubjects.length === 0 ? (
                            <div style={styles.dayEmpty}>—</div>
                          ) : (
                            <div style={styles.dayPills}>
                              {daySubjects.map((sub) => (
                                <span key={sub} style={styles.miniSubjectPill}>{sub}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Subject-Wise Daily Pulse Timeline */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Daily Pulse Timeline</h2>
          {loading ? (
            <p style={styles.muted}>Loading daily updates...</p>
          ) : groupedDays.length === 0 ? (
            <p style={styles.muted}>No daily updates logged yet. Check back after today's tuition session!</p>
          ) : (
            <div style={styles.feedList}>
              {groupedDays.map((group) => (
                <div key={group.key} style={styles.feedItem}>
                  <div style={styles.feedTop}>
                    <div>
                      <span style={styles.dateTag}>
                        {new Date(group.activity_date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <strong style={styles.feedTitle}>{group.student_name}</strong>
                      {group.grade && <span style={styles.gradeTag}>{group.grade}</span>}
                    </div>
                    <span style={{ ...styles.statusPill, ...getAttendanceBadge(group.attendance) }}>
                      {group.attendance}
                    </span>
                  </div>

                  {/* Subject-by-Subject Rows */}
                  <div style={styles.subjectRowsWrap}>
                    {group.subjects.map((subItem) => (
                      <div key={subItem.id} style={styles.subjectDetailCard}>
                        <div style={styles.subjectDetailTop}>
                          <span style={styles.subjectBadge}>{subItem.subject}</span>
                          <div style={styles.subjectMetaPills}>
                            <span style={styles.hwPill}>HW: <strong>{subItem.homework_status || 'Assigned'}</strong></span>
                            {subItem.test_score && (
                              <span style={styles.scorePill}>Test: <strong>{subItem.test_score}</strong></span>
                            )}
                          </div>
                        </div>
                        {subItem.teacher_remark && (
                          <div style={styles.remarkText}>
                            <strong>Remark:</strong> {subItem.teacher_remark}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    padding: '0.25rem 0.65rem',
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
  main: { maxWidth: '980px', margin: '0 auto', padding: '1.5rem' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    marginBottom: '1.25rem',
  },
  cardTitle: { margin: '0 0 1rem', fontSize: '1.15rem', color: '#0f172a' },
  childStack: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  childCard: {
    padding: '1.1rem',
    borderRadius: '10px',
    border: '1px solid #dbeafe',
    backgroundColor: '#eff6ff',
  },
  childHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' },
  childName: { fontWeight: 700, fontSize: '1.1rem', color: '#1e3a8a' },
  gradeTag: {
    marginLeft: '0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  childSub: { fontSize: '0.85rem', color: '#475569' },
  allSubjectsLine: { fontSize: '0.85rem', color: '#1e40af', marginTop: '0.4rem', marginBottom: '0.75rem' },
  timetableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
    gap: '0.5rem',
  },
  dayBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.5rem',
    textAlign: 'center',
  },
  dayLabel: { fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' },
  dayEmpty: { fontSize: '0.8rem', color: '#94a3b8' },
  dayPills: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  miniSubjectPill: {
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '0.76rem',
    fontWeight: 600,
    padding: '0.15rem 0.35rem',
    borderRadius: '4px',
  },
  feedList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  feedItem: {
    padding: '1.1rem',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
  },
  feedTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '0.85rem',
  },
  dateTag: {
    display: 'inline-block',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '0.2rem 0.55rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginRight: '0.6rem',
  },
  feedTitle: { fontSize: '1.02rem', color: '#0f172a' },
  statusPill: {
    padding: '0.25rem 0.7rem',
    borderRadius: '999px',
    fontSize: '0.82rem',
    fontWeight: 700,
  },
  subjectRowsWrap: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  subjectDetailCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
  },
  subjectDetailTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  subjectBadge: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: 700,
  },
  subjectMetaPills: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  hwPill: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    padding: '0.2rem 0.55rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
    color: '#334155',
  },
  scorePill: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    padding: '0.2rem 0.55rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
    color: '#166534',
  },
  remarkText: {
    marginTop: '0.5rem',
    fontSize: '0.86rem',
    color: '#854d0e',
    backgroundColor: '#fefce8',
    padding: '0.45rem 0.65rem',
    borderRadius: '6px',
  },
  errorBox: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 500 },
  muted: { color: '#64748b', fontSize: '0.92rem', margin: 0 },
};
