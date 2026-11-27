import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  FileUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  UploadCloud,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Shield,
  Key,
  Zap,
  X
} from 'lucide-react';
import { shareAPI } from '../services/api';
import logo from '../assets/images/biogaseng.png';

/* ─── Animated Particle Canvas Background ─────────────────────── */
const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#10B981', '#34D399', '#059669', '#6EE7B7', '#38BDF8'];
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.55,
      dy: (Math.random() - 0.5) * 0.55,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.6 + 0.15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle =
          p.color +
          Math.round(p.opacity * 255)
            .toString(16)
            .padStart(2, '0');
        ctx.fill();
      });

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(16,185,129,${0.12 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.7;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.55,
      }}
    />
  );
};

/* ─── Animated Orb Blobs ──────────────────────────────────────── */
const OrbBlobs = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}
  >
    <div className="orb orb-1" />
    <div className="orb orb-2" />
    <div className="orb orb-3" />
  </div>
);

/* ─── Step Progress Bar ───────────────────────────────────────── */
const StepProgress = ({ step }) => {
  const steps = [
    { n: 1, label: 'Verify OTP', icon: Key },
    { n: 2, label: 'Upload File', icon: FileUp },
    { n: 3, label: 'Complete', icon: CheckCircle2 },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2rem' }}>
      {steps.map((s, idx) => {
        const Icon = s.icon;
        const done = step > s.n;
        const active = step === s.n;
        return (
          <React.Fragment key={s.n}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
                flex: '0 0 auto',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: done
                    ? 'linear-gradient(135deg, #10B981, #059669)'
                    : active
                    ? 'linear-gradient(135deg, #10B981, #059669)'
                    : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${
                    done ? '#10B981' : active ? '#10B981' : 'rgba(255,255,255,0.12)'
                  }`,
                  boxShadow: active
                    ? '0 0 20px rgba(16,185,129,0.5), 0 0 40px rgba(16,185,129,0.2)'
                    : done
                    ? '0 0 15px rgba(16,185,129,0.4)'
                    : 'none',
                  transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                  transform: active ? 'scale(1.12)' : 'scale(1)',
                }}
              >
                {done ? (
                  <CheckCircle2 size={20} color="#fff" />
                ) : (
                  <Icon size={18} color={active ? '#fff' : 'rgba(255,255,255,0.3)'} />
                )}
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: done ? '#10B981' : active ? '#6EE7B7' : 'rgba(255,255,255,0.25)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  transition: 'color 0.3s ease',
                }}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  margin: '0 0.5rem',
                  marginBottom: '1.4rem',
                  background: done
                    ? 'linear-gradient(90deg,#10B981,#059669)'
                    : 'rgba(255,255,255,0.08)',
                  borderRadius: '2px',
                  transition: 'background 0.5s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: '60%',
                      background:
                        'linear-gradient(90deg,transparent,rgba(16,185,129,0.6),transparent)',
                      animation: 'shimmerLine 1.8s ease-in-out infinite',
                    }}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ─── Main SharePortalPage ────────────────────────────────────── */
const SharePortalPage = ({ token, onExit }) => {
  const [loading, setLoading] = useState(true);
  const [linkInfo, setLinkInfo] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [step, setStep] = useState(1);

  // OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef([]);

  // Upload
  const [files, setFiles] = useState([]);
  const [uploaderName, setUploaderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedDetails, setUploadedDetails] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch link info
  useEffect(() => {
    if (!token) return;
    const fetchInfo = async () => {
      setLoading(true);
      try {
        const res = await shareAPI.getLinkInfo(token);
        if (res.data.valid) {
          setLinkInfo(res.data);
          if (res.data.recipient_name) setUploaderName(res.data.recipient_name);
        } else {
          setErrorStatus(res.data.status);
          setErrorMessage(res.data.message || 'This upload link is no longer valid.');
          if (res.data.used_at) {
            setUploadedDetails({
              used_at: res.data.used_at,
              file_name: res.data.uploaded_file_name,
              uploaded_files: res.data.uploaded_files || [],
              project_name: res.data.project_name,
              skid_name: res.data.skid_name,
              component_name: res.data.component_name,
              format_of_record: res.data.format_of_record
            });
          }
        }
      } catch (err) {
        setErrorStatus('error');
        setErrorMessage(err.response?.data?.error || 'Invalid or expired upload link.');
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  /* ── OTP box handlers ── */
  const handleOtpChange = (idx, val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[idx] = cleaned;
    setOtp(next);
    setOtpError('');
    if (cleaned && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const next = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
      setOtp(next);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  const otpValue = otp.join('');

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (otpValue.length < 6) {
      setOtpError('Please fill all 6 digits of the passcode.');
      return;
    }
    setVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await shareAPI.verifyOtp(token, otpValue);
      if (res.data.success) setStep(2);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to verify passcode.';
      setOtpError(msg);
      if (err.response?.status === 403 || msg.includes('locked')) {
        setErrorStatus('locked');
        setErrorMessage(msg);
      }
      // Shake OTP boxes
      otpRefs.current[0]?.parentElement?.classList?.add('shake');
      setTimeout(
        () => otpRefs.current[0]?.parentElement?.classList?.remove('shake'),
        600
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  /* ── Drag-and-drop & File Selection ── */
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSelectedFiles = (selectedList) => {
    setUploadError('');
    const allowed = ['pdf', 'docx', 'doc', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'];
    const valid = [];

    for (const f of selectedList) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) {
        setUploadError(`File '${f.name}' is not supported. Allowed formats: PDF, DOCX, DOC, XLSX, XLS, JPG, PNG.`);
        return;
      }
      if (f.size > 35 * 1024 * 1024) {
        setUploadError(`File '${f.name}' exceeds the 35 MB size limit.`);
        return;
      }
      valid.push(f);
    }

    if (linkInfo?.allow_multiple === false) {
      setFiles(valid.slice(0, 1));
    } else {
      setFiles((prev) => {
        // Prevent duplicate filenames
        const existingNames = new Set(prev.map(p => p.name));
        const filteredNew = valid.filter(v => !existingNames.has(v.name));
        return [...prev, ...filteredNew];
      });
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files.length) { setUploadError('Please select at least one file to upload.'); return; }
    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    const formData = new FormData();
    files.forEach(f => {
      formData.append('files', f);
    });
    // For single file backward compatibility
    formData.append('file', files[0]);
    formData.append('otp', otpValue);
    formData.append('uploader_name', uploaderName.trim() || 'Vendor / Recipient');

    try {
      const res = await shareAPI.uploadFile(token, formData, (pct) =>
        setUploadProgress(pct)
      );
      if (res.data.success) {
        setUploadedDetails({
          files: res.data.files || files.map(f => ({ original_name: f.name, file_size: f.size })),
          fileName: files.map(f => f.name).join(', '),
          fileSize: files.reduce((acc, f) => acc + f.size, 0),
          uploadedAt: new Date().toLocaleTimeString(),
          project_name: res.data.project_name || linkInfo?.project_name,
          skid_name: res.data.skid_name || linkInfo?.skid_name,
          component_name: res.data.component_name || linkInfo?.component_name,
          format_of_record: res.data.format_of_record || linkInfo?.format_of_record
        });
        setStep(3);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Please try again.';
      setUploadError(msg);
      if (err.response?.status === 410 || msg.includes('already been used')) {
        setErrorStatus('used');
        setErrorMessage(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
  };

  // Files already submitted through this (now burned) one-time link
  const usedFiles =
    uploadedDetails?.uploaded_files && uploadedDetails.uploaded_files.length
      ? uploadedDetails.uploaded_files
      : uploadedDetails?.file_name
      ? [{ original_name: uploadedDetails.file_name, file_size: null }]
      : [];

  /* ────────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        background: '#0A0E0C',
      }}
    >
      {/* Animated background */}
      <OrbBlobs />
      <ParticleCanvas />

      {/* ── Slim top branding bar ── */}
      <header className="portal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img
            src={logo}
            alt="Biogas Engineering"
            className="portal-logo-img"
            style={{ height: '40px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: '0.85rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#E0E7E3', letterSpacing: '-0.01em' }}>
              Secure Upload Portal
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '-1px' }}>
              One-time encrypted document submission
            </div>
          </div>
        </div>

        
      </header>

      {/* ── Main ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.25rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ width: '100%', maxWidth: '680px' }}>

          {/* ── Loading ── */}
          {loading && (
            <div className="portal-card animate-portal-in" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <div className="portal-spinner-ring">
                <Loader2 size={32} className="spin-glow" color="#10B981" />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' }}>
                Establishing Secure Session
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                Validating one-time token and cryptographic parameters…
              </p>
              <div className="portal-loading-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          {/* ── Error / Expired / Used ── */}
          {!loading && errorStatus && (
            <div
              className="portal-card animate-portal-in"
              style={{
                textAlign: 'center',
                padding: '4rem 2.5rem',
                borderColor:
                  errorStatus === 'used'
                    ? 'rgba(16,185,129,0.4)'
                    : 'rgba(239,68,68,0.4)',
              }}
            >
              <div
                className="portal-status-icon"
                style={{
                  background:
                    errorStatus === 'used'
                      ? 'rgba(16,185,129,0.12)'
                      : 'rgba(239,68,68,0.12)',
                  boxShadow:
                    errorStatus === 'used'
                      ? '0 0 40px rgba(16,185,129,0.28)'
                      : '0 0 40px rgba(239,68,68,0.3)',
                  border:
                    errorStatus === 'used'
                      ? '1px solid rgba(16,185,129,0.35)'
                      : '1px solid rgba(239,68,68,0.35)',
                }}
              >
                {errorStatus === 'used' ? (
                  <CheckCircle2 size={46} color="#10B981" />
                ) : (
                  <ShieldAlert size={46} color="#EF4444" />
                )}
              </div>

              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: '800',
                  color: '#fff',
                  marginBottom: '0.75rem',
                  lineHeight: 1.2,
                }}
              >
                {errorStatus === 'used'
                  ? 'Link Already Used'
                  : errorStatus === 'expired'
                  ? 'Link Expired'
                  : errorStatus === 'locked'
                  ? 'Link Locked'
                  : 'Invalid Link'}
              </h2>

              <p
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  maxWidth: '440px',
                  margin: '0 auto 1.75rem',
                  lineHeight: 1.65,
                  fontSize: '0.95rem',
                }}
              >
                {errorMessage}
              </p>

              {errorStatus === 'used' && uploadedDetails?.used_at && (
                <div className="portal-receipt-mini">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#6EE7B7', fontWeight: '700', marginBottom: '0.7rem', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={15} /> Submission recorded
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginBottom: usedFiles.length ? '0.85rem' : 0 }}>
                    {new Date(uploadedDetails.used_at).toLocaleString()}
                  </div>
                  {usedFiles.length > 0 && (
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {usedFiles.map((f, i) => (
                        <div key={i} className="portal-used-file">
                          <FileText size={15} color="#34D399" style={{ flexShrink: 0 }} />
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                            {f.original_name}
                          </span>
                          {f.file_size != null && (
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.76rem', flexShrink: 0 }}>
                              {formatBytes(f.file_size)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', marginTop: '1.75rem' }}>
                <Lock size={13} /> This single-use link has been permanently burned.
              </div>
            </div>
          )}

          {/* ── Step 3: Success ── */}
          {!loading && !errorStatus && step === 3 && (
            <div
              className="portal-card animate-portal-in"
              style={{
                textAlign: 'center',
                padding: '4rem 2.5rem',
                borderColor: 'rgba(16,185,129,0.45)',
              }}
            >
              <div className="portal-success-pulse">
                <CheckCircle2 size={52} color="#10B981" />
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' }}>
                Upload Complete!
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.95rem', lineHeight: 1.65 }}>
                {uploadedDetails?.component_name
                  ? `Your format of record has been securely submitted and attached to ${uploadedDetails.skid_name || 'Skid'} > ${uploadedDetails.component_name}.`
                  : `Your document(s) have been securely transferred and encrypted in the vault.`}
              </p>

              {/* QAP Component badge in confirmation */}
              {uploadedDetails?.component_name && (
                <div style={{
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.4rem' }}>
                    <div>🏗️ Project: <strong style={{ color: '#FFF' }}>{uploadedDetails.project_name}</strong></div>
                    <div>⚙️ Skid: <strong style={{ color: '#FFF' }}>{uploadedDetails.skid_name}</strong></div>
                    <div>🔍 Component: <strong style={{ color: '#A7F3D0' }}>{uploadedDetails.component_name}</strong></div>
                    <div>📄 Record: <strong style={{ color: '#4ADE80' }}>{uploadedDetails.format_of_record}</strong></div>
                  </div>
                </div>
              )}

              {/* Files receipt list */}
              <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {uploadedDetails?.files && uploadedDetails.files.length > 0 ? (
                  uploadedDetails.files.map((uf, fIdx) => (
                    <div key={fIdx} className="portal-file-receipt" style={{ padding: '0.75rem 1rem' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(16,185,129,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <FileText size={20} color="#34D399" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <div style={{ fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                          {uf.original_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>
                          {formatBytes(uf.file_size)}
                        </div>
                      </div>
                      <span className="badge badge-manager" style={{ flexShrink: 0 }}>Stored</span>
                    </div>
                  ))
                ) : (
                  <div className="portal-file-receipt">
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(16,185,129,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <FileText size={26} color="#34D399" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {uploadedDetails?.fileName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
                        {formatBytes(uploadedDetails?.fileSize)} • {uploadedDetails?.uploadedAt}
                      </div>
                    </div>
                    <span className="badge badge-manager" style={{ flexShrink: 0 }}>Stored</span>
                  </div>
                )}
              </div>

              <div className="portal-burn-notice">
                <Lock size={16} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Single-Use Burned:</strong> This link and passcode are now permanently deactivated. You may safely close this window.
                </div>
              </div>

              {/* Confetti blips */}
              <div className="confetti-container">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="confetti-dot" style={{ '--i': i }} />
                ))}
              </div>
            </div>
          )}

          {/* ── Active Workflow (Steps 1 & 2) ── */}
          {!loading && !errorStatus && step < 3 && (
            <div className="portal-card animate-portal-in">
              {/* Header */}
              <div className="portal-card-header">
                <div style={{ flex: 1 }}>
                  <div className="portal-request-label">Quality Assurance Document Request</div>
                  <h1 style={{ fontSize: '1.55rem', fontWeight: '800', color: '#fff', marginBottom: '0.3rem', lineHeight: 1.25 }}>
                    {linkInfo?.title || 'Secure Upload'}
                  </h1>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.45)' }}>
                    Requested by{' '}
                    <strong style={{ color: '#E0E7FF' }}>{linkInfo?.creator_name}</strong>
                    {linkInfo?.recipient_name && (
                      <>
                        {' '}for{' '}
                        <strong style={{ color: '#E0E7FF' }}>{linkInfo.recipient_name}</strong>
                      </>
                    )}
                  </p>
                </div>
                <div className="portal-expiry-pill">
                  <Clock size={13} color="#FBBF24" />
                  <span>Expires {new Date(linkInfo?.expires_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Quality Assurance Plan (QAP) Details Banner if linked to a Component */}
              {linkInfo?.component_name && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(15,23,42,0.85))',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', background: 'rgba(16,185,129,0.18)', color: '#6EE7B7', padding: '0.2rem 0.65rem', borderRadius: '15px' }}>
                      🏗️ Project: {linkInfo.project_name || 'Biogas Upgrading Plant'}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', background: 'rgba(16,185,129,0.18)', color: '#6EE7B7', padding: '0.2rem 0.65rem', borderRadius: '15px' }}>
                      ⚙️ Skid: {linkInfo.skid_name || 'Blower Package'}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', background: 'rgba(52,211,153,0.18)', color: '#A7F3D0', padding: '0.2rem 0.65rem', borderRadius: '15px' }}>
                      🔍 Component: {linkInfo.component_name}
                    </span>
                  </div>

                  {/* Required Format of Record Alert Box */}
                  <div style={{
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#86EFAC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Required Format of Record
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#FFF', marginTop: '0.15rem' }}>
                        {linkInfo.format_of_record || 'Test Report / Compliance Certificate'}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#86EFAC', background: 'rgba(34,197,94,0.2)', padding: '0.2rem 0.65rem', borderRadius: '12px', fontWeight: '700' }}>
                      {linkInfo.allow_multiple ? '📁 Multiple Files Allowed' : 'Single File'}
                    </span>
                  </div>

                  {linkInfo.component_details && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                      gap: '0.5rem',
                      marginTop: '0.85rem',
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.65)',
                      padding: '0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.25)'
                    }}>
                      {linkInfo.component_details.characteristics && (
                        <div>Characteristics: <strong style={{ color: '#FFF' }}>{linkInfo.component_details.characteristics}</strong></div>
                      )}
                      {linkInfo.component_details.check_requirement && (
                        <div>Checking: <strong style={{ color: '#FFF' }}>{linkInfo.component_details.check_requirement}</strong></div>
                      )}
                      {linkInfo.component_details.ref_document && (
                        <div>Ref: <strong style={{ color: '#FFF' }}>{linkInfo.component_details.ref_document}</strong></div>
                      )}
                      {linkInfo.component_details.quantum_check && (
                        <div>Quantum: <strong style={{ color: '#FFF' }}>{linkInfo.component_details.quantum_check}</strong></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {linkInfo?.notes && (
                <div className="portal-notes">
                  <Sparkles size={14} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#6EE7B7' }}>Instructions: </strong>
                    {linkInfo.notes}
                  </div>
                </div>
              )}

              {/* Step progress */}
              <StepProgress step={step} />

              {/* ── STEP 1: OTP ── */}
              {step === 1 && (
                <form onSubmit={handleVerifyOtp} className="animate-step-in">
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="portal-otp-icon animate-float">
                      <Key size={32} color="#10B981" />
                    </div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', marginBottom: '0.4rem' }}>
                      Enter One-Time Passcode
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', maxWidth: '360px', margin: '0 auto' }}>
                      Enter the 6-digit code provided by the requester
                    </p>
                  </div>

                  {/* OTP Boxes */}
                  <div className="otp-boxes" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`otp-box ${digit ? 'otp-box-filled' : ''} ${otpError ? 'otp-box-error' : ''}`}
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <div className="portal-error-msg animate-slide-up">
                      <AlertCircle size={15} /> {otpError}
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
                    <button
                      type="submit"
                      className="portal-btn-primary"
                      disabled={verifyingOtp || otpValue.length < 6}
                    >
                      {verifyingOtp ? (
                        <>
                          <Loader2 size={18} className="spin-glow" /> Verifying…
                        </>
                      ) : (
                        <>
                          <Zap size={18} /> Unlock & Proceed <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.77rem', color: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <Shield size={12} /> Rate-limited • Max 5 attempts
                  </div>
                </form>
              )}

              {/* ── STEP 2: Upload ── */}
              {step === 2 && (
                <form onSubmit={handleUpload} className="animate-step-in">
                  {/* Verified badge */}
                  <div className="portal-verified-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontWeight: '700' }}>
                      <ShieldCheck size={18} /> Passcode Verified
                    </div>
                    <button
                      type="button"
                      onClick={() => { setStep(1); }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                    >
                      Change OTP
                    </button>
                  </div>

                  {/* Name field */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="portal-label">Your Name or Organization (Optional)</label>
                    <input
                      type="text"
                      className="portal-input"
                      placeholder="e.g. John Doe / Acme Corp"
                      value={uploaderName}
                      onChange={(e) => setUploaderName(e.target.value)}
                    />
                  </div>

                  {/* Dropzone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`portal-dropzone ${dragActive ? 'portal-dropzone-active' : ''} ${files.length > 0 ? 'portal-dropzone-filled' : ''}`}
                    onClick={() => document.getElementById('spp-file-input').click()}
                  >
                    <input
                      id="spp-file-input"
                      type="file"
                      multiple={linkInfo?.allow_multiple !== false}
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => e.target.files && handleSelectedFiles(Array.from(e.target.files))}
                      style={{ display: 'none' }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="portal-upload-icon animate-float">
                        <UploadCloud size={36} color="#10B981" />
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>
                        {files.length > 0 ? 'Click or drop more files to add' : 'Drop your format of record files here, or click to browse'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                        PDF, Word (.docx), Excel (.xlsx), or Inspection Photographs (JPG, PNG) — Max 35 MB each
                      </div>
                    </div>
                  </div>

                  {/* Queued Selected Files List */}
                  {files.length > 0 && (
                    <div style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: '700', color: '#6EE7B7' }}>
                          Selected Files ({files.length})
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          Total: {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gap: '0.45rem', maxHeight: '180px', overflowY: 'auto' }}>
                        {files.map((f, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '8px',
                              padding: '0.55rem 0.85rem',
                              fontSize: '0.84rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                              <FileText size={16} color="#34D399" style={{ flexShrink: 0 }} />
                              <span style={{ color: '#FFF', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {f.name}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', flexShrink: 0 }}>
                                ({formatBytes(f.size)})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveFile(i); }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Remove file"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="portal-error-msg animate-slide-up" style={{ marginTop: '0.75rem' }}>
                      <AlertCircle size={15} /> {uploadError}
                    </div>
                  )}

                  {/* Progress bar */}
                  {uploading && (
                    <div style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                        <span>Encrypting & uploading {files.length} file(s)…</span>
                        <span style={{ color: '#fff', fontWeight: '700' }}>{uploadProgress}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          className="progress-bar-animated"
                          style={{
                            height: '100%',
                            width: `${uploadProgress}%`,
                            background: 'linear-gradient(90deg,#10B981,#34D399)',
                            boxShadow: '0 0 12px rgba(16,185,129,0.6)',
                            borderRadius: '3px',
                            transition: 'width 0.2s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* One-time warning */}
                  <div className="portal-one-time-notice" style={{ marginTop: '1rem' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>One-Time Notice:</strong> This link can only be used once. After upload, it will be permanently sealed and recorded.
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="portal-btn-primary"
                    disabled={uploading || files.length === 0}
                    style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={18} className="spin-glow" /> Uploading ({uploadProgress}%)…
                      </>
                    ) : (
                      <>
                        <FileUp size={18} /> Upload & Submit {files.length > 0 ? `${files.length} Format of Record File${files.length > 1 ? 's' : ''}` : 'Files'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="portal-footer">
        <Shield size={13} />
        S3 Cloud Vault · Rate-Limited · Single-Use Nonce · TLS 1.3
      </footer>
    </div>
  );
};

export default SharePortalPage;
