import React from 'react';
import {
  Shield,
  LogOut,
  User as UserIcon,
  FileText,
  Link2,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/biogaseng.png';

const Navbar = ({ onOpenAuth, activeTab, setActiveTab }) => {
  const { user, logout, isAdmin } = useAuth();

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin': return 'badge-admin';
      case 'Manager': return 'badge-manager';
      default: return 'badge-user';
    }
  };

  const tabs = [
    { id: 'projects', label: 'Projects', Icon: Layers },
    { id: 'files', label: 'Vault', Icon: FileText },
    { id: 'share-links', label: 'Links', Icon: Link2 },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', Icon: Shield }] : []),
  ];

  return (
    <>
      {/* ── Top Navbar ── */}
      <nav className="navbar">
        {/* Brand */}
        <div className="brand-logo" onClick={() => user && setActiveTab('projects')}>
          <img
            src={logo}
            alt="Biogas Engineering"
            className="brand-logo-img"
            style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* Right Side */}
        <div className="nav-actions">
          {user ? (
            <>
              {/* Tab Group — hidden on mobile (uses bottom bar instead) */}
              <div className="nav-tab-group">
                {tabs.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className={`btn nav-tab-pill ${activeTab === id ? 'active' : ''}`}
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', border: 'none', gap: '0.4rem' }}
                    onClick={() => setActiveTab(id)}
                  >
                    <Icon size={14} />
                    <span className="tab-label">{label}</span>
                  </button>
                ))}
              </div>
              {/* User section */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  paddingLeft: '0.65rem',
                  borderLeft: '1px solid var(--border-color)',
                }}
              >
                {/* Name + role — hidden on small screens */}
                <div style={{ textAlign: 'right' }} className="nav-user-name">
                  <div style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                    {user.name}
                  </div>
                  {/* <span className={`badge ${getRoleBadgeClass(user.role_name)}`} style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem' }}>
                    {user.role_name}
                  </span> */}
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={logout}
                  title="Sign Out"
                  style={{ padding: '0.42rem 0.6rem' }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onOpenAuth} style={{ padding: '0.55rem 1.25rem' }}>
              <UserIcon size={15} /> Login / Sign Up
            </button>
          )}
        </div>
      </nav>

      {/* ── Mobile Bottom Tab Bar (only shown on ≤600px via CSS) ── */}
      {user && (
        <div className="mobile-tab-bar">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`mobile-tab-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={20} strokeWidth={activeTab === id ? 2.2 : 1.75} />
              <span>{label}</span>
            </button>
          ))}
          <button className="mobile-tab-btn" onClick={logout} title="Sign Out">
            <LogOut size={20} strokeWidth={1.75} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </>
  );
};

export default Navbar;
