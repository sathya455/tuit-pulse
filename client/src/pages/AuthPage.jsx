import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teacher');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = (userRole) => {
    if (userRole === 'teacher') navigate('/teacher');
    else if (userRole === 'parent') navigate('/parent');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.post('/auth/register', {
          full_name: fullName,
          mobile,
          password,
          role,
        });
        login(res.data.user, res.data.token);
        redirectByRole(res.data.user.role);
      } else {
        const res = await api.post('/auth/login', {
          mobile,
          password,
        });
        login(res.data.user, res.data.token);
        redirectByRole(res.data.user.role);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logo}>TuitPulse</h1>
          <p style={styles.subtitle}>
            {isRegister
              ? 'Create your account to track daily tuition progress'
              : 'Sign in with your 10-digit mobile number'}
          </p>
        </div>

        <div style={styles.tabRow}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            style={{ ...styles.tab, ...(isRegister ? {} : styles.activeTab) }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            style={{ ...styles.tab, ...(isRegister ? styles.activeTab : {}) }}
          >
            Register
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <>
              <label style={styles.label}>I am a...</label>
              <div style={styles.roleRow}>
                {['teacher', 'parent'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      ...styles.roleBtn,
                      ...(role === r ? styles.activeRoleBtn : {}),
                    }}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>

              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                placeholder="e.g., Sathya S"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={styles.input}
              />
            </>
          )}

          <label style={styles.label}>Mobile Number</label>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  logo: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#2563eb',
  },
  subtitle: {
    margin: '0.4rem 0 0',
    fontSize: '0.9rem',
    color: '#64748b',
  },
  tabRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    backgroundColor: '#f1f5f9',
    padding: '0.3rem',
    borderRadius: '8px',
    marginBottom: '1.25rem',
  },
  tab: {
    padding: '0.5rem',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#475569',
    fontWeight: 600,
    cursor: 'pointer',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    color: '#1e293b',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.35rem',
  },
  roleRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  roleBtn: {
    padding: '0.5rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontWeight: 600,
    cursor: 'pointer',
  },
  activeRoleBtn: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
  },
  input: {
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.95rem',
    marginBottom: '1rem',
    outline: 'none',
  },
  submitBtn: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
