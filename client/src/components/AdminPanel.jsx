import React, { useState, useEffect } from 'react';
import { Shield, Users, CheckCircle, AlertCircle, RefreshCw, Key } from 'lucide-react';
import { userAPI } from '../services/api';

const AdminPanel = () => {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userAPI.listUsers();
      setUsersList(res.data.users || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      setMessage({ type: 'error', text: 'Failed to load users list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      const res = await userAPI.updateUserRole(userId, newRoleId);
      setMessage({ type: 'success', text: res.data.message || 'User role updated successfully!' });
      fetchUsers();
    } catch (err) {
      console.error('Role update error:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update role.' });
    }
  };

  const getRoleBadgeClass = (roleName) => {
    switch (roleName) {
      case 'Admin': return 'badge-admin';
      case 'Manager': return 'badge-manager';
      default: return 'badge-user';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield color="var(--badge-admin)" size={24} />
              Role-Based Access Control (RBAC) Management
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Manage user permission levels for S3 uploads, file views, and deletions
            </span>
          </div>

          <button className="btn btn-secondary" onClick={fetchUsers} style={{ padding: '0.5rem 0.85rem' }}>
            <RefreshCw size={15} /> Refresh List
          </button>
        </div>

        {message && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: message.type === 'success' ? '#34D399' : '#FCA5A5'
          }}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Current Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Change Role Permission</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700' }}>{u.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge ${getRoleBadgeClass(u.role_name)}`}>
                        {u.role_name}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <select
                        className="input-field"
                        style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                        value={u.role_id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="1">Admin (Full Control)</option>
                        <option value="2">Manager (All Files View/Download)</option>
                        <option value="3">User (Own Files Only)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
