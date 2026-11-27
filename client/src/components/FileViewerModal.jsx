import React, { useState } from 'react';
import { X, Download, ExternalLink, Copy, Check, FileText, Image as ImageIcon } from 'lucide-react';

const FileViewerModal = ({ file, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const name = (file.original_name || '').toLowerCase();
  const mime = (file.mime_type || '').toLowerCase();
  const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
  const isImage = mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(name);

  const copyPresignedUrl = () => {
    navigator.clipboard.writeText(file.view_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ height: '85vh', width: '90%', maxWidth: '1000px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', background: '#1F2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isImage ? (
              <ImageIcon size={24} color="var(--primary)" />
            ) : (
              <FileText size={24} color={isPdf ? 'var(--accent-pdf)' : 'var(--accent-docx)'} />
            )}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>{file.original_name}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Presigned Amazon S3 Endpoint | Uploaded by {file.uploader_name}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem' }} onClick={copyPresignedUrl}>
              {copied ? <Check size={14} color="#34D399" /> : <Copy size={14} />}
              {copied ? 'Copied S3 Link' : 'Copy URL'}
            </button>

            <a
              href={file.view_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem', textDecoration: 'none' }}
              title="Open document in new browser tab"
            >
              <ExternalLink size={14} /> Open in Tab
            </a>

            <a
              href={file.download_url}
              download={file.original_name}
              className="btn btn-primary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', textDecoration: 'none', fontWeight: '700' }}
            >
              <Download size={14} /> Download File
            </a>

            <button className="btn btn-secondary" style={{ padding: '0.45rem' }} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div style={{ flex: 1, background: '#0B0F19', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isImage ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '1rem' }}>
              <img
                src={file.view_url}
                alt={file.original_name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={file.view_url}
              title={file.original_name}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center' }}>
              <FileText size={64} color="var(--accent-docx)" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>Document Preview</h4>
              <p style={{ color: 'var(--text-muted)', maxWidth: '500px', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                This file is stored securely on AWS S3. Click below to open it with an online viewer or download the raw file.
              </p>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <a
                  href={`https://docs.google.com/gview?url=${encodeURIComponent(file.view_url)}&embedded=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  <ExternalLink size={16} /> Open with Online Viewer
                </a>

                <a href={file.download_url} download className="btn btn-primary">
                  <Download size={16} /> Download File
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;
