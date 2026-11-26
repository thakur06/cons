import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Package,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Layers,
  Settings,
  FileDown
} from 'lucide-react';
import { projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PackageDetail from './PackageDetail';
import ExportPdfModal from './ExportPdfModal';

const ProjectDetail = ({ project, onBack, onSelectFileView }) => {
  const { isAdmin } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [skidType, setSkidType] = useState('blower');
  const [creating, setCreating] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await projectAPI.getPackages(project.id);
      setPackages(res.data.packages || []);
    } catch {
      setError('Failed to load packages / skids.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [project.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const effectiveName = name.trim() || (skidType === 'blower' ? 'Blower Package' : '');
    if (!effectiveName) return;

    setCreating(true);
    try {
      await projectAPI.createPackage(project.id, {
        name: effectiveName,
        skid_type: skidType,
        autoSeedBlowerQap: skidType === 'blower'
      });
      setName('');
      fetchPackages();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create package / skid.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this package and all its components?')) return;
    try {
      await projectAPI.deletePackage(id);
      fetchPackages();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete.');
    }
  };

  if (selectedPackage) {
    return (
      <PackageDetail
        project={project}
        pkg={selectedPackage}
        onBack={() => {
          setSelectedPackage(null);
          fetchPackages();
        }}
        onSelectFileView={onSelectFileView}
      />
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={onBack}>
          <ArrowLeft size={15} /> All Projects
        </button>
        <ChevronRight size={14} color="var(--text-muted)" />
        <span style={{ fontWeight: '700', fontSize: '1rem', color: '#FFF' }}>{project.name}</span>
        {project.code && (
          <span style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#A5B4FC',
            padding: '0.1rem 0.55rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700'
          }}>
            #{project.code}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={22} color="var(--primary)" />
          <h3 style={{ margin: 0, fontWeight: '800' }}>Skids & Packages in this Project</h3>
        </div>
        {packages.length > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => setExportModalOpen(true)}
            style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <FileDown size={15} /> Export PDF
          </button>
        )}
      </div>

      {/* Create Package / Skid Form */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.35rem' }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '170px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Skid Type
            </label>
            <select
              className="input-field"
              value={skidType}
              onChange={(e) => {
                const val = e.target.value;
                setSkidType(val);
                if (val === 'blower' && !name) setName('Blower Package');
              }}
            >
              <option value="blower">⚙️ Blower Package (Standard QAP)</option>
              <option value="general">📦 Custom Skid / Package</option>
            </select>
          </div>

          <div style={{ flex: '2', minWidth: '200px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Skid Name *
            </label>
            <input
              className="input-field"
              placeholder={skidType === 'blower' ? 'Blower Package' : 'e.g. Scrubber Skid, Compressor Skid'}
              value={name}
              onChange={e => setName(e.target.value)}
              required={skidType !== 'blower'}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={creating} style={{ minWidth: '130px' }}>
            {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Add Skid
          </button>
        </form>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="spin" />
        </div>
      ) : packages.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          <Package size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
          <p>No skids added yet. Add a Blower Package or custom skid above.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {packages.map(pkg => {
            const isBlower = pkg.skid_type === 'blower' || pkg.name.toLowerCase().includes('blower');
            return (
              <div
                key={pkg.id}
                className="glass-card"
                onClick={() => setSelectedPackage(pkg)}
                style={{
                  padding: '1.1rem 1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                  border: isBlower ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--border-color)',
                  background: isBlower ? 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(15,23,42,0.6))' : 'var(--card-bg)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = isBlower ? 'rgba(99,102,241,0.35)' : 'var(--border-color)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isBlower ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-highlight)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Package size={20} color={isBlower ? 'var(--primary-light)' : 'var(--text-muted)'} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '800', fontSize: '1rem', color: '#FFF' }}>{pkg.name}</span>
                      {isBlower && (
                        <span style={{
                          padding: '0.12rem 0.55rem',
                          borderRadius: '20px',
                          background: 'rgba(99,102,241,0.18)',
                          border: '1px solid rgba(99,102,241,0.35)',
                          color: '#A5B4FC',
                          fontSize: '0.72rem',
                          fontWeight: '800'
                        }}>
                          ⚙️ Blower QAP Plan
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {pkg.requirement_count} component operation{pkg.requirement_count !== 1 ? 's' : ''} defined
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isAdmin && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.55rem' }}
                      onClick={(e) => handleDelete(pkg.id, e)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Export PDF Modal */}
      <ExportPdfModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        project={project}
        initialPackages={packages}
      />
    </div>
  );
};

export default ProjectDetail;
