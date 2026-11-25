import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function PulseFeedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [childrenList, setChildrenList] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const isParent = user?.role === 'parent';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const endpoint = isParent ? '/activities/parent/feed' : '/activities/student/feed';
        const res = await api.get(endpoint);
        if (isParent) {
          setChildrenList(res.data.children || []);
        }
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
  }, [user, isParent]);

  const getAttendanceBadge = (status) => {
    if (status === 'Present') return { backgroundColor: '#dcfce7', color: '#166534' };
    if (status === 'Absent') return { backgroundColor: '#fee2e2', color: '#b91c1c' };
    return { backgroundColor: '#fef3c7', color: '#b45309' };
  };

  return (
    <div style={styles.page}>
      <header style={styles.navbar}>
        <div>
          <h1 style={styles.brand}>TuitPulse</h1>
          <span style={styles.badge}>
            {isParent ? 'Parent Portal' : 'Student Portal'}
          </span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.userName}>{user?.full_name}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

        {/* Parent-specific: Auto-linked Children & Batch Overview */}
        {isParent && (
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Linked Students & Active Batches</h2>
            {loading ? (
              <p style={styles.muted}>Checking linked student profiles...</p>
            ) : childrenList.length === 0 ? (
              <p style={styles.muted}>
                No student profiles linked to <strong>{user?.mobile}</strong> yet. Once your child's teacher adds this mobile number to a batch, updates will appear here automatically.
              </p>
            ) : (
              <div style={styles.childGrid}>
                {childrenList.map((child) => (
                  <div key={`${child.student_id}-${child.batch_id}`} style={styles.childCard}>
                    <div style={styles.childName}>{child.student_name}</div>
                    <div style={styles.childMeta}>
                      <strong>{child.batch_name}</strong> {child.subject ? `• ${child.subject}` : ''}
                    </div>
                    <div style={styles.childSub}>
                      Teacher: {child.teacher_name} {child.timing ? `• ${child.timing}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Daily Pulse Timeline */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Daily Pulse Timeline</h2>
          {loading ? (
            <p style={styles.muted}>Loading daily updates...</p>
          ) : activities.length === 0 ? (
            <p style={styles.muted}>No daily updates logged yet. Check back after today's class!</p>
          ) : (
            <div style={styles.feedList}>
              {activities.map((item) => (
                <div key={item.id} style={styles.feedItem}>
                  <div style={styles.feedTop}>
                    <div>
                      <span style={styles.dateTag}>
                        {new Date(item.activity_date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <strong style={styles.feedTitle}>
                        {isParent ? `${item.student_name} — ` : ''}
                        {item.batch_name}
                      </strong>
                      {item.subject && <span style={styles.subjectTag}>{item.subject}</span>}
                    </div>
                    <span style={{ ...styles.statusPill, ...getAttendanceBadge(item.attendance) }}>
                      {item.attendance}
                    </span>
                  </div>

                  <div style={styles.metricsRow}>
                    <div style={styles.metricBox}>
                      <span style={styles.metricLabel}>Homework</span>
                      <span style={styles.metricVal}>{item.homework_status || 'Assigned'}</span>
                    </div>
                    <div style={styles.metricBox}>
                      <span style={styles.metricLabel}>Test Score</span>
                      <span style={styles.metricVal}>{item.test_score || '—'}</span>
                    </div>
                    <div style={styles.metricBox}>
                      <span style={styles.metricLabel}>Teacher</span>
                      <span style={styles.metricVal}>{item.teacher_name}</span>
                    </div>
                  </div>

                  {item.teacher_remark && (
                    <div style={styles.remarkBox}>
                      <strong>Teacher Remark:</strong> {item.teacher_remark}
                    </div>
                  )}
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
  main: { maxWidth: '960px', margin: '0 auto', padding: '1.5rem' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    marginBottom: '1.25rem',
  },
  cardTitle: { margin: '0 0 1rem', fontSize: '1.15rem', color: '#0f172a' },
  childGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.85rem' },
  childCard: {
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid #dbeafe',
    backgroundColor: '#eff6ff',
  },
  childName: { fontWeight: 700, fontSize: '1.05rem', color: '#1e3a8a' },
  childMeta: { fontSize: '0.9rem', color: '#1e40af', marginTop: '0.25rem' },
  childSub: { fontSize: '0.82rem', color: '#475569', marginTop: '0.25rem' },
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
  feedTitle: { fontSize: '1rem', color: '#0f172a' },
  subjectTag: {
    marginLeft: '0.5rem',
    fontSize: '0.8rem',
    color: '#2563eb',
    fontWeight: 600,
  },
  statusPill: {
    padding: '0.25rem 0.7rem',
    borderRadius: '999px',
    fontSize: '0.82rem',
    fontWeight: 700,
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    backgroundColor: '#f8fafc',
    padding: '0.75rem',
    borderRadius: '8px',
  },
  metricBox: { display: 'flex', flexDirection: 'column' },
  metricLabel: { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' },
  metricVal: { fontSize: '0.92rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' },
  remarkBox: {
    marginTop: '0.75rem',
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    backgroundColor: '#fefce8',
    color: '#854d0e',
    fontSize: '0.88rem',
  },
  errorBox: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 500 },
  muted: { color: '#64748b', fontSize: '0.92rem', margin: 0 },
};