import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('tuitpulse_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('tuitpulse_token') || null);

  const login = (userData, jwtToken) => {
    localStorage.setItem('tuitpulse_user', JSON.stringify(userData));
    localStorage.setItem('tuitpulse_token', jwtToken);
    setUser(userData);
    setToken(jwtToken);
  };

  const logout = () => {
    localStorage.removeItem('tuitpulse_user');
    localStorage.removeItem('tuitpulse_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);