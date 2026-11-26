import React, { useState, useEffect } from 'react';
import {
  X, FileDown, Loader2, ChevronUp, ChevronDown,
  AlertTriangle, FileText, Package, CheckCircle2, GripVertical, Paperclip
} from 'lucide-react';
import { projectAPI } from '../services/api';

/**
 * ExportPdfModal
 * Lets users reorder skids and their components, then export as a single PDF.
 * Missing documents are flagged with a warning badge and noted in the PDF.
 */
const ExportPdfModal = ({ isOpen, onClose, project, initialPackages }) => {
  const [skids, setSkids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingReqId, setUploadingReqId] = useState(null);
  const [error, setError] = useState('');

  // ── On open: load components for each package ─────────────────────────────
  useEffect(() => {
    if (!isOpen || !initialPackages?.length) return;
    loadAllComponents();
  }, [isOpen, initialPackages]);

  const loadAllComponents = async () => {
    setLoading(true);
    setError('');
    try {
      const enriched = await Promise.all(
        initialPackages.map(async (pkg) => {
          // Always fetch latest components & file status from API
          const res = await projectAPI.getRequirements(pkg.id);
          const reqs = res.data.requirements || [];
          return { ...pkg, components: reqs };
        })
      );
      setSkids(enriched);
    } catch (e) {
      setError('Failed to load component details.');
    } finally {
      setLoading(false);
    }
  };

  // ── Skid reorder ─────────────────────────────────────────────────────────
  const moveSkid = (index, dir) => {
    const next = [...skids];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSkids(next);
  };

  // ── Component reorder within a skid ───────────────────────────────────────
  const moveComponent = (skidIndex, compIndex, dir) => {
    const next = skids.map((s, si) => {
      if (si !== skidIndex) return s;
      const comps = [...s.components];
      const target = compIndex + dir;
      if (target < 0 || target >= comps.length) return s;
      [comps[compIndex], comps[target]] = [comps[target], comps[compIndex]];
      return { ...s, components: comps };
    });
    setSkids(next);
  };

  // ── Quick inline attach file(s) ────────────────────────────────────────────
  const handleQuickAttach = async (reqId, fileList) => {
    const selectedFiles = Array.from(fileList || []);
    if (selectedFiles.length === 0) return;
    setUploadingReqId(reqId);
    setError('');
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));
    try {
      await projectAPI.uploadRequirementFile(reqId, formData);
      await loadAllComponents();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to attach file(s).');
    } finally {
      setUploadingReqId(null);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const skidOrder = skids.map(s => s.id);
      const componentOrder = {};
      skids.forEach(s => {
        componentOrder[s.id] = s.components.map(c => c.id);
      });

      const response = await projectAPI.exportProjectPdf(project.id, { skidOrder, componentOrder });

      // Check if response is actually a JSON error wrapped in Blob
      if (response.data && response.data.type === 'application/json') {
        const text = await response.data.text();
        const errJson = JSON.parse(text);
        throw new Error(errJson.error || 'Export failed');
      }

      // Trigger browser download with unique timestamped filename
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeProjName = (project.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_');
      const timeTag = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
      a.href = url;
      a.download = `QAP_${safeProjName}_${timeTag}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (e) {
      setError('Export failed. Please try again. ' + (e.response?.data?.error || e.message || ''));
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const totalFiles = skids.reduce((s, sk) => s + sk.components.reduce((cs, c) => cs + (c.file_count || 0), 0), 0);
  const missingCount = skids.reduce((s, sk) => s + sk.components.filter(c => !c.file_count || c.file_count === 0).length, 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--card-bg, #0F172A)',
        border: '1px solid var(--border-highlight, rgba(255,255,255,0.1))',
        borderRadius: '16px',
        width: '100%', maxWidth: '680px',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
      }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileDown size={22} color='#A5B4FC' />
            <div>
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.05rem', color: '#FFF' }}>
                Export QAP as PDF
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)' }}>
                {project.name} — drag ▲▼ to set page order
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #94A3B8)', padding: '0.3rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Summary strip ───────────────────────────────────────────────── */}
        <div style={{
          padding: '0.75rem 1.5rem',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))',
          display: 'flex', gap: '1.5rem', flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Package size={13} /> {skids.length} skid{skids.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileText size={13} /> {totalFiles} file{totalFiles !== 1 ? 's' : ''} received
          </span>
          {missingCount > 0 && (
            <span style={{ fontSize: '0.8rem', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertTriangle size={13} /> {missingCount} missing document{missingCount !== 1 ? 's' : ''} — will appear as placeholder pages
            </span>
          )}
        </div>

        {/* ── Skid + component list ────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <Loader2 size={26} className='spin' />
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Loading components…</p>
            </div>
          ) : skids.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No skids found in this project.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {skids.map((skid, si) => (
                <div key={skid.id} style={{
                  border: '1px solid var(--border-highlight, rgba(255,255,255,0.1))',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  {/* Skid header row */}
                  <div style={{
                    background: 'rgba(99,102,241,0.1)',
                    padding: '0.65rem 0.85rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    <GripVertical size={15} color='#64748B' style={{ flexShrink: 0 }} />
                    <span style={{
                      background: 'rgba(99,102,241,0.25)',
                      color: '#A5B4FC',
                      borderRadius: '6px',
                      padding: '0.1rem 0.5rem',
                      fontSize: '0.72rem', fontWeight: '800', flexShrink: 0
                    }}>
                      SKID {si + 1}
                    </span>
                    <span style={{ flex: 1, fontWeight: '700', fontSize: '0.92rem', color: '#FFF' }}>{skid.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {skid.components.length} component{skid.components.length !== 1 ? 's' : ''}
                    </span>
                    {/* Up / Down arrows for skid */}
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={() => moveSkid(si, -1)}
                        disabled={si === 0}
                        style={{ ...arrowBtn, opacity: si === 0 ? 0.3 : 1 }}
                        title='Move skid up'
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveSkid(si, 1)}
                        disabled={si === skids.length - 1}
                        style={{ ...arrowBtn, opacity: si === skids.length - 1 ? 0.3 : 1 }}
                        title='Move skid down'
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Components */}
                  {skid.components.map((comp, ci) => {
                    const hasFiles = comp.file_count > 0;
                    return (
                      <div
                        key={comp.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.85rem',
                          borderTop: '1px solid rgba(255,255,255,0.04)',
                          background: hasFiles ? 'transparent' : 'rgba(239,68,68,0.04)'
                        }}
                      >
                        {/* Number badge */}
                        <span style={{
                          width: '26px', height: '26px', borderRadius: '6px',
                          background: hasFiles ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                          color: hasFiles ? '#4ADE80' : '#94A3B8',
                          fontSize: '0.72rem', fontWeight: '800',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          border: hasFiles ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)'
                        }}>
                          {ci + 1}
                        </span>

                        {/* Component Name & Report Name according to sequence */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {comp.name}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ color: '#818CF8', fontWeight: '600' }}>Report:</span>
                            <span style={{ color: '#E2E8F0' }}>{comp.format_of_record || 'T.C/ COMPLIANCE REPORT'}</span>
                          </div>
                          {comp.files && comp.files.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '3px' }}>
                              {comp.files.map(f => (
                                <span
                                  key={f.id}
                                  style={{
                                    fontSize: '0.68rem',
                                    color: '#93C5FD',
                                    background: 'rgba(59,130,246,0.12)',
                                    border: '1px solid rgba(59,130,246,0.25)',
                                    borderRadius: '4px',
                                    padding: '0.05rem 0.35rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                >
                                  <Paperclip size={10} /> {f.original_name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Files status + Inline Attach */}
                        {hasFiles ? (
                          <span style={{
                            fontSize: '0.72rem', color: '#4ADE80',
                            display: 'flex', alignItems: 'center', gap: '0.25rem'
                          }}>
                            <CheckCircle2 size={12} />
                            {comp.file_count} file{comp.file_count !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{
                              fontSize: '0.72rem', color: '#FCA5A5',
                              display: 'flex', alignItems: 'center', gap: '0.25rem',
                              background: 'rgba(239,68,68,0.12)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              padding: '0.1rem 0.4rem', borderRadius: '5px'
                            }}>
                              <AlertTriangle size={11} /> MISSING
                            </span>
                            <label
                              style={{
                                fontSize: '0.7rem',
                                color: '#A5B4FC',
                                background: 'rgba(99,102,241,0.15)',
                                border: '1px solid rgba(99,102,241,0.35)',
                                padding: '0.12rem 0.45rem',
                                borderRadius: '5px',
                                cursor: uploadingReqId === comp.id ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: '600'
                              }}
                              title='Attach PDF or image directly to this component'
                            >
                              {uploadingReqId === comp.id
                                ? <Loader2 size={11} className='spin' />
                                : <Paperclip size={11} />}
                              {uploadingReqId === comp.id ? 'Uploading…' : 'Attach'}
                              <input
                                type='file'
                                multiple
                                accept='.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx'
                                style={{ display: 'none' }}
                                disabled={uploadingReqId === comp.id}
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files && files.length > 0) handleQuickAttach(comp.id, files);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        )}

                        {/* Up / Down arrows for component */}
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          <button
                            onClick={() => moveComponent(si, ci, -1)}
                            disabled={ci === 0}
                            style={{ ...arrowBtn, opacity: ci === 0 ? 0.3 : 1 }}
                            title='Move component up'
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={() => moveComponent(si, ci, 1)}
                            disabled={ci === skid.components.length - 1}
                            style={{ ...arrowBtn, opacity: ci === skid.components.length - 1 ? 0.3 : 1 }}
                            title='Move component down'
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            margin: '0 1.5rem 0.5rem',
            padding: '0.65rem 0.85rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', color: '#FCA5A5', fontSize: '0.82rem',
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          display: 'flex', justifyContent: 'flex-end', gap: '0.65rem'
        }}>
          <button
            className='btn btn-secondary'
            onClick={onClose}
            disabled={exporting}
            style={{ fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button
            className='btn btn-primary'
            onClick={handleExport}
            disabled={exporting || loading || skids.length === 0}
            style={{ minWidth: '155px', fontSize: '0.85rem' }}
          >
            {exporting
              ? <><Loader2 size={15} className='spin' /> Generating PDF…</>
              : <><FileDown size={15} /> Export PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const arrowBtn = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '5px',
  color: '#94A3B8',
  cursor: 'pointer',
  padding: '0.15rem 0.3rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1
};

export default ExportPdfModal;

