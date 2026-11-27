import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle2, BookOpen, RefreshCw, LogOut, UserCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SUBJECT_COLORS = {
  Maths: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Science: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Social: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  English: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  Telugu: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  Hindi: { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
};

const getSubjectStyle = (subj) =>
  SUBJECT_COLORS[subj] || { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };

export default function PulseFeedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [childrenList, setChildrenList] = useState([]);
  const [activities, setActivities] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState(new Date());
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/activities/parent/feed');
      setChildrenList(res.data.children || []);
      setActivities(res.data.activities || []);
      setLastSynced(new Date());
    } catch (err) {
      if (!silent) setErrorMsg(err.response?.data?.error || 'Failed to load your Daily Pulse feed.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchFeed(false);
    }
  }, [user, fetchFeed]);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchFeed(true);
      }
    }, 10000);

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchFeed(true);
      }
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user, fetchFeed]);

  const getAttendanceBadge = (status) => {
    if (status === 'Present') return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
    if (status === 'Absent') return { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' };
    return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
  };

  const filteredActivities =
    subjectFilter === 'ALL'
      ? activities
      : activities.filter((a) => a.subject === subjectFilter);

  const groupedDays = Object.values(
    filteredActivities.reduce((acc, item) => {
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

  const allDaysMap = activities.reduce((acc, item) => {
    const key = `${String(item.activity_date).split('T')[0]}_${item.student_id}`;
    if (!acc[key]) acc[key] = item.attendance;
    return acc;
  }, {});
  const totalLoggedDays = Object.keys(allDaysMap).length;
  const presentDays = Object.values(allDaysMap).filter((status) => status === 'Present').length;
  const attendancePct = totalLoggedDays > 0 ? `${Math.round((presentDays / totalLoggedDays) * 100)}%` : '-';
  const hwCompletedCount = activities.filter((a) => a.homework_status === 'Completed').length;

  const uniqueSubjects = Array.from(new Set(activities.map((a) => a.subject).filter(Boolean)));

  return (
    <div style={styles.page}>
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <div style={styles.logoMark}>TP</div>
          <h1 style={styles.brand}>TuitPulse</h1>
          <span style={styles.badge}>Parent Portal</span>
          <span style={styles.livePill} title={`Auto-syncing every 10s - Last updated ${lastSynced.toLocaleTimeString()}`}>
            <span className="tp-live-dot" style={styles.liveDot} /> Live Feed
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
        {errorMsg && <div className="tp-animate-in" style={styles.errorBox}>{errorMsg}</div>}

        {childrenList.length > 0 && (
          <div style={styles.kpiGrid}>
            <div className="tp-card tp-animate-in" style={styles.kpiCard}>
              <div style={{ ...styles.kpiIcon, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                <UserCheck size={20} />
              </div>
              <div>
                <div style={styles.kpiValue}>{attendancePct}</div>
                <div style={styles.kpiLabel}>
                  {totalLoggedDays > 0 ? `Attendance (${presentDays}/${totalLoggedDays} days)` : 'No classes logged yet'}
                </div>
              </div>
            </div>

            <div className="tp-card tp-animate-in" style={styles.kpiCard}>
              <div style={{ ...styles.kpiIcon, backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <BookOpen size={20} />
              </div>
              <div>
                <div style={styles.kpiValue}>{hwCompletedCount}</div>
                <div style={styles.kpiLabel}>Homeworks Completed</div>
              </div>
            </div>

            <div className="tp-card tp-animate-in" style={styles.kpiCard}>
              <div style={{ ...styles.kpiIcon, backgroundColor: '#faf5ff', color: '#7e22ce' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={styles.kpiValue}>{activities.length}</div>
                <div style={styles.kpiLabel}>Total Subject Logs</div>
              </div>
            </div>
          </div>
        )}

        <section className="tp-card" style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h2 style={{ ...styles.cardTitle, margin: 0 }}>Linked Student & Weekly Timetable</h2>
            <button
              type="button"
              className="tp-btn"
              onClick={() => fetchFeed(false)}
              style={styles.iconGhostBtn}
              title="Sync now"
            >
              <RefreshCw size={15} />
            </button>
          </div>

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={styles.avatar}>{child.student_name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <span style={styles.childName}>{child.student_name}</span>
                        {child.grade && <span style={styles.gradeTag}>{child.grade}</span>}
                        <div style={styles.childSub}>
                          Teacher: <strong>{child.teacher_name}</strong>
                          {child.joined_date ? ` | Joined ${child.joined_date}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {Array.isArray(child.subjects) && child.subjects.length > 0 && (
                    <div style={styles.allSubjectsLine}>
                      Enrolled Subjects: <strong>{child.subjects.join(' | ')}</strong>
                    </div>
                  )}

                  <div style={styles.timetableGrid}>
                    {DAYS.map((day) => {
                      const daySubjects = (child.schedule || [])
                        .filter((s) => s.day_of_week === day)
                        .map((s) => s.subject);
                      return (
                        <div key={day} style={styles.dayBox}>
                          <div style={styles.dayLabel}>{day}</div>
                          {daySubjects.length === 0 ? (
                            <div style={styles.dayEmpty}>-</div>
                          ) : (
                            <div style={styles.dayPills}>
                              {daySubjects.map((sub) => {
                                const col = getSubjectStyle(sub);
                                return (
                                  <span
                                    key={sub}
                                    style={{
                                      ...styles.miniSubjectPill,
                                      backgroundColor: col.bg,
                                      color: col.text,
                                      border: `1px solid ${col.border}`,
                                    }}
                                  >
                                    {sub}
                                  </span>
                                );
                              })}
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

        <section className="tp-card" style={styles.card}>
          <div style={styles.timelineHeader}>
            <h2 style={{ ...styles.cardTitle, margin: 0 }}>Daily Pulse Timeline</h2>

            {uniqueSubjects.length > 0 && (
              <div style={styles.filterRow}>
                <button
                  type="button"
                  className="tp-btn"
                  onClick={() => setSubjectFilter('ALL')}
                  style={{
                    ...styles.filterChip,
                    ...(subjectFilter === 'ALL' ? styles.activeFilterChip : {}),
                  }}
                >
                  All Subjects
                </button>
                {uniqueSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    className="tp-btn"
                    onClick={() => setSubjectFilter(sub)}
                    style={{
                      ...styles.filterChip,
                      ...(subjectFilter === sub ? styles.activeFilterChip : {}),
                    }}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <p style={styles.muted}>Loading daily updates...</p>
          ) : groupedDays.length === 0 ? (
            <p style={styles.muted}>No daily updates logged yet. New updates appear automatically as soon as your teacher publishes them!</p>
          ) : (
            <div style={styles.feedList}>
              {groupedDays.map((group) => (
                <div key={group.key} className="tp-interactive-row" style={styles.feedItem}>
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

                  <div style={styles.subjectRowsWrap}>
                    {group.subjects.map((subItem) => {
                      const col = getSubjectStyle(subItem.subject);
                      return (
                        <div key={subItem.id} style={styles.subjectDetailCard}>
                          <div style={styles.subjectDetailTop}>
                            <span
                              style={{
                                ...styles.subjectBadge,
                                backgroundColor: col.bg,
                                color: col.text,
                                border: `1px solid ${col.border}`,
                              }}
                            >
                              {subItem.subject}
                            </span>
                            <div style={styles.subjectMetaPills}>
                              <span style={styles.hwPill}>
                                <CheckCircle2 size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                HW: <strong>{subItem.homework_status || 'Assigned'}</strong>
                              </span>
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
                      );
                    })}
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
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    padding: '0.22rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.76rem',
    fontWeight: 700,
  },
  livePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
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
  main: { maxWidth: '980px', margin: '0 auto', padding: '1.5rem' },
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
  card: {
    padding: '1.45rem',
    marginBottom: '1.25rem',
  },
  cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  cardTitle: { margin: '0 0 1rem', fontSize: '1.14rem', fontWeight: 700, color: '#0f172a' },
  iconGhostBtn: {
    padding: '0.38rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    color: '#475569',
    display: 'inline-flex',
  },
  childStack: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  childCard: {
    padding: '1.15rem',
    borderRadius: '14px',
    border: '1px solid #dbeafe',
    backgroundColor: '#f8fafc',
  },
  childHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    color: '#1d4ed8',
    fontWeight: 800,
    fontSize: '0.88rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  childName: { fontWeight: 700, fontSize: '1.08rem', color: '#1e3a8a' },
  gradeTag: {
    marginLeft: '0.5rem',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    padding: '0.15rem 0.52rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  childSub: { fontSize: '0.83rem', color: '#475569', marginTop: '0.15rem' },
  allSubjectsLine: { fontSize: '0.84rem', color: '#1e40af', marginTop: '0.6rem', marginBottom: '0.75rem' },
  timetableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
    gap: '0.5rem',
  },
  dayBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '0.55rem',
    textAlign: 'center',
  },
  dayLabel: { fontSize: '0.73rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' },
  dayEmpty: { fontSize: '0.8rem', color: '#94a3b8' },
  dayPills: { display: 'flex', flexDirection: 'column', gap: '0.28rem' },
  miniSubjectPill: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.2rem 0.35rem',
    borderRadius: '6px',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  filterChip: {
    padding: '0.3rem 0.7rem',
    borderRadius: '999px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  activeFilterChip: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    borderColor: '#2563eb',
  },
  feedList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  feedItem: {
    padding: '1.15rem',
    borderRadius: '14px',
    border: '1.5px solid #e2e8f0',
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
    padding: '0.22rem 0.58rem',
    borderRadius: '7px',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginRight: '0.6rem',
  },
  feedTitle: { fontSize: '1.02rem', color: '#0f172a' },
  statusPill: {
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  subjectRowsWrap: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  subjectDetailCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.75rem 0.95rem',
  },
  subjectDetailTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  subjectBadge: {
    padding: '0.22rem 0.68rem',
    borderRadius: '7px',
    fontSize: '0.82rem',
    fontWeight: 700,
  },
  subjectMetaPills: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  hwPill: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    padding: '0.22rem 0.58rem',
    borderRadius: '7px',
    fontSize: '0.82rem',
    color: '#334155',
  },
  scorePill: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    padding: '0.22rem 0.58rem',
    borderRadius: '7px',
    fontSize: '0.82rem',
    color: '#166534',
  },
  remarkText: {
    marginTop: '0.55rem',
    fontSize: '0.86rem',
    color: '#854d0e',
    backgroundColor: '#fefce8',
    padding: '0.48rem 0.7rem',
    borderRadius: '8px',
    border: '1px solid #fef08a',
  },
  errorBox: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontWeight: 600, border: '1px solid #fecaca' },
  muted: { color: '#64748b', fontSize: '0.9rem', margin: 0 },
};
