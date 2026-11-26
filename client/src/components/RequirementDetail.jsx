import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Download,
  ChevronRight,
  ShieldCheck,
  Send,
  Link2,
  ExternalLink,
  Layers,
  FileCheck
} from 'lucide-react';
import { projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreateShareLinkModal from './CreateShareLinkModal';

const RequirementDetail = ({ project, pkg, requirement, onBack, onSelectFileView }) => {
  const { isAdmin } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [markingId, setMarkingId] = useState(null);
  const fileInputRef = useRef();

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await projectAPI.getRequirementFiles(requirement.id);
      setFiles(res.data.files || []);
    } catch {
      setError('Failed to load files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [requirement.id]);

  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      await projectAPI.uploadRequirementFile(requirement.id, formData, setUploadProgress);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMarkComplete = async (fileId) => {
    setMarkingId(fileId);
    try {
      await projectAPI.markFileComplete(fileId);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as completed.');
    } finally {
      setMarkingId(null);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await projectAPI.deleteRequirementFile(fileId);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete.');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={onBack}>
          <ArrowLeft size={15} /> {pkg.name}
        </button>
        <ChevronRight size={14} color="var(--text-muted)" />
        <span style={{ fontWeight: '700', fontSize: '1rem', color: '#FFF' }}>{requirement.name}</span>
      </div>

      {/* QAP Component Card */}
      <div className="glass-card" style={{
        padding: '1.35rem 1.5rem',
        marginBottom: '1.35rem',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(15,23,42,0.75))',
        border: '1px solid var(--border-highlight)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#A5B4FC', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Quality Assurance Specification
            </div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#FFF' }}>
              {requirement.name}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {requirement.format_of_record && (
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                color: '#4ADE80',
                fontSize: '0.82rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                📄 Required Format: {requirement.format_of_record}
              </span>
            )}

            <button
              className="btn btn-primary"
              onClick={() => setShareModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 15px rgba(99,102,241,0.3)'
              }}
            >
              <Send size={15} /> Send Upload Link to Vendor
            </button>
          </div>
        </div>

        {/* QAP Table / Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          padding: '1rem',
          borderRadius: '8px',
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.82rem'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '700' }}>CHARACTERISTICS</div>
            <div style={{ fontWeight: '700', color: '#FFF' }}>{requirement.characteristics || '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '700' }}>REQUIREMENT FOR CHECKING</div>
            <div style={{ fontWeight: '700', color: '#FFF' }}>{requirement.check_requirement || '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '700' }}>REF. DOCUMENT / DRAWING</div>
            <div style={{ fontWeight: '700', color: '#FFF' }}>{requirement.ref_document || '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '700' }}>QUANTUM CHECK</div>
            <div style={{ fontWeight: '700', color: '#FFF' }}>{requirement.quantum_check || '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '700' }}>ACCEPTANCE STANDARD</div>
            <div style={{ fontWeight: '700', color: '#FFF' }}>{requirement.acceptance_standard || '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '700' }}>INSPECTION AGENCY</div>
            <div style={{ fontWeight: '700', color: '#FFF' }}>
              P: {requirement.inspection_p || 'M'} | W: {requirement.inspection_w || 'Q'} | R: {requirement.inspection_r || 'B'}
            </div>
          </div>
        </div>
      </div>

      {/* Internal Direct Upload Bar */}
      <div className="glass-card" style={{ padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Upload size={16} color="var(--primary)" /> Direct Upload
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Or upload files directly from your workstation (PDF, Word, Excel, Photographs)
            </div>
          </div>

          <button
            className="btn btn-secondary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <><Loader2 size={16} className="spin" /> Uploading...</> : <><Upload size={16} /> Choose File(s)</>}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
        </div>

        {uploading && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              <span>Uploading format of record file...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Files List */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <FileCheck size={18} color="var(--primary)" />
          Received Format of Record Files ({files.length})
        </h4>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <FileText size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: '600', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
            No format of record files received yet.
          </p>
          <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
            Click <strong>"Send Upload Link to Vendor"</strong> above to generate a dedicated one-time upload link for this component.
          </p>
          <button className="btn btn-primary" onClick={() => setShareModalOpen(true)}>
            <Send size={15} /> Send Upload Link
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {files.map(file => {
            const isCompleted = file.status === 'completed';
            return (
              <div
                key={file.id}
                className="glass-card"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  border: isCompleted ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 280px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: isCompleted ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isCompleted ? <CheckCircle2 size={20} color="#22C55E" /> : <FileText size={20} color="var(--primary)" />}
                  </div>

                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#FFF', wordBreak: 'break-all' }}>
                      {file.original_name}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <span>{formatSize(file.file_size)}</span>
                      <span>•</span>
                      <span>By: <strong style={{ color: '#E2E8F0' }}>{file.uploader_name || 'Vendor'}</strong></span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      {file.share_link_id && (
                        <span style={{
                          padding: '0.1rem 0.45rem',
                          borderRadius: '12px',
                          background: 'rgba(99,102,241,0.15)',
                          color: '#A5B4FC',
                          fontSize: '0.68rem',
                          fontWeight: '700'
                        }}>
                          🔗 via Vendor Link
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  {/* Status Badge */}
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.18rem 0.6rem',
                    borderRadius: '20px',
                    fontWeight: '700',
                    background: isCompleted ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                    color: isCompleted ? '#22C55E' : '#FBBF24'
                  }}>
                    {isCompleted ? 'Verified & Completed' : 'Pending Review'}
                  </span>

                  {/* View File */}
                  {onSelectFileView && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      onClick={() => onSelectFileView(file)}
                      title="Preview Document"
                    >
                      <Eye size={14} /> View
                    </button>
                  )}

                  {/* Download File */}
                  {file.download_url && (
                    <a
                      href={file.download_url}
                      download={file.original_name}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      title="Download File"
                    >
                      <Download size={14} />
                    </a>
                  )}

                  {/* Admin mark complete */}
                  {isAdmin && !isCompleted && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: '#22C55E' }}
                      onClick={() => handleMarkComplete(file.id)}
                      disabled={markingId === file.id}
                      title="Mark as Verified / Completed"
                    >
                      {markingId === file.id ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />} Approve
                    </button>
                  )}

                  {/* Delete file */}
                  {isAdmin && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.55rem' }}
                      onClick={() => handleDelete(file.id)}
                      title="Delete File"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Link Modal for this component */}
      <CreateShareLinkModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onCreated={() => fetchFiles()}
        initialData={{
          projectId: project.id,
          packageId: pkg.id,
          requirementId: requirement.id,
          componentName: requirement.name,
          formatOfRecord: requirement.format_of_record,
          skidName: pkg.name,
          projectName: project.name
        }}
      />
    </div>
  );
};

export default RequirementDetail;
