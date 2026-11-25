import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import PulseFeedPage from './pages/PulseFeedPage';
import TeacherDashboard from './pages/TeacherDashboard';

// Redirects unauthenticated or wrong-role users cleanly
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    if (user.role === 'parent') return <Navigate to="/parent" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
}

// Redirects already-logged-in users away from the login screen
function PublicRoute({ children }) {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    if (user.role === 'parent') return <Navigate to="/parent" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <PulseFeedPage />
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <PulseFeedPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
