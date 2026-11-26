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
  Loader2,
  Send,
  Key,
  RefreshCw,
  Search
} from 'lucide-react';
import { shareAPI } from '../services/api';
import CreateShareLinkModal from './CreateShareLinkModal';

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
    const base = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.12rem 0.5rem',
      borderRadius: '12px',
      fontSize: '0.7rem',
      fontWeight: '700'
    };
    if (status === 'active') {
      return <span style={{ ...base, background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>Active</span>;
    }
    if (status === 'used') {
      return <span style={{ ...base, background: 'rgba(59,130,246,0.12)', color: '#60A5FA' }}><CheckCircle2 size={11} /> Completed</span>;
    }
    if (status === 'expired') {
      return <span style={{ ...base, background: 'rgba(156,163,175,0.12)', color: '#9CA3AF' }}><Clock size={11} /> Expired</span>;
    }
    if (status === 'revoked') {
      return <span style={{ ...base, background: 'rgba(239,68,68,0.12)', color: '#F87171' }}><Ban size={11} /> Revoked</span>;
    }
    return <span style={{ ...base, background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>{status}</span>;
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
      {/* Minimal Header + Search + Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <LinkIcon size={18} color="var(--primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>One-Time Links</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({filteredLinks.length})</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '180px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              className="input-field"
              placeholder="Search links..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.38rem 0.65rem 0.38rem 1.95rem', fontSize: '0.8rem' }}
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => fetchLinks(true)}
            title="Refresh"
            style={{ padding: '0.38rem 0.6rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
            style={{ padding: '0.38rem 0.8rem', fontSize: '0.8rem' }}
          >
            <Plus size={14} /> New Link
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="spin" />
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '1rem', color: '#F87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {search ? 'No matching links found.' : 'No one-time links created yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {filteredLinks.map((link) => (
            <div
              key={link.id}
              className="glass-card"
              style={{ padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#FFF' }}>{link.title}</span>
                    {getStatusBadge(link.status)}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {link.component_name && <span>{[link.project_name, link.skid_name, link.component_name].filter(Boolean).join(' / ')}</span>}
                    {link.recipient_name && <span>To: {link.recipient_name}</span>}
                    <span>Exp: {new Date(link.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  {link.status === 'active' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRevoke(link.id, link.title)}
                      title="Revoke"
                      style={{ fontSize: '0.74rem', padding: '0.28rem 0.55rem', color: '#F87171' }}
                    >
                      <Ban size={12} /> Revoke
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDelete(link.id, link.title)}
                    title="Delete"
                    style={{ padding: '0.28rem 0.45rem' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Active link controls */}
              {link.status === 'active' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  paddingTop: '0.45rem',
                  borderTop: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {link.otp_display && (
                      <>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>OTP:</span>
                        <code style={{
                          padding: '0.15rem 0.45rem',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '5px',
                          color: '#E2E8F0',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          letterSpacing: '0.06em'
                        }}>
                          {link.otp_display}
                        </code>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleCopyOtp(link)}
                          style={{ padding: '0.22rem 0.45rem' }}
                          title="Copy OTP"
                        >
                          {copiedOtpId === link.id ? <Check size={12} color="#10B981" /> : <Key size={12} />}
                        </button>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleCopyLink(link)}
                      style={{ fontSize: '0.75rem', padding: '0.28rem 0.6rem' }}
                    >
                      {copiedId === link.id ? <><Check size={12} color="#10B981" /> Copied</> : <><Copy size={12} /> Copy Link</>}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleCopyShareMessage(link)}
                      style={{ fontSize: '0.75rem', padding: '0.28rem 0.65rem' }}
                    >
                      {copiedId === `msg-${link.id}` ? <><Check size={12} /> Copied</> : <><Send size={12} /> Copy Invite</>}
                    </button>
                  </div>
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
                  paddingTop: '0.45rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.76rem',
                  color: '#93C5FD'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FileText size={13} /> {link.uploaded_file_name || link.file_original_name || 'Document uploaded'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    By {link.uploader_name || 'Vendor'} · {new Date(link.used_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ))}
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
