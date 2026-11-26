import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthModal = ({ isOpen, onClose }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('3'); // Default to Standard User (3)
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isLoginView) {
        await login(email, password);
      } else {
        await register(name, email, password, roleId);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '450px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={22} color="var(--primary)" />
            {isLoginView ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <button
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              background: isLoginView ? 'var(--primary)' : 'transparent',
              color: '#fff',
              transition: 'all 0.2s'
            }}
            onClick={() => { setIsLoginView(true); setError(''); }}
          >
            Sign In
          </button>
          <button
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              background: !isLoginView ? 'var(--primary)' : 'transparent',
              color: '#fff',
              transition: 'all 0.2s'
            }}
            onClick={() => { setIsLoginView(false); setError(''); }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#FCA5A5',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLoginView && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Email Address</label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Password</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLoginView && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Select Role</label>
              <select
                className="input-field"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                <option value="3">User (Upload, View & Delete Own Files)</option>
                <option value="2">Manager (View/Download All, Delete Own Files)</option>
                <option value="1">Admin (Full Control: Manage Users & All Files)</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem', fontWeight: '700' }} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} className="spin-glow" /> Processing...
              </>
            ) : (
              isLoginView ? 'Sign In to Vault' : 'Create Free Account'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Quick Demo Login:<br />
          <strong style={{ color: '#A5B4FC' }}>admin@example.com</strong> / <strong>Admin123!</strong> (Admin)<br />
          <strong style={{ color: '#22D3EE' }}>user@example.com</strong> / <strong>User123!</strong> (Standard User)
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
