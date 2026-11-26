import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Shield,
  User,
  HardDrive,
  Calendar,
  Link2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FileList = ({ files, loading, onSelectFileView, onDeleteFile, storageType, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const { canDeleteFile } = useAuth();

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const num = parseInt(bytes, 10);
    if (num < 1024) return num + ' B';
    if (num < 1024 * 1024) return (num / 1024).toFixed(1) + ' KB';
    return (num / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPdf = (mime, filename) => {
    return mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (file.uploader_name && file.uploader_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'pdf') return isPdf(file.mime_type, file.original_name);
    if (filterType === 'docx') return !isPdf(file.mime_type, file.original_name);
    return true;
  });

  return (
    <div className="glass-card animate-slide-up" style={{ padding: '1.5rem 1.25rem' }}>
      {/* Header & Controls */}
      <div className="filelist-controls" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-main)' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--primary-light)', border: '1px solid var(--border-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={16} color="var(--primary)" />
            </div>
            Document Vault
            <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '20px', background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--border-color)' }}>
              {filteredFiles.length}
            </span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
            Engine: <strong style={{ color: 'var(--primary)' }}>{storageType || 'AWS S3'}</strong>
          </span>
        </div>

        {/* Filters & Actions */}
        <div className="search-wrap" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '200px', minWidth: '140px' }}>
            <Search size={14} color="var(--text-subtle)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '2.1rem', fontSize: '0.83rem', paddingRight: '0.65rem', padding: '0.55rem 0.65rem 0.55rem 2.1rem' }}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-surface-2)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {[['all','All'],['pdf','PDF'],['docx','DOCX']].map(([type, label]) => (
              <button
                key={type}
                style={{
                  padding: '0.35rem 0.7rem',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.77rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: filterType === type
                    ? (type === 'pdf' ? 'var(--accent-pdf)' : type === 'docx' ? 'var(--accent-docx)' : 'var(--primary)')
                    : 'transparent',
                  color: filterType === type ? '#fff' : 'var(--text-muted)',
                  transition: 'var(--transition)'
                }}
                onClick={() => setFilterType(type)}
              >{label}</button>
            ))}
          </div>

          {onRefresh && (
            <button className="btn btn-secondary" onClick={handleRefresh} title="Refresh" style={{ padding: '0.45rem 0.65rem' }}>
              <RefreshCw size={14} className={refreshing ? 'spin-glow' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* SKELETON LOADING STATE (ANIMATED SHIMMER) */}
      {loading ? (
        <div className="dashboard-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="skeleton" style={{ width: '80px', height: '22px', borderRadius: '12px' }} />
                <div className="skeleton" style={{ width: '50px', height: '18px' }} />
              </div>
              <div className="skeleton" style={{ width: '85%', height: '20px', marginTop: '4px' }} />
              <div className="skeleton" style={{ width: '60%', height: '14px' }} />
              <div className="skeleton" style={{ width: '50%', height: '14px', marginBottom: '8px' }} />
              <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <div className="skeleton" style={{ flex: 1, height: '32px' }} />
                <div className="skeleton" style={{ width: '36px', height: '32px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-2)' }}>
          <div className="animate-float" style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'var(--primary-light)', border: '1px solid var(--border-highlight)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <FolderOpen size={28} color="var(--primary)" />
          </div>
          <p style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            No documents found
          </p>
          <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            {searchTerm ? 'No results matched your query.' : 'Upload a PDF or Word document to get started.'}
          </span>
        </div>
      ) : (
        /* FILE CARDS WITH STAGGERED ENTRANCE & HOVER GLOW */
        <div className="dashboard-grid">
          {filteredFiles.map((file, idx) => {
            const pdfFile = isPdf(file.mime_type, file.original_name);
            const userCanDelete = canDeleteFile(file);

            return (
              <div
                key={file.id}
                className="glass-card animate-slide-up"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  animationDelay: `${idx * 0.04}s`,
                  borderLeft: `4px solid ${pdfFile ? 'var(--accent-pdf)' : 'var(--accent-docx)'}`
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                    <span className={`badge ${pdfFile ? 'badge-pdf' : 'badge-docx'}`}>
                      {pdfFile ? 'PDF' : 'DOCX'}
                    </span>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                      {formatFileSize(file.file_size)}
                    </span>
                  </div>

                  {file.is_share_upload && (
                    <div style={{ marginBottom: '0.45rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'var(--primary-light)', border: '1px solid var(--border-color)', color: 'var(--primary)', fontWeight: '700' }}>
                        <Link2 size={11} /> One-Time Link
                      </span>
                    </div>
                  )}

                  <h4 style={{ fontSize: '0.92rem', fontWeight: '700', wordBreak: 'break-word', marginBottom: '0.55rem', lineHeight: '1.35', color: 'var(--text-main)' }} title={file.original_name}>
                    {file.original_name}
                  </h4>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <User size={12} color="var(--text-subtle)" />
                      <span><strong style={{ color: 'var(--text-secondary)' }}>{file.uploader_name || 'User'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={12} color="var(--text-subtle)" />
                      <span>{formatDate(file.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '0.42rem 0.65rem', fontSize: '0.78rem' }} onClick={() => onSelectFileView(file)}>
                    <Eye size={13} color="var(--primary)" /> View
                  </button>
                  <a href={file.download_url} download={file.original_name} className="btn btn-secondary" style={{ padding: '0.42rem 0.6rem', textDecoration: 'none' }} title="Download">
                    <Download size={13} />
                  </a>
                  {userCanDelete && (
                    <button className="btn btn-danger" style={{ padding: '0.42rem 0.6rem' }} onClick={() => onDeleteFile(file.id, file.original_name)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileList;
