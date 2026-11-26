import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  ArrowLeft,
  AlertCircle,
  FileDown,
  Search
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
  const [search, setSearch] = useState('');
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

  const filteredPackages = packages.filter(pkg => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (pkg.name || '').toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }} onClick={onBack}>
          <ArrowLeft size={14} /> Projects
        </button>
        <ChevronRight size={13} color="var(--text-muted)" />
        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#FFF' }}>{project.name}</span>
        {project.code && (
          <span style={{
            background: 'rgba(16,185,129,0.12)',
            color: '#6EE7B7',
            padding: '0.1rem 0.45rem',
            borderRadius: '12px',
            fontSize: '0.7rem',
            fontWeight: '700'
          }}>
            #{project.code}
          </span>
        )}
      </div>

      {/* Minimal Header + Search + Export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Package size={18} color="var(--primary)" />
          <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.05rem' }}>Skids</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({filteredPackages.length})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '180px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              className="input-field"
              placeholder="Search skids..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.38rem 0.65rem 0.38rem 1.95rem', fontSize: '0.8rem' }}
            />
          </div>
          {packages.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => setExportModalOpen(true)}
              style={{ padding: '0.38rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FileDown size={14} /> Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Minimal Add Skid Bar */}
      <div className="glass-card" style={{ padding: '0.65rem 0.85rem', marginBottom: '1rem' }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="input-field"
            value={skidType}
            onChange={(e) => {
              const val = e.target.value;
              setSkidType(val);
              if (val === 'blower' && !name) setName('Blower Package');
              if (val === 'chiller' && !name) setName('Chiller Package');
              if (val === 'electrical_panel' && !name) setName('Electrical Panel');
            }}
            style={{ flex: '1', minWidth: '150px', padding: '0.42rem 0.65rem', fontSize: '0.8rem' }}
          >
            <option value="blower">Blower Package</option>
            <option value="chiller">Chiller Package</option>
            <option value="electrical_panel">Electrical Panel</option>
            <option value="general">Custom Skid</option>
          </select>

          <input
            className="input-field"
            placeholder={skidType === 'blower' ? 'Blower Package' : 'Skid name *'}
            value={name}
            onChange={e => setName(e.target.value)}
            required={skidType !== 'blower'}
            style={{ flex: '2', minWidth: '170px', padding: '0.42rem 0.7rem', fontSize: '0.82rem' }}
          />

          <button type="submit" className="btn btn-primary" disabled={creating} style={{ padding: '0.42rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Add
          </button>
        </form>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '0.65rem', borderRadius: '8px', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="spin" />
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {search ? 'No matching skids found.' : 'No skids added yet. Add one above.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.75rem' }}>
          {filteredPackages.map(pkg => (
            <div
              key={pkg.id}
              className="glass-card"
              onClick={() => setSelectedPackage(pkg)}
              style={{
                padding: '0.85rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.55rem',
                transition: 'all 0.2s',
                border: '1px solid var(--border-color)'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: 'rgba(16,185,129,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Package size={15} color="var(--primary)" />
                  </div>
                  <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pkg.name}
                  </span>
                </div>

                {isAdmin && (
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.4rem', flexShrink: 0 }}
                    onClick={(e) => handleDelete(pkg.id, e)}
                    title="Delete skid"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {pkg.requirement_count} item{pkg.requirement_count !== 1 ? 's' : ''}
                </span>
                <ChevronRight size={15} color="var(--text-muted)" />
              </div>
            </div>
          ))}
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
