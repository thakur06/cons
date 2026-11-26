import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, ChevronRight, Hash, Loader2, AlertCircle, Search } from 'lucide-react';
import { projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProjectDetail from './ProjectDetail';

const ProjectsPage = ({ onSelectFileView }) => {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectAPI.getProjects();
      setProjects(res.data.projects);
    } catch { setError('Failed to load projects.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await projectAPI.createProject({ name: name.trim(), code: code.trim() });
      setName(''); setCode('');
      fetchProjects();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create project.'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project and all its data?')) return;
    try {
      await projectAPI.deleteProject(id);
      fetchProjects();
    } catch (err) { setError(err.response?.data?.error || 'Failed to delete.'); }
  };

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => { setSelectedProject(null); fetchProjects(); }}
        onSelectFileView={onSelectFileView}
      />
    );
  }

  const filteredProjects = projects.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Minimal Header + Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FolderOpen size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>Projects</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({filteredProjects.length})</span>
        </div>

        <div style={{ position: 'relative', minWidth: '200px', flex: '0 1 260px' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            className="input-field"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.4rem 0.7rem 0.4rem 2rem', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {/* Minimal Create Project Bar */}
      <div className="glass-card" style={{ padding: '0.65rem 0.85rem', marginBottom: '1rem' }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input-field"
            placeholder="New project name *"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ flex: '2', minWidth: '170px', padding: '0.42rem 0.7rem', fontSize: '0.82rem' }}
          />
          <input
            className="input-field"
            placeholder="Code (optional)"
            value={code}
            onChange={e => setCode(e.target.value)}
            style={{ flex: '1', minWidth: '110px', padding: '0.42rem 0.7rem', fontSize: '0.82rem' }}
          />
          <button type="submit" className="btn btn-primary" disabled={creating} style={{ padding: '0.42rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} New
          </button>
        </form>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '0.65rem', borderRadius: '8px', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}><Loader2 size={24} className="spin" /></div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {search ? 'No matching projects found.' : 'No projects yet. Create your first project above.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {filteredProjects.map(p => (
            <div key={p.id} className="glass-card" onClick={() => setSelectedProject(p)}
              style={{ padding: '0.85rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.6rem', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FolderOpen size={15} color="var(--primary)" />
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                </div>
                {isAdmin && (
                  <button className="btn btn-secondary" style={{ padding: '0.25rem 0.4rem', flexShrink: 0 }} onClick={(e) => handleDelete(p.id, e)} title="Delete project">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {p.code && (
                    <span style={{ background: 'rgba(16,185,129,0.12)', color: '#6EE7B7', padding: '0.1rem 0.45rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Hash size={9} />{p.code}
                    </span>
                  )}
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{p.package_count} skid{p.package_count !== '1' ? 's' : ''}</span>
                </div>
                <ChevronRight size={15} color="var(--text-muted)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
