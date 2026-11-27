import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Plus,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Ban,
  FileText,
  Send,
  Key,
  RefreshCw,
  Search
} from 'lucide-react';
import { shareAPI } from '../services/api';
import CreateShareLinkModal from './CreateShareLinkModal';

// Status → accent styling (kept consistent with the Vault / Projects cards)
const STATUS = {
  active: { accent: 'var(--primary)', bg: 'rgba(16,185,129,0.12)', fg: '#34D399', label: 'Active', Icon: null },
  used: { accent: '#38BDF8', bg: 'rgba(56,189,248,0.12)', fg: '#38BDF8', label: 'Completed', Icon: CheckCircle2 },
  expired: { accent: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', fg: '#9CA3AF', label: 'Expired', Icon: Clock },
  revoked: { accent: '#F87171', bg: 'rgba(239,68,68,0.12)', fg: '#F87171', label: 'Revoked', Icon: Ban },
};

const ShareLinksPanel = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedOtpId, setCopiedOtpId] = useState(null);

  const fetchLinks = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await shareAPI.getMyLinks();
      setLinks(res.data.links || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load share links.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCopyLink = (link) => {
    const fullUrl = `${window.location.origin}?share=${link.token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyOtp = (link) => {
    if (!link.otp_display) return;
    navigator.clipboard.writeText(link.otp_display);
    setCopiedOtpId(link.id);
    setTimeout(() => setCopiedOtpId(null), 2000);
  };

  const handleCopyShareMessage = (link) => {
    const fullUrl = `${window.location.origin}?share=${link.token}`;
    const otpText = link.otp_display ? `OTP: ${link.otp_display}\n` : '';
    const msg = link.component_name
      ? `QAP Upload Request\nProject: ${link.project_name || '-'}\nSkid: ${link.skid_name || '-'}\nComponent: ${link.component_name}\nFormat: ${link.format_of_record || '-'}\nLink: ${fullUrl}\n${otpText}`
      : `Upload Link (${link.title}):\n${fullUrl}\n${otpText}`;
    navigator.clipboard.writeText(msg);
    setCopiedId(`msg-${link.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id, title) => {
    if (!window.confirm(`Revoke link for "${title}"?`)) return;
    try {
      await shareAPI.revokeLink(id);
      fetchLinks(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to revoke link.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await shareAPI.deleteLink(id);
      fetchLinks(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete share link.');
    }
  };

  const getStatusBadge = (status) => {
    const s = STATUS[status] || { bg: 'rgba(255,255,255,0.08)', fg: 'var(--text-muted)', label: status, Icon: null };
    const Icon = s.Icon;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.12rem 0.5rem',
        borderRadius: '12px',
        fontSize: '0.7rem',
        fontWeight: '700',
        background: s.bg,
        color: s.fg
      }}>
        {Icon && <Icon size={11} />} {s.label}
      </span>
    );
  };

  const filteredLinks = links.filter(l => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (l.title || '').toLowerCase().includes(q) ||
      (l.component_name || '').toLowerCase().includes(q) ||
      (l.skid_name || '').toLowerCase().includes(q) ||
      (l.recipient_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header + Search + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LinkIcon size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>One-Time Links</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({filteredLinks.length})</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '200px', flex: '0 1 260px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search links..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.4rem 0.7rem 0.4rem 2rem', fontSize: '0.8rem' }}
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => fetchLinks(true)}
            title="Refresh"
            style={{ padding: '0.4rem 0.6rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-glow' : ''} />
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          >
            <Plus size={14} /> New Link
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="glass-card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '8px' }} />
                <div className="skeleton" style={{ width: '60%', height: '12px' }} />
              </div>
              <div className="skeleton" style={{ width: '45%', height: '10px' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '0.75rem 0.9rem', color: 'var(--error)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {search ? 'No matching links found.' : 'No one-time links yet. Create one to get started.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {filteredLinks.map((link, idx) => {
            const st = STATUS[link.status] || STATUS.expired;

            return (
              <div
                key={link.id}
                className="glass-card animate-slide-up"
                onClick={() => handleCopyLink(link)}
                style={{
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  transition: 'all 0.2s',
                  border: '1px solid var(--border-color)',
                  animationDelay: `${idx * 0.03}s`
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                {/* Top row: icon + title + actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: st.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <LinkIcon size={15} color={st.fg} />
                    </div>
                    <span title={link.title} style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {link.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.4rem' }} title="Copy link" onClick={() => handleCopyLink(link)}>
                      {copiedId === link.id ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.4rem' }} title="Copy invite message" onClick={() => handleCopyShareMessage(link)}>
                      {copiedId === `msg-${link.id}` ? <Check size={13} color="#10B981" /> : <Send size={13} />}
                    </button>
                    {link.status === 'active' && (
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.4rem' }} title="Revoke" onClick={() => handleRevoke(link.id, link.title)}>
                        <Ban size={13} />
                      </button>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.4rem' }} title="Delete" onClick={() => handleDelete(link.id, link.title)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {getStatusBadge(link.status)}
                  {link.component_name && <span>{[link.project_name, link.skid_name, link.component_name].filter(Boolean).join(' / ')}</span>}
                  {link.recipient_name && <span>To: {link.recipient_name}</span>}
                  <span>Exp: {new Date(link.expires_at).toLocaleDateString()}</span>
                </div>

                {/* OTP strip (visible to admin for any link that still has one) */}
                {link.otp_display && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>OTP</span>
                    <code style={{
                      padding: '0.12rem 0.45rem',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '5px',
                      color: '#E2E8F0',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      letterSpacing: '0.06em'
                    }}>
                      {link.otp_display}
                    </code>
                    <button className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem' }} title="Copy OTP" onClick={() => handleCopyOtp(link)}>
                      {copiedOtpId === link.id ? <Check size={11} color="#10B981" /> : <Key size={11} />}
                    </button>
                  </div>
                )}

                {/* Completed upload summary */}
                {link.status === 'used' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileText size={12} color="var(--primary)" /> {link.uploaded_file_name || link.file_original_name || 'Document uploaded'}
                    </span>
                    <span>By {link.uploader_name || 'Vendor'} · {new Date(link.used_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateShareLinkModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => fetchLinks(true)}
      />
    </div>
  );
};

export default ShareLinksPanel;
