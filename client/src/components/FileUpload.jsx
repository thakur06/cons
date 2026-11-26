import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
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
        text: `File '${res.data.file.original_name}' uploaded and encrypted to Amazon S3!`
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
    <div className="glass-card animate-slide-up" style={{ padding: '1.25rem 1.25rem 1.5rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-main)' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--primary-light)', border: '1px solid var(--border-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UploadCloud color="var(--primary)" size={17} />
          </div>
          Upload to S3
        </h3>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', background: 'var(--bg-surface-2)', padding: '0.25rem 0.65rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          PDF / DOCX — Max 25MB
        </span>
      </div>

      <div
        className={`dropzone ${isDragging ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.doc"
          onChange={(e) => e.target.files?.[0] && validateAndUpload(e.target.files[0])}
        />

        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.35)'
            }}>
              <Loader2 size={32} color="var(--primary)" className="spin-glow" />
            </div>

            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#FFF' }}>
              Encrypting & Streaming to Amazon S3... ({progress}%)
            </div>

            <div style={{ width: '85%', maxWidth: '360px', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                className="progress-bar-animated"
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary), #38BDF8)',
                  boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)',
                  transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Rate Limiter Checked • S3 Bucket Upload in Progress
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div className="animate-float" style={{ width: '52px', height: '52px', borderRadius: '50%', background: isDragging ? 'var(--primary-light)' : 'rgba(79,70,229,0.06)', border: '1px solid var(--border-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.2rem', transition: 'all 0.3s ease' }}>
              <UploadCloud size={26} color={isDragging ? 'var(--primary)' : 'var(--primary)'} />
            </div>
            <div style={{ fontWeight: '700', fontSize: '0.98rem', color: 'var(--text-main)' }}>Drop your PDF or DOCX here</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>or <span style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer' }}>click to browse</span></div>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          className="animate-slide-up"
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: statusMessage.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
            color: statusMessage.type === 'success' ? 'var(--success)' : 'var(--error)',
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
