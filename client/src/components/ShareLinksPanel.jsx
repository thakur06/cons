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
  Eye,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Send,
  Key,
  RefreshCw
} from 'lucide-react';
import { shareAPI } from '../services/api';
import CreateShareLinkModal from './CreateShareLinkModal';

const ShareLinksPanel = ({ onSelectFileView }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Copy feedback state
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
    const otpText = link.otp_display ? `🔑 One-Time Passcode (OTP): ${link.otp_display}\n` : '';
    let msg;
    if (link.component_name) {
      msg = `📋 QUALITY ASSURANCE RECORD SUBMISSION REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ Project: ${link.project_name || 'Biogas Engineering Plant'}
⚙️ Skid / Package: ${link.skid_name || 'Blower Package'}
🔍 Component / Operation: ${link.component_name}
📄 Required Format of Record: ${link.format_of_record || 'Compliance Certificate / Test Report'}
📁 Multiple Files Allowed: Yes

🔗 Upload Portal: ${fullUrl}
${otpText}
⏰ Note: This link and passcode can only be used once. Please submit all relevant documents/photographs.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    } else {
      msg = `Hello! Please upload your document (${link.title}):\n\n🔗 Upload Link: ${fullUrl}\n${otpText}\n⚠️ Note: This link and passcode can only be used once.`;
    }
    navigator.clipboard.writeText(msg);
    setCopiedId(`msg-${link.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id, title) => {
    if (!window.confirm(`Revoke upload link for "${title}"? The recipient will no longer be able to submit.`)) return;
    try {
      await shareAPI.revokeLink(id);
      fetchLinks(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to revoke link.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete record for "${title}"?`)) return;
    try {
      await shareAPI.deleteLink(id);
      fetchLinks(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete share link record.');
    }
  };

  // Stats calculation
  const totalCount = links.length;
  const activeCount = links.filter(l => l.status === 'active').length;
  const usedCount = links.filter(l => l.status === 'used').length;
  const expiredCount = links.filter(l => l.status === 'expired' || l.status === 'revoked' || l.status === 'locked').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10B981',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}>
            <span className="pulse-dot pulse-dot-green" style={{ width: '6px', height: '6px' }} />
            Active (Awaiting Upload)
          </span>
        );
      case 'used':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#60A5FA',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}>
            <CheckCircle2 size={13} />
            Completed (Single-Use Fulfilled)
          </span>
        );
      case 'expired':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            background: 'rgba(156, 163, 175, 0.12)',
            border: '1px solid rgba(156, 163, 175, 0.3)',
            color: '#9CA3AF',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            <Clock size={12} />
            Expired
          </span>
        );
      case 'revoked':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#F87171',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            <Ban size={12} />
            Revoked
          </span>
        );
      default:
        return (
          <span className="badge badge-user" style={{ fontSize: '0.75rem' }}>
            {status}
          </span>
        );
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="animate-slide-up">
      {/* Top Banner & Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#FFF', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
            }}>
              <LinkIcon size={22} color="var(--primary)" />
            </div>
            One-Time Share Links
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Generate a secure link with a random OTP. Each link can only be used once for a single document upload.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchLinks(true)}
            title="Refresh Links"
            style={{ padding: '0.65rem 0.85rem' }}
          >
            <RefreshCw size={16} className={refreshing ? 'spin-glow' : ''} />
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
            style={{ padding: '0.75rem 1.5rem', fontWeight: '700' }}
          >
            <Plus size={18} /> Generate New Share Link
          </button>
        </div>
      </div>

      {/* Mini Stats Grid with Hover Lift */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Links</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem', color: '#FFF' }}>{totalCount}</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="pulse-dot pulse-dot-green" style={{ width: '6px', height: '6px' }} /> Active (Awaiting)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10B981', marginTop: '0.25rem' }}>{activeCount}</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ fontSize: '0.8rem', color: '#60A5FA', fontWeight: '600' }}>Single-Use Completed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#60A5FA', marginTop: '0.25rem' }}>{usedCount}</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--text-subtle)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: '600' }}>Expired / Inactive</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>{expiredCount}</div>
        </div>
      </div>

      {/* SKELETON LOADING OR MAIN CONTENT */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="skeleton" style={{ width: '220px', height: '24px' }} />
                <div className="skeleton" style={{ width: '120px', height: '24px', borderRadius: '12px' }} />
              </div>
              <div className="skeleton" style={{ width: '400px', height: '16px' }} />
              <div className="skeleton" style={{ width: '100%', height: '48px', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <AlertCircle size={36} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#F87171', fontWeight: '600' }}>{error}</p>
        </div>
      ) : links.length === 0 ? (
        <div className="glass-card" style={{ padding: '4.5rem 2rem', textAlign: 'center' }}>
          <div className="animate-float" style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem'
          }}>
            <LinkIcon size={34} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.5rem', color: '#FFF' }}>
            No Share Links Created Yet
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 1.75rem', fontSize: '0.92rem', lineHeight: '1.6' }}>
            Create a one-time link with a random passcode. The recipient can enter the passcode and securely upload a file directly to your vault.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
            style={{ padding: '0.8rem 1.75rem' }}
          >
            <Plus size={18} /> Create Your First Share Link
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {links.map((link, idx) => (
            <div
              key={link.id}
              className="glass-card animate-slide-up"
              style={{
                padding: '1.5rem',
                animationDelay: `${idx * 0.05}s`,
                borderLeft: link.status === 'active'
                  ? '4px solid #10B981'
                  : link.status === 'used'
                  ? '4px solid #3B82F6'
                  : '4px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                <div>
                  {link.component_name && (
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.5rem', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', fontWeight: '700' }}>
                        🏗️ {link.project_name || 'Project'}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.5rem', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', fontWeight: '700' }}>
                        ⚙️ {link.skid_name || 'Blower Package'}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.5rem', borderRadius: '12px', background: 'rgba(236,72,153,0.15)', color: '#F472B6', fontWeight: '700' }}>
                        🔍 {link.component_name}
                      </span>
                      {link.format_of_record && (
                        <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.5rem', borderRadius: '12px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ADE80', fontWeight: '800' }}>
                          📄 Format: {link.format_of_record}
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#FFF' }}>
                      {link.title}
                    </h3>
                    {getStatusBadge(link.status)}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {link.recipient_name && (
                      <span>Recipient: <strong style={{ color: '#E0E7FF' }}>{link.recipient_name}</strong></span>
                    )}
                    <span>Created: {new Date(link.created_at).toLocaleDateString()}</span>
                    <span>Expires: {new Date(link.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Top Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {link.status === 'active' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRevoke(link.id, link.title)}
                      title="Revoke link"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', color: '#F87171' }}
                    >
                      <Ban size={14} /> Revoke
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDelete(link.id, link.title)}
                    title="Delete record"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Status Details / Uploaded File info */}
              {link.status === 'used' ? (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem 1.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: link.uploaded_files?.length > 1 ? '0.75rem' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FileText size={22} color="#60A5FA" />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#FFF' }}>
                          {link.uploaded_file_name || link.file_original_name || 'Uploaded Document(s)'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Uploaded by <strong style={{ color: '#93C5FD' }}>{link.uploader_name || 'Vendor'}</strong> on {new Date(link.used_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.78rem',
                      color: '#93C5FD',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(59, 130, 246, 0.15)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                      <CheckCircle2 size={14} color="#60A5FA" /> Record Received & Attached
                    </span>
                  </div>

                  {/* Multi-file sublist if more than 1 file */}
                  {Array.isArray(link.uploaded_files) && link.uploaded_files.length > 1 && (
                    <div style={{
                      display: 'grid',
                      gap: '0.45rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      {link.uploaded_files.map((uf, uIdx) => (
                        <div key={uIdx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.82rem',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px'
                        }}>
                          <span style={{ color: '#E2E8F0', fontWeight: '600' }}>📄 {uf.original_name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{formatBytes(uf.file_size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : link.status === 'active' ? (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.9rem 1.15rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {link.otp_display && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>Passcode (OTP):</span>
                        <code style={{
                          padding: '0.25rem 0.6rem',
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          borderRadius: '6px',
                          color: '#A5B4FC',
                          fontWeight: '800',
                          fontSize: '1rem',
                          letterSpacing: '0.08em'
                        }}>
                          {link.otp_display}
                        </code>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleCopyOtp(link)}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                          title="Copy Passcode"
                        >
                          {copiedOtpId === link.id ? <Check size={13} color="#10B981" /> : <Key size={13} />}
                        </button>
                      </div>
                    )}

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Token: <span style={{ fontFamily: 'monospace', color: '#E0E7FF' }}>{link.token.slice(0, 10)}...</span>
                    </div>
                  </div>

                  {/* Share buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleCopyLink(link)}
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check size={14} color="#10B981" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy Link
                        </>
                      )}
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={() => handleCopyShareMessage(link)}
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                    >
                      {copiedId === `msg-${link.id}` ? (
                        <>
                          <Check size={14} /> Copied Message!
                        </>
                      ) : (
                        <>
                          <Send size={14} /> Copy Full Invite (Link + OTP)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Modal to Create Link */}
      <CreateShareLinkModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => fetchLinks(true)}
      />
    </div>
  );
};

export default ShareLinksPanel;
