import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Batches state
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [subject, setSubject] = useState('');
  const [timing, setTiming] = useState('');

  // Students & Daily Pulse state
  const [students, setStudents] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [studentMobile, setStudentMobile] = useState('');
  const [parentMobile, setParentMobile] = useState('');

  // Daily activity log state
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pulseEntries, setPulseEntries] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [savingPulse, setSavingPulse] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Fetch teacher's batches on load
  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      setBatches(res.data.batches);
      if (res.data.batches.length > 0 && !selectedBatch) {
        setSelectedBatch(res.data.batches[0]);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to load batches.');
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Fetch students & daily pulse entries whenever selectedBatch or activityDate changes
  const fetchBatchPulse = async (batchId, dateStr) => {
    if (!batchId) return;
    try {
      const [studentsRes, pulseRes] = await Promise.all([
        api.get(`/batches/${batchId}/students`),
        api.get(`/activities/batch/${batchId}?date=${dateStr}`),
      ]);
      setStudents(studentsRes.data.students);
      setPulseEntries(
        pulseRes.data.entries.map((entry) => ({
          student_id: entry.student_id,
          student_name: entry.student_name,
          attendance: entry.attendance || 'Present',
          homework_status: entry.homework_status || 'Assigned',
          test_score: entry.test_score || '',
          teacher_remark: entry.teacher_remark || '',
        }))
      );
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to load batch details.');
    }
  };

  useEffect(() => {
    if (selectedBatch) {
      fetchBatchPulse(selectedBatch.id, activityDate);
    }
  }, [selectedBatch, activityDate]);

  // Create a new batch
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await api.post('/batches', {
        batch_name: batchName,
        subject,
        timing,
      });
      setBatchName('');
      setSubject('');
      setTiming('');
      setStatusMsg('Batch created successfully!');
      await fetchBatches();
      setSelectedBatch(res.data.batch);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error creating batch.');
    }
  };

  // Add a student to the active batch
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await api.post(`/batches/${selectedBatch.id}/students`, {
        student_name: studentName,
        student_mobile: studentMobile,
        parent_mobile: parentMobile,
      });
      setStudentName('');
      setStudentMobile('');
      setParentMobile('');
      setStatusMsg(
        res.data.parentLinked
          ? 'Student added and automatically linked to registered Parent!'
          : 'Student added! Parent will auto-link when they register with their mobile.'
      );
      await fetchBatches();
      await fetchBatchPulse(selectedBatch.id, activityDate);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error adding student.');
    }
  };

  // Update a field in the daily pulse table
  const handleEntryChange = (studentId, field, value) => {
    setPulseEntries((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, [field]: value } : item))
    );
  };

  // Save all daily pulse entries for the active batch
  const handleSavePulse = async () => {
    if (!selectedBatch || pulseEntries.length === 0) return;
    setSavingPulse(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await api.post('/activities/bulk', {
        batch_id: selectedBatch.id,
        activity_date: activityDate,
        entries: pulseEntries,
      });
      setStatusMsg(res.data.message);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save daily pulse.');
    } finally {
      setSavingPulse(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <header style={styles.navbar}>
        <div>
          <h1 style={styles.brand}>TuitPulse</h1>
          <span style={styles.badge}>Teacher Portal</span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.userName}>Welcome, {user?.full_name}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        {statusMsg && <div style={styles.successBox}>{statusMsg}</div>}
        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

        {/* Section 1: Create Batch + Select Batch */}
        <div style={styles.gridTwo}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Create New Batch</h2>
            <form onSubmit={handleCreateBatch} style={styles.formCol}>
              <input
                type="text"
                placeholder="Batch Name (e.g., Class 10 Maths)"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                required
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Subject (e.g., Mathematics)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Timing (e.g., Mon-Fri 5:00 PM)"
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.primaryBtn}>+ Create Batch</button>
            </form>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Your Batches ({batches.length})</h2>
            {batches.length === 0 ? (
              <p style={styles.muted}>No batches yet. Create your first batch on the left!</p>
            ) : (
              <div style={styles.batchList}>
                {batches.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBatch(b)}
                    style={{
                      ...styles.batchItem,
                      ...(selectedBatch?.id === b.id ? styles.activeBatchItem : {}),
                    }}
                  >
                    <div>
                      <strong>{b.batch_name}</strong>
                      <div style={styles.smallText}>
                        {b.subject || 'General'} {b.timing ? `• ${b.timing}` : ''}
                      </div>
                    </div>
                    <span style={styles.countPill}>{b.student_count} students</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Section 2: Active Batch Roster & Daily Pulse Logger */}
        {selectedBatch && (
          <>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Add Student to {selectedBatch.batch_name}</h2>
              <form onSubmit={handleAddStudent} style={styles.inlineForm}>
                <input
                  type="text"
                  placeholder="Student Full Name *"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
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
                <input
                  type="tel"
                  placeholder="Student Mobile (optional)"
                  value={studentMobile}
                  onChange={(e) => setStudentMobile(e.target.value)}
                  style={styles.input}
                />
                <button type="submit" style={styles.primaryBtn}>+ Add Student</button>
              </form>
            </section>

            <section style={styles.card}>
              <div style={styles.pulseHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Daily Pulse Log — {selectedBatch.batch_name}</h2>
                  <p style={styles.muted}>Mark attendance, homework, test scores, and remarks for the batch.</p>
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

              {pulseEntries.length === 0 ? (
                <p style={styles.muted}>Add students to this batch above to start logging daily progress.</p>
              ) : (
                <>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Student</th>
                          <th style={styles.th}>Attendance</th>
                          <th style={styles.th}>Homework</th>
                          <th style={styles.th}>Test Score</th>
                          <th style={styles.th}>Teacher Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pulseEntries.map((entry) => (
                          <tr key={entry.student_id} style={styles.tr}>
                            <td style={styles.td}><strong>{entry.student_name}</strong></td>
                            <td style={styles.td}>
                              <select
                                value={entry.attendance}
                                onChange={(e) => handleEntryChange(entry.student_id, 'attendance', e.target.value)}
                                style={styles.select}
                              >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Late">Late</option>
                              </select>
                            </td>
                            <td style={styles.td}>
                              <select
                                value={entry.homework_status}
                                onChange={(e) => handleEntryChange(entry.student_id, 'homework_status', e.target.value)}
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
                                value={entry.test_score}
                                onChange={(e) => handleEntryChange(entry.student_id, 'test_score', e.target.value)}
                                style={styles.cellInput}
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                type="text"
                                placeholder="e.g., Great focus today"
                                value={entry.teacher_remark}
                                onChange={(e) => handleEntryChange(entry.student_id, 'teacher_remark', e.target.value)}
                                style={styles.cellInput}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={styles.saveRow}>
                    <button
                      type="button"
                      onClick={handleSavePulse}
                      disabled={savingPulse}
                      style={styles.saveBtn}
                    >
                      {savingPulse ? 'Saving Daily Pulse...' : `Save Daily Pulse (${pulseEntries.length} Students)`}
                    </button>
                  </div>
                </>
              )}
            </section>
          </>
        )}
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
  main: { maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' },
  gridTwo: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    marginBottom: '1.25rem',
  },
  cardTitle: { margin: '0 0 1rem', fontSize: '1.15rem', color: '#0f172a' },
  formCol: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  inlineForm: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' },
  input: { padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem' },
  primaryBtn: {
    padding: '0.65rem 1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  batchList: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  batchItem: {
    padding: '0.8rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  activeBatchItem: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  smallText: { fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' },
  countPill: { backgroundColor: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 },
  pulseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' },
  datePickerRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  label: { fontWeight: 600, fontSize: '0.9rem', color: '#334155' },
  dateInput: { padding: '0.45rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '0.75rem', borderBottom: '2px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.7rem 0.75rem', fontSize: '0.92rem' },
  select: { padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' },
  cellInput: { padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', minWidth: '120px' },
  saveRow: { marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' },
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
