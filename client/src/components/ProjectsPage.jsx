import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, ChevronRight, Hash, Loader2, AlertCircle } from 'lucide-react';
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <FolderOpen size={28} color="var(--primary)" />
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Projects</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Manage project packages, requirements, and files</p>
        </div>
      </div>

      {/* Create Project Form */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2', minWidth: '180px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Project Name *</label>
            <input className="input-field" placeholder="e.g. Website Redesign" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={{ flex: '1', minWidth: '130px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Code (optional)</label>
            <input className="input-field" placeholder="e.g. WR-01" value={code} onChange={e => setCode(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating} style={{ whiteSpace: 'nowrap' }}>
            {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} New Project
          </button>
        </form>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><Loader2 size={28} className="spin" /></div>
      ) : projects.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <FolderOpen size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
          <p>No projects yet. Create your first project above.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {projects.map(p => (
            <div key={p.id} className="glass-card" onClick={() => setSelectedProject(p)}
              style={{ padding: '1.1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderOpen size={20} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem' }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', alignItems: 'center' }}>
                    {p.code && (
                      <span style={{ background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', padding: '0.1rem 0.5rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Hash size={10} />{p.code}
                      </span>
                    )}
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.package_count} package{p.package_count !== '1' ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isAdmin && (
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={(e) => handleDelete(p.id, e)} title="Delete project">
                    <Trash2 size={15} />
                  </button>
                )}
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
