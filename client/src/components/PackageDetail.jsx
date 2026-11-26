import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  FileText,
  Link2,
  Sparkles,
  Layers,
  Send,
  Eye,
  ShieldCheck,
  Check,
  ChevronUp,
  ChevronDown,
  FileDown,
  GripVertical,
  Paperclip
} from 'lucide-react';
import { projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RequirementDetail from './RequirementDetail';
import CreateShareLinkModal from './CreateShareLinkModal';
import ExportPdfModal from './ExportPdfModal';

const PackageDetail = ({ project, pkg, onBack, onSelectFileView }) => {
  const { isAdmin } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [reordering, setReordering] = useState(false);

  // Quick Component form state
  const [name, setName] = useState('');
  const [formatOfRecord, setFormatOfRecord] = useState('T.C/ COMPLIANCE REPORT');
  const [characteristics, setCharacteristics] = useState('');
  const [checkRequirement, setCheckRequirement] = useState('');
  const [refDocument, setRefDocument] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState(null);

  // Export PDF modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Direct quick upload state
  const [uploadingReqId, setUploadingReqId] = useState(null);

  const handleQuickUpload = async (reqId, fileList) => {
    const selectedFiles = Array.from(fileList || []);
    if (selectedFiles.length === 0) return;
    setUploadingReqId(reqId);
    setError('');
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));
    try {
      await projectAPI.uploadRequirementFile(reqId, formData);
      await fetchRequirements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload document(s).');
    } finally {
      setUploadingReqId(null);
    }
  };

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const res = await projectAPI.getRequirements(pkg.id);
      setRequirements(res.data.requirements);
    } catch {
      setError('Failed to load components / requirements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [pkg.id]);

  // ── Move a component up or down and persist sort_order ───────────────────
  const moveComponent = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= requirements.length) return;
    const next = [...requirements];
    [next[index], next[target]] = [next[target], next[index]];
    setRequirements(next);                        // optimistic UI update
    setReordering(true);
    try {
      await projectAPI.reorderRequirements(pkg.id, next.map(r => r.id));
    } catch {
      setError('Failed to save new order. Please try again.');
      fetchRequirements();                        // revert on failure
    } finally {
      setReordering(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await projectAPI.createRequirement(pkg.id, {
        name: name.trim(),
        format_of_record: formatOfRecord.trim(),
        characteristics: characteristics.trim() || undefined,
        check_requirement: checkRequirement.trim() || undefined,
        ref_document: refDocument.trim() || undefined
      });
      setName('');
      setCharacteristics('');
      setCheckRequirement('');
      setRefDocument('');
      setShowAddForm(false);
      fetchRequirements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create component.');
    } finally {
      setCreating(false);
    }
  };

  const handleSeedBlowerQap = async () => {
    setSeeding(true);
    setError('');
    try {
      await projectAPI.seedBlowerQap(pkg.id);
      fetchRequirements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load standard Blower QAP components.');
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this component and all its uploaded files?')) return;
    try {
      await projectAPI.deleteRequirement(id);
      fetchRequirements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete.');
    }
  };

  const handleOpenShareLink = (req, e) => {
    e.stopPropagation();
    setShareModalData({
      projectId: project.id,
      packageId: pkg.id,
      requirementId: req.id,
      componentName: req.name,
      formatOfRecord: req.format_of_record,
      skidName: pkg.name,
      projectName: project.name
    });
    setShareModalOpen(true);
  };

  if (selectedReq) {
    return (
      <RequirementDetail
        project={project}
        pkg={pkg}
        requirement={selectedReq}
        onBack={() => {
          setSelectedReq(null);
          fetchRequirements();
        }}
        onSelectFileView={onSelectFileView}
      />
    );
  }

  const isBlowerSkid = pkg.skid_type === 'blower' || pkg.name.toLowerCase().includes('blower');

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={onBack}>
          <ArrowLeft size={15} /> {project.name}
        </button>
        <ChevronRight size={14} color="var(--text-muted)" />
        <span style={{ fontWeight: '700', fontSize: '1rem', color: '#FFF' }}>{pkg.name}</span>
        {isBlowerSkid && (
          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34D399',
            padding: '0.15rem 0.65rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            ⚙️ Blower Package QAP
          </span>
        )}
      </div>

      {/* Header Banner */}
      <div className="glass-card" style={{
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,18,14,0.75))',
        border: '1px solid var(--border-highlight)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <ClipboardList size={22} color="var(--primary)" />
            <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.3rem' }}>
              Quality Assurance Plan (QAP) Components
            </h3>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
            Select any component operation to send an upload link and receive the required format of record files.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {isBlowerSkid && requirements.length === 0 && (
            <button
              className="btn btn-primary"
              onClick={handleSeedBlowerQap}
              disabled={seeding}
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none' }}
            >
              {seeding ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              Load Standard Blower QAP (9 Components)
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ fontSize: '0.82rem' }}
          >
            <Plus size={15} /> {showAddForm ? 'Cancel' : 'Add Custom Component'}
          </button>

          {requirements.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => setExportModalOpen(true)}
              style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: '0 0 18px rgba(99,102,241,0.35)',
                border: 'none',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
              title="Generate consolidated PDF with all received documents and missing doc warnings"
            >
              <FileDown size={16} /> Generate PDF
            </button>
          )}
        </div>
      </div>

      {/* Add Custom Component Form */}
      {showAddForm && (
        <div className="glass-card animate-slide-up" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--primary)' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '800' }}>Add Component Operation</h4>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Component / Operation Name *
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. IMPELLER"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Required Format of Record *
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. T.C/ COMPLIANCE REPORT, PHOTOGRAPHS"
                  value={formatOfRecord}
                  onChange={e => setFormatOfRecord(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Characteristics
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. CHEMICAL & MECHANICAL"
                  value={characteristics}
                  onChange={e => setCharacteristics(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Requirement for Checking
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. TENSILE TEST MEASUREMENT"
                  value={checkRequirement}
                  onChange={e => setCheckRequirement(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Ref Document / Drawing
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. IS 210:1993, GA DRAWING"
                  value={refDocument}
                  onChange={e => setRefDocument(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Save Component
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="spin" />
        </div>
      ) : requirements.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <ClipboardList size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>No component operations defined yet.</p>
          <p style={{ maxWidth: '420px', margin: '0.25rem auto 1.5rem', fontSize: '0.85rem' }}>
            {isBlowerSkid
              ? 'Click below to instantly load all 9 standard components from the Blower Quality Assurance Plan (QAP).'
              : 'Add your first component operation using the button above.'}
          </p>
          {isBlowerSkid && (
            <button
              className="btn btn-primary"
              onClick={handleSeedBlowerQap}
              disabled={seeding}
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none' }}
            >
              {seeding ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              Load Standard Blower QAP (9 Components)
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {requirements.map((req, index) => {
            const hasFiles = req.file_count > 0;
            const allDone = hasFiles && req.completed_count === req.file_count;

            return (
              <div
                key={req.id}
                className="glass-card"
                onClick={() => setSelectedReq(req)}
                style={{
                  padding: '1.15rem 1.35rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                  border: '1px solid var(--border-color)',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                {/* Left: Sequence index & reorder controls + Component details */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: '1 1 340px' }}>
                  
                  {/* Sequence number with Up/Down buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveComponent(index, -1); }}
                        disabled={index === 0 || reordering}
                        title="Move up in sequence"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: index === 0 ? '#475569' : '#A5B4FC',
                          cursor: index === 0 ? 'default' : 'pointer',
                          padding: '2px 4px',
                          lineHeight: 1,
                          display: 'flex', alignItems: 'center'
                        }}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveComponent(index, 1); }}
                        disabled={index === requirements.length - 1 || reordering}
                        title="Move down in sequence"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: index === requirements.length - 1 ? '#475569' : '#A5B4FC',
                          cursor: index === requirements.length - 1 ? 'default' : 'pointer',
                          padding: '2px 4px',
                          lineHeight: 1,
                          display: 'flex', alignItems: 'center'
                        }}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>

                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34D399',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      flexShrink: 0,
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      {index + 1}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '800', fontSize: '1rem', color: '#FFF' }}>
                        {req.name}
                      </span>

                      {/* Format of Record Badge */}
                      {req.format_of_record && (
                        <span style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: '20px',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.35)',
                          color: '#4ADE80',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          📄 Format: {req.format_of_record}
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                      {req.characteristics && (
                        <span>Characteristics: <strong style={{ color: '#E2E8F0' }}>{req.characteristics}</strong></span>
                      )}
                      {req.check_requirement && (
                        <span>Checking: <strong style={{ color: '#E2E8F0' }}>{req.check_requirement}</strong></span>
                      )}
                      {req.ref_document && (
                        <span>Ref: <strong style={{ color: '#E2E8F0' }}>{req.ref_document}</strong></span>
                      )}
                      {req.quantum_check && (
                        <span>Quantum: <strong style={{ color: '#E2E8F0' }}>{req.quantum_check}</strong></span>
                      )}
                    </div>

                    {/* Attached file names */}
                    {req.files && req.files.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        {req.files.map(f => (
                          <span
                            key={f.id}
                            style={{
                              fontSize: '0.72rem',
                              color: '#93C5FD',
                              background: 'rgba(59, 130, 246, 0.12)',
                              border: '1px solid rgba(59, 130, 246, 0.28)',
                              borderRadius: '6px',
                              padding: '0.12rem 0.5rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.28rem'
                            }}
                          >
                            <Paperclip size={11} /> {f.original_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Files Status + Upload Doc + Send Link + Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {/* Files Received Count Tag */}
                  <div style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    background: hasFiles ? (allDone ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)') : 'rgba(255,255,255,0.04)',
                    color: hasFiles ? (allDone ? '#22C55E' : '#FBBF24') : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <FileText size={13} />
                    {req.file_count || 0} file{req.file_count !== 1 ? 's' : ''} received
                  </div>

                  {/* Direct Upload Doc Button */}
                  <label
                    className="btn btn-secondary"
                    style={{
                      padding: '0.42rem 0.75rem',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: uploadingReqId === req.id ? 'wait' : 'pointer',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      color: '#C7D2FE'
                    }}
                    title="Upload PDF or image directly to this component"
                  >
                    {uploadingReqId === req.id
                      ? <Loader2 size={13} className="spin" />
                      : <Paperclip size={13} />}
                    {uploadingReqId === req.id ? 'Uploading…' : 'Upload Doc'}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                      style={{ display: 'none' }}
                      disabled={uploadingReqId === req.id}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) handleQuickUpload(req.id, files);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {/* Send Link Button */}
                  <button
                    className="btn btn-primary"
                    onClick={(e) => handleOpenShareLink(req, e)}
                    style={{
                      padding: '0.42rem 0.85rem',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 0 16px rgba(16,185,129,0.3)'
                    }}
                    title="Generate and send link for this component to receive format of record"
                  >
                    <Send size={13} /> Send Link
                  </button>

                  {isAdmin && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.42rem 0.6rem' }}
                      onClick={(e) => handleDelete(req.id, e)}
                      title="Delete component"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  <ChevronRight size={16} color="var(--text-muted)" onClick={() => setSelectedReq(req)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Link Modal pre-configured for this Project, Skid, and Component */}
      <CreateShareLinkModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onCreated={() => fetchRequirements()}
        initialData={shareModalData}
      />

      {/* Export PDF Modal — scoped to this single skid */}
      <ExportPdfModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        project={project}
        initialPackages={[{ ...pkg, components: requirements }]}
      />
    </div>
  );
};

export default PackageDetail;
