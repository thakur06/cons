import React, { useState, useEffect } from 'react';
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Send,
  Loader2,
  AlertCircle,
  Layers,
  Files
} from 'lucide-react';
import { shareAPI, projectAPI } from '../services/api';

const CreateShareLinkModal = ({ isOpen, onClose, onCreated, initialData = null }) => {
  const [mode, setMode] = useState('component');

  const [projects, setProjects] = useState([]);
  const [packages, setPackages] = useState([]);
  const [requirements, setRequirements] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedRequirementId, setSelectedRequirementId] = useState('');

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  const [title, setTitle] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [allowMultiple, setAllowMultiple] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [generatedLink, setGeneratedLink] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setMode(initialData?.requirementId ? 'component' : 'component');
    setSelectedProjectId(initialData?.projectId || '');
    setSelectedPackageId(initialData?.packageId || '');
    setSelectedRequirementId(initialData?.requirementId || '');
    setTitle('');
    setRecipientName('');
    setNotes('');
    setExpiresInHours('24');
    setAllowMultiple(true);
    setError('');
    setGeneratedLink(null);
    setCopiedLink(false);
    setCopiedOtp(false);
    setCopiedAll(false);

    const loadProjects = async () => {
      try {
        const res = await projectAPI.getProjects();
        const pList = res.data.projects || [];
        setProjects(pList);

        if (initialData?.projectId) {
          setSelectedProjectId(initialData.projectId);
        } else if (pList.length > 0) {
          setSelectedProjectId(pList[0].id);
        }
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    };
    loadProjects();
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!selectedProjectId) {
      setPackages([]);
      setSelectedPackageId('');
      setSelectedProject(null);
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
          const blowerPk = pkList.find(pk => (pk.skid_type === 'blower' || (pk.name || '').toLowerCase().includes('blower')));
          setSelectedPackageId(blowerPk ? blowerPk.id : pkList[0].id);
        } else {
          setSelectedPackageId('');
        }
      } catch (err) {
        console.error('Failed to load packages', err);
      }
    };
    loadPackages();
  }, [selectedProjectId, projects, initialData]);

  useEffect(() => {
    if (!selectedPackageId) {
      setRequirements([]);
      setSelectedRequirementId('');
      setSelectedPackage(null);
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
  }, [selectedPackageId, packages, initialData]);

  useEffect(() => {
    if (!selectedRequirementId || !requirements.length) {
      setSelectedRequirement(null);
      return;
    }
    const currReq = requirements.find(r => r.id === selectedRequirementId);
    setSelectedRequirement(currReq || null);

    if (currReq) {
      const pkName = selectedPackage?.name || 'Skid';
      const fmt = currReq.format_of_record ? ` - ${currReq.format_of_record}` : '';
      setTitle(`[${pkName}] ${currReq.name}${fmt}`);
    }
  }, [selectedRequirementId, requirements, selectedPackage]);

  if (!isOpen) return null;

  const handleReset = () => {
    setTitle('');
    setRecipientName('');
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
      setError('Please provide a title for this upload request.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        recipient_name: recipientName.trim() || undefined,
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

      setGeneratedLink({
        ...res.data.link,
        fullUrl: `${window.location.origin}?share=${res.data.link.token}`,
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
    if (generatedLink.component_name) {
      return `QAP upload request
Project: ${generatedLink.project_name || '-'}
Skid: ${generatedLink.skid_name || '-'}
Component: ${generatedLink.component_name}
Format: ${generatedLink.format_of_record || '-'}
Link: ${generatedLink.fullUrl}
OTP: ${generatedLink.otp}
Expires in: ${expiresInHours} hours`;
    }
    return `Upload request (${generatedLink.title})
Link: ${generatedLink.fullUrl}
OTP: ${generatedLink.otp}`;
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              {generatedLink ? 'Link ready' : 'New upload link'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
              {generatedLink ? 'Copy the link and OTP to send to the vendor.' : 'Generate a one-time OTP upload link.'}
            </p>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        {!generatedLink ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
            <div className="modal-body">
              <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '0.2rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)'
              }}>
                <button
                  type="button"
                  onClick={() => setMode('component')}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.55rem',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    background: mode === 'component' ? 'var(--primary)' : 'transparent',
                    color: mode === 'component' ? '#FFF' : 'var(--text-muted)'
                  }}
                >
                  <Layers size={13} /> Component
                </button>
                <button
                  type="button"
                  onClick={() => setMode('general')}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.55rem',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    background: mode === 'general' ? 'var(--primary)' : 'transparent',
                    color: mode === 'general' ? '#FFF' : 'var(--text-muted)'
                  }}
                >
                  <LinkIcon size={13} /> General
                </button>
              </div>

              {error && (
                <div style={{
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#F87171',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  marginBottom: '0.9rem'
                }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {mode === 'component' && (
                <div className="share-form-grid" style={{ marginBottom: '0.85rem' }}>
                  <div>
                    <label className="field-label">Project</label>
                    <select
                      className="input-field"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      required
                    >
                      {projects.length === 0 && <option value="">No projects</option>}
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.code ? ` (${p.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Skid</label>
                    <select
                      className="input-field"
                      value={selectedPackageId}
                      onChange={(e) => setSelectedPackageId(e.target.value)}
                      required
                      disabled={!packages.length}
                    >
                      {packages.length === 0 && <option value="">No skids</option>}
                      {packages.map(pk => (
                        <option key={pk.id} value={pk.id}>{pk.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="field-label">Component</label>
                    <select
                      className="input-field"
                      value={selectedRequirementId}
                      onChange={(e) => setSelectedRequirementId(e.target.value)}
                      required
                      disabled={!requirements.length}
                    >
                      {requirements.length === 0 && <option value="">No components</option>}
                      {requirements.map(req => (
                        <option key={req.id} value={req.id}>
                          {req.name}{req.format_of_record ? ` — ${req.format_of_record}` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedRequirement?.format_of_record && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Expected format: {selectedRequirement.format_of_record}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="field-label">Title</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Upload request title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="share-form-grid" style={{ marginBottom: '0.85rem' }}>
                <div>
                  <label className="field-label">Recipient</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Vendor name (optional)"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Expires</label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    className="input-field"
                  >
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="field-label">Notes</label>
                <textarea
                  className="input-field"
                  placeholder="Optional instructions"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.55rem 0.7rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600 }}>
                  <Files size={14} color="var(--primary)" /> Allow multiple files
                </span>
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><Loader2 size={14} className="spin" /> Generating...</> : <><Send size={14} /> Generate</>}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="modal-body">
              {generatedLink.component_name && (
                <div style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.9rem',
                  lineHeight: 1.55
                }}>
                  {[generatedLink.project_name, generatedLink.skid_name, generatedLink.component_name].filter(Boolean).join(' / ')}
                  {generatedLink.format_of_record ? ` · ${generatedLink.format_of_record}` : ''}
                </div>
              )}

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="field-label">Upload link</label>
                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <input
                    type="text"
                    readOnly
                    value={generatedLink.fullUrl}
                    className="input-field"
                    style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(generatedLink.fullUrl, 'link')}
                    style={{ flexShrink: 0 }}
                  >
                    {copiedLink ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="field-label">OTP</label>
                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    letterSpacing: '0.28em',
                    color: 'var(--text-main)',
                    padding: '0.45rem'
                  }}>
                    {generatedLink.otp}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(generatedLink.otp, 'otp')}
                    style={{ flexShrink: 0 }}
                  >
                    {copiedOtp ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                New link
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copyToClipboard(getFullShareMessage(), 'all')}
              >
                {copiedAll ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy invite</>}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateShareLinkModal;
