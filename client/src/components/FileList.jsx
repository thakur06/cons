import React, { useState } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Search,
  HardDrive,
  RefreshCw,
  ChevronRight,
  Link2
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
      year: 'numeric'
    });
  };

  const isPdf = (mime, filename) =>
    mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');

  const filteredFiles = files.filter(file => {
    const matchesSearch =
      file.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.uploader_name && file.uploader_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'pdf') return isPdf(file.mime_type, file.original_name);
    if (filterType === 'docx') return !isPdf(file.mime_type, file.original_name);
    return true;
  });

  return (
    <div>
      {/* Header + Search + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HardDrive size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>Documents</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({filteredFiles.length})</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>· {storageType || 'AWS S3'}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '200px', flex: '0 1 260px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.4rem 0.7rem 0.4rem 2rem', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-surface-2)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {[['all', 'All'], ['pdf', 'PDF'], ['docx', 'DOCX']].map(([type, label]) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  padding: '0.34rem 0.7rem',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: filterType === type ? 'var(--primary)' : 'transparent',
                  color: filterType === type ? '#fff' : 'var(--text-muted)',
                  transition: 'var(--transition)'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {onRefresh && (
            <button className="btn btn-secondary" onClick={handleRefresh} title="Refresh" style={{ padding: '0.4rem 0.6rem' }}>
              <RefreshCw size={14} className={refreshing ? 'spin-glow' : ''} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '8px' }} />
                <div className="skeleton" style={{ width: '60%', height: '12px' }} />
              </div>
              <div className="skeleton" style={{ width: '40%', height: '10px' }} />
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {searchTerm ? 'No matching documents found.' : 'No documents yet. Upload a PDF or Word file above.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {filteredFiles.map((file, idx) => {
            const pdfFile = isPdf(file.mime_type, file.original_name);
            const userCanDelete = canDeleteFile(file);

            return (
              <div
                key={file.id}
                className="glass-card animate-slide-up"
                onClick={() => onSelectFileView(file)}
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
                {/* Top row: icon + name + actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: pdfFile ? 'var(--accent-pdf-bg)' : 'var(--accent-docx-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileText size={15} color={pdfFile ? 'var(--accent-pdf)' : 'var(--accent-docx)'} />
                    </div>
                    <div
                      title={file.original_name}
                      style={{ fontWeight: '700', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {file.original_name}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                    <a
                      href={file.download_url}
                      download={file.original_name}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.4rem' }}
                      title="Download"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={13} />
                    </a>
                    {userCanDelete && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.4rem' }}
                        onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id, file.original_name); }}
                        title="Delete document"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom row: meta badges + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                    <span className={`badge ${pdfFile ? 'badge-pdf' : 'badge-docx'}`} style={{ fontSize: '0.7rem' }}>{pdfFile ? 'PDF' : 'DOCX'}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{formatFileSize(file.file_size)}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{formatDate(file.created_at)}</span>
                    {file.is_share_upload && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Link2 size={9} /> One-Time
                      </span>
                    )}
                  </div>
                  <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
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
