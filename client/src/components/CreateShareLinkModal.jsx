import React, { useState, useEffect } from 'react';
import {
  X,
  Link as LinkIcon,
  Key,
  Copy,
  Check,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Layers,
  FolderOpen,
  Package,
  FileCheck2,
  Files
} from 'lucide-react';
import { shareAPI, projectAPI } from '../services/api';

const CreateShareLinkModal = ({ isOpen, onClose, onCreated, initialData = null }) => {
  // Mode: 'component' (Project/Skid QAP record) vs 'general'
  const [mode, setMode] = useState(initialData?.requirementId ? 'component' : 'component');

  // Project hierarchy state
  const [projects, setProjects] = useState([]);
  const [packages, setPackages] = useState([]);
  const [requirements, setRequirements] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState(initialData?.projectId || '');
  const [selectedPackageId, setSelectedPackageId] = useState(initialData?.packageId || '');
  const [selectedRequirementId, setSelectedRequirementId] = useState(initialData?.requirementId || '');

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  const [title, setTitle] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [allowMultiple, setAllowMultiple] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState('');

  // Generated Link state
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Load Projects on open
  useEffect(() => {
    if (!isOpen) return;
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const res = await projectAPI.getProjects();
        const pList = res.data.projects || [];
        setProjects(pList);

        if (initialData?.projectId) {
          setSelectedProjectId(initialData.projectId);
        } else if (pList.length > 0 && !selectedProjectId) {
          setSelectedProjectId(pList[0].id);
        }
      } catch (err) {
        console.error('Failed to load projects', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, [isOpen]);

  // Load Packages (Skids) when Project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setPackages([]);
      setSelectedPackageId('');
      return;
    }
    const currP = projects.find(p => p.id === selectedProjectId);
    setSelectedProject(currP || null);

    const loadPackages = async () => {
      try {
        const res = await projectAPI.getPackages(selectedProjectId);
        const pkList = res.data.packages || [];
        setPackages(pkList);

        if (initialData?.packageId && pkList.some(pk => pk.id === initialData.packageId)) {
          setSelectedPackageId(initialData.packageId);
        } else if (pkList.length > 0) {
          // If a blower skid is present, select it preferentially
          const blowerPk = pkList.find(pk => (pk.skid_type === 'blower' || pk.name.toLowerCase().includes('blower')));
          setSelectedPackageId(blowerPk ? blowerPk.id : pkList[0].id);
        } else {
          setSelectedPackageId('');
        }
      } catch (err) {
        console.error('Failed to load packages', err);
      }
    };
    loadPackages();
  }, [selectedProjectId, projects]);

  // Load Requirements (Components) when Package changes
  useEffect(() => {
    if (!selectedPackageId) {
      setRequirements([]);
      setSelectedRequirementId('');
      return;
    }
    const currPk = packages.find(pk => pk.id === selectedPackageId);
    setSelectedPackage(currPk || null);

    const loadRequirements = async () => {
      try {
        const res = await projectAPI.getRequirements(selectedPackageId);
        const reqList = res.data.requirements || [];
        setRequirements(reqList);

        if (initialData?.requirementId && reqList.some(r => r.id === initialData.requirementId)) {
          setSelectedRequirementId(initialData.requirementId);
        } else if (reqList.length > 0) {
          setSelectedRequirementId(reqList[0].id);
        } else {
          setSelectedRequirementId('');
        }
      } catch (err) {
        console.error('Failed to load requirements', err);
      }
    };
    loadRequirements();
  }, [selectedPackageId, packages]);

  // Auto-populate Title & metadata when Requirement changes
  useEffect(() => {
    if (!selectedRequirementId || !requirements.length) {
      setSelectedRequirement(null);
      return;
    }
    const currReq = requirements.find(r => r.id === selectedRequirementId);
    setSelectedRequirement(currReq || null);

    if (currReq) {
      const pName = selectedProject?.name || 'Project';
      const pkName = selectedPackage?.name || 'Skid';
      const compName = currReq.name;
      const fmt = currReq.format_of_record ? ` - ${currReq.format_of_record}` : '';
      setTitle(`[${pkName}] ${compName}${fmt}`);
    }
  }, [selectedRequirementId, requirements, selectedPackage, selectedProject]);

  if (!isOpen) return null;

  const handleReset = () => {
    setTitle('');
    setRecipientName('');
    setRecipientEmail('');
    setNotes('');
    setExpiresInHours('24');
    setAllowMultiple(true);
    setError('');
    setGeneratedLink(null);
    setCopiedLink(false);
    setCopiedOtp(false);
    setCopiedAll(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title or purpose for this upload request.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        recipient_name: recipientName.trim() || undefined,
        recipient_email: recipientEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        expiresInHours: parseInt(expiresInHours, 10),
        allow_multiple: allowMultiple
      };

      if (mode === 'component' && selectedRequirement) {
        payload.project_id = selectedProjectId;
        payload.package_id = selectedPackageId;
        payload.requirement_id = selectedRequirementId;
        payload.project_name = selectedProject?.name || '';
        payload.skid_name = selectedPackage?.name || '';
        payload.component_name = selectedRequirement?.name || '';
        payload.format_of_record = selectedRequirement?.format_of_record || '';
      }

      const res = await shareAPI.generateLink(payload);

      const fullShareUrl = `${window.location.origin}?share=${res.data.link.token}`;
      setGeneratedLink({
        ...res.data.link,
        fullUrl: fullShareUrl,
        project_name: payload.project_name,
        skid_name: payload.skid_name,
        component_name: payload.component_name,
        format_of_record: payload.format_of_record,
        allow_multiple: allowMultiple
      });

      if (onCreated) onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate one-time link.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else if (type === 'otp') {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
    } else if (type === 'all') {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const getFullShareMessage = () => {
    if (!generatedLink) return '';
    const isComp = !!generatedLink.component_name;

    if (isComp) {
      return `📋 QUALITY ASSURANCE RECORD SUBMISSION REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ Project: ${generatedLink.project_name || 'Biogas Engineering Plant'}
⚙️ Skid / Package: ${generatedLink.skid_name || 'Blower Package'}
🔍 Component / Operation: ${generatedLink.component_name}
📄 Required Format of Record: ${generatedLink.format_of_record || 'Compliance Certificate / Test Report'}
📁 Multiple Files Allowed: ${generatedLink.allow_multiple ? 'Yes (Submit all related files/photos)' : 'Single File'}

🔗 Secure Upload Portal: ${generatedLink.fullUrl}
🔑 One-Time Passcode (OTP): ${generatedLink.otp}
⏰ Expiration: Valid for ${expiresInHours} Hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please enter the 6-digit OTP passcode at the link above to submit your inspection format of record.`;
    }

    return `Hello! Please securely upload your document (${generatedLink.title}):\n\n🔗 Upload Link: ${generatedLink.fullUrl}\n🔑 One-Time Passcode (OTP): ${generatedLink.otp}\n\n⚠️ Note: This link and passcode can only be used once. After you upload your file, the link will permanently close.`;
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-container"
        style={{
          maxWidth: '620px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '50%',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#FFF'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={20} />
        </button>

        {!generatedLink ? (
          // FORM VIEW
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 18px rgba(16, 185, 129, 0.25)'
              }}>
                <LinkIcon size={24} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#FFF' }}>
                  Generate Component Upload Link
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Request format of record files for a specific project skid & component.
                </p>
              </div>
            </div>

            {/* Mode Toggle Tabs */}
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.25rem',
              borderRadius: '8px',
              marginBottom: '1.35rem',
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => setMode('component')}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  background: mode === 'component' ? 'var(--primary)' : 'transparent',
                  color: mode === 'component' ? '#FFF' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <Layers size={14} /> Project Skid & Component (QAP)
              </button>
              <button
                type="button"
                onClick={() => setMode('general')}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  background: mode === 'general' ? 'var(--primary)' : 'transparent',
                  color: mode === 'general' ? '#FFF' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <LinkIcon size={14} /> General File Vault Link
              </button>
            </div>

            {error && (
              <div
                className="animate-slide-up"
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#F87171',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {mode === 'component' && (
                <div style={{
                  padding: '1.1rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                  marginBottom: '1.35rem'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    {/* Project Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-main)' }}>
                        1. Target Project <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <select
                        className="input-field"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        required
                      >
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.code ? `(${p.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Skid / Package Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-main)' }}>
                        2. Skid / Package <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <select
                        className="input-field"
                        value={selectedPackageId}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                        required
                        disabled={!packages.length}
                      >
                        {packages.map(pk => (
                          <option key={pk.id} value={pk.id}>
                            {pk.name} {pk.skid_type === 'blower' ? '⚙️ (Blower)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Component / Operation Selector */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '0.3rem', color: 'var(--text-main)' }}>
                      3. Component / Operation (e.g. for Blower) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      className="input-field"
                      value={selectedRequirementId}
                      onChange={(e) => setSelectedRequirementId(e.target.value)}
                      required
                      disabled={!requirements.length}
                      style={{ fontWeight: '600', color: 'var(--primary-light)' }}
                    >
                      {requirements.map(req => (
                        <option key={req.id} value={req.id}>
                          {req.name} {req.format_of_record ? `→ [Format: ${req.format_of_record}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Auto-selected Component Details Banner */}
                  {selectedRequirement && (
                    <div style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(6, 18, 14, 0.75)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: '700', color: '#34D399' }}>
                          📄 Expected Format of Record:
                        </span>
                        <span style={{
                          padding: '0.15rem 0.6rem',
                          borderRadius: '20px',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          color: '#4ADE80',
                          fontWeight: '800',
                          fontSize: '0.75rem'
                        }}>
                          {selectedRequirement.format_of_record || 'Report / Certificate'}
                        </span>
                      </div>

                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                        {selectedRequirement.characteristics && (
                          <div>Characteristics: <strong style={{ color: '#E2E8F0' }}>{selectedRequirement.characteristics}</strong></div>
                        )}
                        {selectedRequirement.check_requirement && (
                          <div>Checking: <strong style={{ color: '#E2E8F0' }}>{selectedRequirement.check_requirement}</strong></div>
                        )}
                        {selectedRequirement.ref_document && (
                          <div>Ref Drawing: <strong style={{ color: '#E2E8F0' }}>{selectedRequirement.ref_document}</strong></div>
                        )}
                        {selectedRequirement.quantum_check && (
                          <div>Quantum: <strong style={{ color: '#E2E8F0' }}>{selectedRequirement.quantum_check}</strong></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Title Field */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Request Title <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. [Blower Package] SHAFT - T.C/ COMPLIANCE REPORT"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Recipient & Expiry */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                    Recipient / Vendor Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Blower Manufacturer Quality Dept"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                    Expires In
                  </label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    className="input-field"
                  >
                    <option value="1">1 Hour</option>
                    <option value="6">6 Hours</option>
                    <option value="24">24 Hours (1 Day)</option>
                    <option value="72">3 Days</option>
                    <option value="168">7 Days</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                  Instructions / Notes for Recipient (Optional)
                </label>
                <textarea
                  className="input-field"
                  placeholder="e.g. Please provide chemical & mechanical analysis test certificates for the shaft per BS970."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>

              {/* Allow Multiple Files Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Files size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Allow Multiple Files</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Recipient can upload multiple inspection reports / photographs in one submission
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ minWidth: '150px' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Generate Link & OTP
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          // SUCCESS GENERATED VIEW
          <div className="animate-slide-up">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.85rem',
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.25)'
              }}>
                <Check size={28} color="#22C55E" />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFF' }}>
                Component Upload Link Ready!
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0.25rem auto 0' }}>
                Share this secure link and OTP with your vendor. It is configured specifically for this Project, Skid, and Component.
              </p>
            </div>

            {/* Component Summary Card */}
            {generatedLink.component_name && (
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                marginBottom: '1.25rem',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  <div>🏗️ Project: <strong style={{ color: '#FFF' }}>{generatedLink.project_name}</strong></div>
                  <div>⚙️ Skid: <strong style={{ color: '#FFF' }}>{generatedLink.skid_name}</strong></div>
                  <div>🔍 Component: <strong style={{ color: '#34D399' }}>{generatedLink.component_name}</strong></div>
                  <div>📋 Format: <strong style={{ color: '#4ADE80' }}>{generatedLink.format_of_record}</strong></div>
                </div>
              </div>
            )}

            {/* Link Box */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                🔗 One-Time Upload Link
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={generatedLink.fullUrl}
                  className="input-field"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    background: 'rgba(15, 23, 42, 0.65)'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => copyToClipboard(generatedLink.fullUrl, 'link')}
                  style={{ flexShrink: 0, minWidth: '85px' }}
                >
                  {copiedLink ? <><Check size={14} color="#22C55E" /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            </div>

            {/* OTP Box */}
            <div style={{ marginBottom: '1.35rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                🔑 One-Time Passcode (OTP)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  letterSpacing: '0.35em',
                  color: '#34D399',
                  padding: '0.45rem'
                }}>
                  {generatedLink.otp}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => copyToClipboard(generatedLink.otp, 'otp')}
                  style={{ flexShrink: 0, minWidth: '85px' }}
                >
                  {copiedOtp ? <><Check size={14} color="#22C55E" /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            </div>

            {/* Full Message Copy Button */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => copyToClipboard(getFullShareMessage(), 'all')}
                style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
              >
                {copiedAll ? (
                  <>
                    <Check size={16} /> Full QA Submission Message Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy Complete Vendor Request Message
                  </>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Generate Another Link
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleClose}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateShareLinkModal;
