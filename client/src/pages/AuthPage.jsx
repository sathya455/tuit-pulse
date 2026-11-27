import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Users, Eye, EyeOff, CheckCircle2,
  Sparkles, Calendar, ShieldCheck, ArrowRight, MessageCircle,
  BookOpen, Clock, Check
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PREVIEW_SAMPLES = {
  Maths: {
    hw: 'Completed',
    score: '19 / 20',
    remark: 'Mastered linear equations & word problems with zero errors.',
    accent: '#38bdf8',
    days: ['Mon', 'Wed', 'Fri'],
  },
  Science: {
    hw: 'Assigned',
    score: '18 / 20',
    remark: 'Great diagram accuracy on Light Reflection & Refraction.',
    accent: '#34d399',
    days: ['Tue', 'Thu', 'Sat'],
  },
  Social: {
    hw: 'Completed',
    score: '17 / 20',
    remark: 'Strong recall on Indian Constitution & civics chapters.',
    accent: '#fbbf24',
    days: ['Wed', 'Sat'],
  },
};

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Set Student & Weekly Subjects',
    desc: 'Link parent mobile & pick Mon-Sun subjects once.',
  },
  {
    step: '02',
    title: 'Log Daily Class Pulse',
    desc: 'Mark attendance, homework & test scores in 30 seconds.',
  },
  {
    step: '03',
    title: 'Live Sync & WhatsApp',
    desc: 'Parents view updates live or receive 1-tap reports.',
  },
];

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('teacher');

  // Interactive landing showcase states
  const [previewMode, setPreviewMode] = useState('parent'); // 'parent' | 'teacher'
  const [previewSubj, setPreviewSubj] = useState('Maths');
  const [demoAttendance, setDemoAttendance] = useState('Present');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = (userRole) => {
    navigate(userRole === 'teacher' ? '/teacher' : '/parent');
  };

  const handleMobileChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(digitsOnly);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister
        ? { full_name: fullName.trim(), mobile, password, role }
        : { mobile, password };

      const res = await api.post(endpoint, payload);
      login(res.data.user, res.data.token);
      redirectByRole(res.data.user.role);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activeSample = PREVIEW_SAMPLES[previewSubj];
  const passwordStrength =
    password.length === 0 ? '' : password.length < 6 ? 'Weak (min 6 chars)' : password.length < 10 ? 'Good' : 'Strong';

  return (
    <div className="tp-auth-shell">
      {/* Left Interactive Product Showcase */}
      <aside className="tp-auth-hero" style={styles.heroPanel}>
        <div style={styles.heroGlowTop} />
        <div style={styles.heroGlowBottom} />

        <div style={styles.heroInner}>
          <div style={styles.topBadgeRow}>
            <span style={styles.heroPill}>
              <Sparkles size={14} /> Real-Time Home Tuition OS
            </span>
            <span style={styles.liveTag}>
              <span className="tp-live-dot" style={styles.liveDot} /> Live Parent Sync
            </span>
          </div>

          <h1 style={styles.heroTitle}>
            Every tuition session, <br />
            <span style={styles.heroHighlight}>crystal clear</span> to parents.
          </h1>

          <p style={styles.heroCopy}>
            Replace scattered WhatsApp texts and paper notebooks with structured weekly subject timetables, instant daily progress logs, and auto-linked parent feeds.
          </p>

          {/* Interactive Live Product Sandbox */}
          <div style={styles.previewCard}>
            <div style={styles.previewHeader}>
              <div>
                <div style={styles.previewStudent}>Aarav Sharma - Class 8</div>
                <div style={styles.previewMeta}>Click below to test both portal experiences</div>
              </div>

              {/* Toggle between Parent Feed View & Teacher Quick-Log View */}
              <div style={styles.modeSwitch}>
                <button
                  type="button"
                  onClick={() => setPreviewMode('parent')}
                  style={{
                    ...styles.modeBtn,
                    ...(previewMode === 'parent' ? styles.modeBtnActive : {}),
                  }}
                >
                  Parent View
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('teacher')}
                  style={{
                    ...styles.modeBtn,
                    ...(previewMode === 'teacher' ? styles.modeBtnActive : {}),
                  }}
                >
                  Teacher View
                </button>
              </div>
            </div>

            {/* Subject Selector Pills */}
            <div style={styles.previewTabs}>
              {Object.keys(PREVIEW_SAMPLES).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setPreviewSubj(sub)}
                  style={{
                    ...styles.previewTabBtn,
                    ...(previewSubj === sub ? styles.previewTabBtnActive : {}),
                  }}
                >
                  {sub}
                </button>
              ))}
            </div>

            {previewMode === 'parent' ? (
              <>
                <div style={styles.previewMetrics}>
                  <div style={styles.previewStatBox}>
                    <span style={styles.previewStatLabel}>Attendance</span>
                    <span style={{ ...styles.previewStatVal, color: '#6ee7b7' }}>
                      {demoAttendance} (96%)
                    </span>
                  </div>
                  <div style={styles.previewStatBox}>
                    <span style={styles.previewStatLabel}>Homework</span>
                    <span style={{ ...styles.previewStatVal, color: activeSample.accent }}>
                      {activeSample.hw}
                    </span>
                  </div>
                  <div style={styles.previewStatBox}>
                    <span style={styles.previewStatLabel}>Weekly Test</span>
                    <span style={styles.previewStatVal}>{activeSample.score}</span>
                  </div>
                </div>

                <div style={styles.previewRemark}>
                  "{activeSample.remark}"
                </div>
              </>
            ) : (
              <div style={styles.teacherSandbox}>
                <div style={styles.sandboxRow}>
                  <span style={styles.sandboxLabel}>1-Tap Attendance:</span>
                  <div style={styles.sandboxPills}>
                    {['Present', 'Late', 'Absent'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setDemoAttendance(status)}
                        style={{
                          ...styles.attPill,
                          ...(demoAttendance === status ? styles.attPillActive : {}),
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.sandboxRow}>
                  <span style={styles.sandboxLabel}>{previewSubj} Schedule:</span>
                  <div style={styles.sandboxDays}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => {
                      const active = activeSample.days.includes(d);
                      return (
                        <span
                          key={d}
                          style={{
                            ...styles.dayChip,
                            ...(active ? styles.dayChipActive : {}),
                          }}
                        >
                          {d}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3-Step Workflow Strip */}
          <div style={styles.stepsGrid}>
            {WORKFLOW_STEPS.map((item) => (
              <div key={item.step} style={styles.stepCard}>
                <div style={styles.stepNum}>{item.step}</div>
                <div style={styles.stepTitle}>{item.title}</div>
                <div style={styles.stepDesc}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Right Authentication Form */}
      <main style={styles.authSide}>
        <div className="tp-card tp-animate-in" style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoMark}>TP</div>
            <h2 style={styles.logo}>TuitPulse</h2>
            <p style={styles.subtitle}>
              {isRegister
                ? 'Set up your Teacher Studio or Parent Portal in seconds'
                : 'Welcome back! Sign in with your registered mobile'}
            </p>
          </div>

          <div style={styles.tabRow}>
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              style={{ ...styles.tab, ...(isRegister ? {} : styles.activeTab) }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              style={{ ...styles.tab, ...(isRegister ? styles.activeTab : {}) }}
            >
              Create Account
            </button>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            {isRegister && (
              <>
                <label style={styles.label}>I am registering as a...</label>
                <div style={styles.roleGrid}>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    style={{
                      ...styles.roleCard,
                      ...(role === 'teacher' ? styles.activeRoleCard : {}),
                    }}
                  >
                    <div style={styles.roleCardTop}>
                      <GraduationCap size={20} color={role === 'teacher' ? '#2563eb' : '#64748b'} />
                      {role === 'teacher' && <CheckCircle2 size={16} color="#2563eb" />}
                    </div>
                    <div style={styles.roleTitle}>Teacher</div>
                    <div style={styles.roleDesc}>Manage students & daily logs</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('parent')}
                    style={{
                      ...styles.roleCard,
                      ...(role === 'parent' ? styles.activeRoleCard : {}),
                    }}
                  >
                    <div style={styles.roleCardTop}>
                      <Users size={20} color={role === 'parent' ? '#2563eb' : '#64748b'} />
                      {role === 'parent' && <CheckCircle2 size={16} color="#2563eb" />}
                    </div>
                    <div style={styles.roleTitle}>Parent</div>
                    <div style={styles.roleDesc}>Track child's live progress</div>
                  </button>
                </div>

                {role === 'parent' && (
                  <div style={styles.infoNote}>
                    Use the same 10-digit mobile number your child's teacher added—your child's profile links automatically!
                  </div>
                )}

                <label style={styles.label}>Full Name</label>
                <input
                  type="text"
                  className="tp-input"
                  placeholder={role === 'teacher' ? 'e.g., Sathya S' : 'e.g., Rajesh Sharma'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={styles.input}
                />
              </>
            )}

            <div style={styles.labelRow}>
              <label style={{ ...styles.label, marginBottom: 0 }}>Mobile Number</label>
              <span
                style={{
                  ...styles.digitCounter,
                  color: mobile.length === 10 ? '#16a34a' : '#64748b',
                }}
              >
                {mobile.length}/10 digits
              </span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              className="tp-input"
              placeholder="Enter 10-digit mobile number"
              value={mobile}
              onChange={handleMobileChange}
              required
              style={styles.input}
            />

            <div style={styles.labelRow}>
              <label style={{ ...styles.label, marginBottom: 0 }}>Password</label>
              {isRegister && passwordStrength && (
                <span
                  style={{
                    ...styles.digitCounter,
                    color: password.length >= 6 ? '#16a34a' : '#d97706',
                  }}
                >
                  {passwordStrength}
                </span>
              )}
            </div>
            <div style={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="tp-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...styles.input, marginBottom: 0, paddingRight: '2.6rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={styles.eyeBtn}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="tp-btn" style={styles.submitBtn}>
              {loading
                ? 'Authenticating...'
                : isRegister
                  ? `Create ${role === 'teacher' ? 'Teacher' : 'Parent'} Account`
                  : 'Continue to Portal'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div style={styles.trustBar}>
            <span style={styles.trustItem}><ShieldCheck size={14} color="#16a34a" /> JWT Secured</span>
            <span style={styles.trustItem}><MessageCircle size={14} color="#2563eb" /> WhatsApp Ready</span>
            <span style={styles.trustItem}><Calendar size={14} color="#7c3aed" /> Live Sync</span>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  heroPanel: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(145deg, #0b1120 0%, #1e3a8a 52%, #1d4ed8 100%)',
    color: '#ffffff',
    padding: '2.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlowTop: {
    position: 'absolute',
    top: '-120px',
    right: '-90px',
    width: '360px',
    height: '360px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(96,165,250,0.3) 0%, transparent 70%)',
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: '-140px',
    left: '-100px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 70%)',
  },
  heroInner: { position: 'relative', zIndex: 2, maxWidth: '530px', width: '100%' },
  topBadgeRow: { display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.2rem' },
  heroPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.22)',
    padding: '0.35rem 0.85rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 600,
  },
  liveTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    color: '#6ee7b7',
    padding: '0.35rem 0.8rem',
    borderRadius: '999px',
    fontSize: '0.76rem',
    fontWeight: 700,
  },
  liveDot: { width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#34d399' },
  heroTitle: {
    margin: '0 0 0.9rem',
    fontSize: '2.45rem',
    fontWeight: 800,
    lineHeight: 1.14,
    letterSpacing: '-0.03em',
  },
  heroHighlight: { color: '#93c5fd' },
  heroCopy: {
    margin: '0 0 1.75rem',
    fontSize: '0.96rem',
    lineHeight: 1.6,
    color: '#cbd5e1',
  },
  previewCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '18px',
    padding: '1.3rem',
    boxShadow: '0 24px 48px rgba(0,0,0,0.28)',
    marginBottom: '1.4rem',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.6rem',
    marginBottom: '0.95rem',
  },
  previewStudent: { fontWeight: 700, fontSize: '1rem', color: '#f8fafc' },
  previewMeta: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.12rem' },
  modeSwitch: {
    display: 'inline-flex',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: '0.22rem',
    borderRadius: '9px',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  modeBtn: {
    padding: '0.28rem 0.65rem',
    borderRadius: '7px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modeBtnActive: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  previewTabs: { display: 'flex', gap: '0.45rem', marginBottom: '0.95rem' },
  previewTabBtn: {
    padding: '0.35rem 0.8rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#cbd5e1',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  previewTabBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa',
    color: '#ffffff',
  },
  previewMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.6rem',
    marginBottom: '0.85rem',
  },
  previewStatBox: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: '10px',
    padding: '0.6rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
  },
  previewStatLabel: { fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8' },
  previewStatVal: { fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginTop: '0.15rem' },
  previewRemark: {
    fontSize: '0.83rem',
    color: '#e2e8f0',
    fontStyle: 'italic',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    borderLeft: '3px solid #60a5fa',
  },
  teacherSandbox: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  sandboxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '0.65rem 0.8rem',
    borderRadius: '10px',
  },
  sandboxLabel: { fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' },
  sandboxPills: { display: 'flex', gap: '0.35rem' },
  attPill: {
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    fontSize: '0.76rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  attPillActive: {
    backgroundColor: '#10b981',
    borderColor: '#34d399',
    color: '#064e3b',
    fontWeight: 700,
  },
  sandboxDays: { display: 'flex', gap: '0.3rem', flexWrap: 'wrap' },
  dayChip: {
    padding: '0.2rem 0.45rem',
    borderRadius: '5px',
    fontSize: '0.72rem',
    fontWeight: 600,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#94a3b8',
  },
  dayChipActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
  },
  stepCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    padding: '0.85rem',
  },
  stepNum: { fontSize: '0.72rem', fontWeight: 800, color: '#93c5fd', marginBottom: '0.25rem' },
  stepTitle: { fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' },
  stepDesc: { fontSize: '0.74rem', color: '#cbd5e1', lineHeight: 1.4 },
  authSide: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.75rem',
    backgroundColor: '#f4f7fb',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '2.1rem',
  },
  header: { textAlign: 'center', marginBottom: '1.4rem' },
  logoMark: {
    width: '46px',
    height: '46px',
    margin: '0 auto 0.65rem',
    borderRadius: '13px',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '1.08rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(37, 99, 235, 0.28)',
  },
  logo: { margin: 0, fontSize: '1.7rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' },
  subtitle: { margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#64748b' },
  tabRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.4rem',
    backgroundColor: '#f1f5f9',
    padding: '0.32rem',
    borderRadius: '11px',
    marginBottom: '1.25rem',
  },
  tab: {
    padding: '0.55rem',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    padding: '0.75rem 0.9rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginBottom: '1rem',
  },
  form: { display: 'flex', flexDirection: 'column' },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.35rem',
  },
  label: { fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' },
  digitCounter: { fontSize: '0.75rem', fontWeight: 600 },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.65rem',
    marginBottom: '0.9rem',
  },
  roleCard: {
    padding: '0.75rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  activeRoleCard: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    boxShadow: '0 3px 10px rgba(37, 99, 235, 0.12)',
  },
  roleCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleTitle: { fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', marginTop: '0.35rem' },
  roleDesc: { fontSize: '0.74rem', color: '#64748b', marginTop: '0.12rem' },
  infoNote: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    fontSize: '0.78rem',
    padding: '0.6rem 0.75rem',
    borderRadius: '9px',
    marginBottom: '0.95rem',
    lineHeight: 1.45,
  },
  input: {
    width: '100%',
    padding: '0.68rem 0.85rem',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '0.92rem',
    marginBottom: '0.95rem',
    backgroundColor: '#ffffff',
  },
  passwordWrap: { position: 'relative', marginBottom: '1.15rem' },
  eyeBtn: {
    position: 'absolute',
    right: '0.65rem',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    padding: '0.25rem',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    padding: '0.8rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
  },
  trustBar: {
    marginTop: '1.35rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  trustItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
  },
};
