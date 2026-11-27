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
  Paperclip,
  Search
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
  const [search, setSearch] = useState('');

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

  const handleSeedChillerQap = async () => {
    setSeeding(true);
    setError('');
    try {
      await projectAPI.seedChillerQap(pkg.id);
      fetchRequirements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load standard Chiller QAP components.');
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedElectricalPanelQap = async () => {
    setSeeding(true);
    setError('');
    try {
      await projectAPI.seedElectricalPanelQap(pkg.id);
      fetchRequirements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load standard Electrical Panel QAP components.');
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
  const isChillerSkid = pkg.skid_type === 'chiller' || pkg.name.toLowerCase().includes('chiller');
  const isElectricalPanelSkid = pkg.skid_type === 'electrical_panel' || pkg.name.toLowerCase().includes('electrical') || pkg.name.toLowerCase().includes('panel');

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
        {isChillerSkid && (
          <span style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#38BDF8',
            padding: '0.15rem 0.65rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            ❄️ Chiller Package QAP
          </span>
        )}
        {isElectricalPanelSkid && (
          <span style={{
            background: 'rgba(250, 204, 21, 0.15)',
            border: '1px solid rgba(250, 204, 21, 0.35)',
            color: '#FACC15',
            padding: '0.15rem 0.65rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            ⚡ Electrical Panel QAP
          </span>
        )}
      </div>

      {/* Minimal Header Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem',
        marginBottom: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <ClipboardList size={18} color="var(--primary)" />
          <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.05rem' }}>
            Components
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({requirements.length})</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '185px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              className="input-field"
              placeholder="Search components..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.38rem 0.65rem 0.38rem 1.95rem', fontSize: '0.8rem' }}
            />
          </div>

          {isBlowerSkid && requirements.length === 0 && (
            <button
              className="btn btn-primary"
              onClick={handleSeedBlowerQap}
              disabled={seeding}
              style={{ padding: '0.38rem 0.75rem', fontSize: '0.8rem' }}
            >
              {seeding ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              Load Blower QAP (9)
            </button>
          )}
          {isChillerSkid && requirements.length === 0 && (
            <button
              className="btn btn-primary"
              onClick={handleSeedChillerQap}
              disabled={seeding}
              style={{ padding: '0.38rem 0.75rem', fontSize: '0.8rem' }}
            >
              {seeding ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              Load Chiller QAP (7)
            </button>
          )}
          {isElectricalPanelSkid && requirements.length === 0 && (
            <button
              className="btn btn-primary"
              onClick={handleSeedElectricalPanelQap}
              disabled={seeding}
              style={{ padding: '0.38rem 0.75rem', fontSize: '0.8rem' }}
            >
              {seeding ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              Load Panel QAP (10)
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ padding: '0.38rem 0.75rem', fontSize: '0.8rem' }}
          >
            <Plus size={14} /> {showAddForm ? 'Cancel' : 'Add'}
          </button>

          {requirements.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => setExportModalOpen(true)}
              style={{
                fontSize: '0.8rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.38rem 0.8rem',
                cursor: 'pointer'
              }}
              title="Generate consolidated PDF with all received documents and missing doc warnings"
            >
              <FileDown size={14} /> Generate PDF
            </button>
          )}
        </div>
      </div>

      {/* Minimal Add Custom Component Form */}
      {showAddForm && (
        <div className="glass-card animate-slide-up" style={{ padding: '0.75rem 0.9rem', marginBottom: '0.9rem' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="input-field"
              placeholder="Component name *"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{ flex: '1.5', minWidth: '150px', padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
            />
            <input
              className="input-field"
              placeholder="Format of record *"
              value={formatOfRecord}
              onChange={e => setFormatOfRecord(e.target.value)}
              required
              style={{ flex: '1.5', minWidth: '150px', padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
            />
            <input
              className="input-field"
              placeholder="Characteristics"
              value={characteristics}
              onChange={e => setCharacteristics(e.target.value)}
              style={{ flex: '1', minWidth: '120px', padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
            />
            <input
              className="input-field"
              placeholder="Checking req."
              value={checkRequirement}
              onChange={e => setCheckRequirement(e.target.value)}
              style={{ flex: '1', minWidth: '120px', padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
            />
            <input
              className="input-field"
              placeholder="Ref document"
              value={refDocument}
              onChange={e => setRefDocument(e.target.value)}
              style={{ flex: '1', minWidth: '110px', padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
            />
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Save
            </button>
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
              : isChillerSkid
              ? 'Click below to instantly load all 7 standard components from the Chiller Quality Assurance Plan (QAP).'
              : isElectricalPanelSkid
              ? 'Click below to instantly load all 10 standard components from the Electrical Panel Quality Assurance Plan (QAP).'
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
          {isChillerSkid && (
            <button
              className="btn btn-primary"
              onClick={handleSeedChillerQap}
              disabled={seeding}
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', border: 'none' }}
            >
              {seeding ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              Load Standard Chiller QAP (7 Components)
            </button>
          )}
          {isElectricalPanelSkid && (
            <button
              className="btn btn-primary"
              onClick={handleSeedElectricalPanelQap}
              disabled={seeding}
              style={{ background: 'linear-gradient(135deg, #EAB308, #CA8A04)', border: 'none', color: '#0F172A', fontWeight: '700' }}
            >
              {seeding ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              Load Standard Electrical Panel QAP (10 Components)
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
          {requirements
            .filter(req => {
              const q = search.trim().toLowerCase();
              if (!q) return true;
              return (
                (req.name || '').toLowerCase().includes(q) ||
                (req.format_of_record || '').toLowerCase().includes(q) ||
                (req.characteristics || '').toLowerCase().includes(q) ||
                (req.ref_document || '').toLowerCase().includes(q)
              );
            })
            .map((req, index) => {
            const hasFiles = req.file_count > 0;
            const allDone = hasFiles && req.completed_count === req.file_count;

            return (
              <div
                key={req.id}
                className="glass-card animate-slide-up"
                onClick={() => setSelectedReq(req)}
                style={{
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  transition: 'all 0.2s',
                  border: '1px solid var(--border-color)',
                  animationDelay: `${index * 0.03}s`
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                {/* Top row: sequence badge + component name + reorder / delete */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {req.name}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveComponent(index, -1); }}
                      disabled={index === 0 || reordering}
                      title="Move up in sequence"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--primary)',
                        cursor: index === 0 ? 'default' : 'pointer',
                        padding: '3px',
                        lineHeight: 1,
                        display: 'flex',
                        opacity: index === 0 ? 0.35 : 1
                      }}
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveComponent(index, 1); }}
                      disabled={index === requirements.length - 1 || reordering}
                      title="Move down in sequence"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--primary)',
                        cursor: index === requirements.length - 1 ? 'default' : 'pointer',
                        padding: '3px',
                        lineHeight: 1,
                        display: 'flex',
                        opacity: index === requirements.length - 1 ? 0.35 : 1
                      }}
                    >
                      <ChevronDown size={13} />
                    </button>
                    {isAdmin && (
                      <button className="btn btn-secondary" style={{ padding: '0.2rem 0.34rem' }} onClick={(e) => handleDelete(req.id, e)} title="Delete component">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                  
                {/* Format badge + metadata + attached files */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
                  {req.format_of_record && (
                    <span style={{
                      alignSelf: 'flex-start',
                      maxWidth: '100%',
                      padding: '0.12rem 0.5rem',
                      borderRadius: '20px',
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      color: '#6EE7B7',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <FileText size={10} /> Format: {req.format_of_record}
                    </span>
                  )}

                  {(req.characteristics || req.check_requirement || req.ref_document || req.quantum_check) && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.12rem' }}>
                      {req.characteristics && (
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Characteristics: <strong style={{ color: 'var(--text-secondary)' }}>{req.characteristics}</strong></span>
                      )}
                      {req.check_requirement && (
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Checking: <strong style={{ color: 'var(--text-secondary)' }}>{req.check_requirement}</strong></span>
                      )}
                      {req.ref_document && (
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ref: <strong style={{ color: 'var(--text-secondary)' }}>{req.ref_document}</strong></span>
                      )}
                      {req.quantum_check && (
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Quantum: <strong style={{ color: 'var(--text-secondary)' }}>{req.quantum_check}</strong></span>
                      )}
                    </div>
                  )}

                  {req.files && req.files.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {req.files.map(f => (
                        <span
                          key={f.id}
                          style={{
                            fontSize: '0.7rem',
                            color: '#6EE7B7',
                            background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.25)',
                            borderRadius: '6px',
                            padding: '0.1rem 0.45rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            maxWidth: '100%'
                          }}
                        >
                          <Paperclip size={10} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{f.original_name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom row: files received + upload / link actions + open */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                  <div style={{
                    padding: '0.28rem 0.55rem',
                    borderRadius: '8px',
                    background: hasFiles ? (allDone ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)') : 'rgba(255,255,255,0.04)',
                    color: hasFiles ? (allDone ? 'var(--primary)' : '#FBBF24') : 'var(--text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <FileText size={12} />
                    {req.file_count || 0} file{req.file_count !== 1 ? 's' : ''}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <label
                      className="btn btn-secondary"
                      style={{
                        padding: '0.32rem 0.55rem',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        cursor: uploadingReqId === req.id ? 'wait' : 'pointer'
                      }}
                      title="Upload PDF or image directly to this component"
                    >
                      {uploadingReqId === req.id
                        ? <Loader2 size={12} className="spin" />
                        : <Paperclip size={12} />}
                      {uploadingReqId === req.id ? 'Uploading…' : 'Upload'}
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

                    <button
                      className="btn btn-primary"
                      onClick={(e) => handleOpenShareLink(req, e)}
                      style={{
                        padding: '0.32rem 0.6rem',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                      title="Generate and send link for this component to receive format of record"
                    >
                      <Send size={12} /> Link
                    </button>

                    <ChevronRight size={15} color="var(--text-muted)" />
                  </div>
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
