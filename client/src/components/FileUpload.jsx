import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { fileAPI } from '../services/api';

const FileUpload = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success'|'error', text: '' }
  const fileInputRef = useRef(null);

  const validateAndUpload = async (file) => {
    if (!file) return;

    const allowedExtensions = ['.pdf', '.docx', '.doc'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      setStatusMessage({
        type: 'error',
        text: `Invalid file format '${ext}'. Only PDF (.pdf) and Word (.docx) files are supported.`
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setStatusMessage({
        type: 'error',
        text: 'File size exceeds 25 MB limit.'
      });
      return;
    }

    setStatusMessage(null);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fileAPI.uploadFile(formData, (percent) => setProgress(percent));
      setStatusMessage({
        type: 'success',
        text: `File '${res.data.file.original_name}' uploaded to Amazon S3.`
      });
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to upload file to Amazon S3.'
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: uploading ? 'default' : 'pointer',
          padding: '0.35rem 0.25rem',
          borderRadius: 'var(--radius-sm)',
          border: `1px dashed ${isDragging ? 'var(--primary)' : 'transparent'}`,
          transition: 'var(--transition)'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.doc"
          onChange={(e) => e.target.files?.[0] && validateAndUpload(e.target.files[0])}
        />

        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '9px',
          background: isDragging ? 'var(--primary-light)' : 'var(--bg-surface-2)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {uploading ? (
            <Loader2 size={16} color="var(--primary)" className="spin-glow" />
          ) : (
            <UploadCloud size={17} color="var(--primary)" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)' }}>
            {uploading ? `Uploading… ${progress}%` : isDragging ? 'Drop to upload' : 'Upload document'}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {uploading ? 'Encrypting and sending to Amazon S3' : 'Drag & drop or click · PDF, DOCX · max 25 MB'}
          </div>
        </div>

        {!uploading && (
          <span className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', flexShrink: 0 }}>
            Choose file
          </span>
        )}
      </div>

      {uploading && (
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.7rem' }}>
          <div
            className="progress-bar-animated"
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--primary), #34D399)',
              transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </div>
      )}

      {statusMessage && (
        <div
          className="animate-slide-up"
          style={{
            marginTop: '0.7rem',
            padding: '0.6rem 0.8rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: statusMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: statusMessage.type === 'success' ? 'var(--success)' : 'var(--error)'
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
