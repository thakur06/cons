import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import FileViewerModal from './components/FileViewerModal';
import StatsCards from './components/StatsCards';
import AdminPanel from './components/AdminPanel';
import ShareLinksPanel from './components/ShareLinksPanel';
import SharePortalPage from './components/SharePortalPage';
import ProjectsPage from './components/ProjectsPage';
import { fileAPI, userAPI } from './services/api';
import { ShieldAlert, Cloud, Lock, Link2, Layers } from 'lucide-react';

const MainApp = () => {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [viewFile, setViewFile] = useState(null);
  const [storageType, setStorageType] = useState('AWS S3 Bucket');

  // Detect one-time share token in URL query or path
  const [shareToken, setShareToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('share')) return params.get('share');
    if (params.get('link')) return params.get('link');

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if ((pathParts[0] === 'share' || pathParts[0] === 'share-upload') && pathParts[1]) {
      return pathParts[1];
    }
    return null;
  });

  const fetchFilesAndStats = async () => {
    if (!user) return;
    setLoadingFiles(true);
    try {
      const [filesRes, statsRes] = await Promise.all([
        fileAPI.listFiles(),
        userAPI.getStats()
      ]);
      setFiles(filesRes.data.files || []);
      setStorageType(filesRes.data.storage_type);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFilesAndStats();
  }, [user]);

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete '${fileName}' from Amazon S3 storage?`)) return;

    try {
      await fileAPI.deleteFile(fileId);
      fetchFilesAndStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete file.');
    }
  };

  // If a guest user opens a One-Time Share Link, render the dedicated secure upload portal
  if (shareToken) {
    return (
      <SharePortalPage
        token={shareToken}
        onExit={() => {
          setShareToken(null);
          window.history.replaceState({}, '', window.location.pathname.replace(/\/share(-upload)?\/[^\/]+/, '') || '/');
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onOpenAuth={() => setAuthModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-container">
        {!user ? (
          <div className="glass-card hero-card animate-slide-up" style={{ padding: '3.5rem 2rem', textAlign: 'center', marginTop: '1.5rem' }}>
            <div style={{
              width: '68px', height: '68px', borderRadius: '50%',
              background: 'var(--primary-light)',
              border: '1px solid var(--border-highlight)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.5rem',
              boxShadow: '0 0 30px rgba(16,185,129,0.35)'
            }}>
              <Cloud size={34} color="var(--primary)" />
            </div>

            <h1 className="hero-title" style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
              Amazon S3 PDF & DOCX File Manager
            </h1>

            <p style={{ color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto 2rem', fontSize: '1rem', lineHeight: '1.65' }}>
              Securely upload, view, download, and manage documents with Rate-Limiter Protection, One-Time OTP Share Links, and Role-Based Access Control.
            </p>

            <div className="upload-btn-row" style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }} onClick={() => setAuthModalOpen(true)}>
                <Lock size={17} /> Sign In to Access Vault
              </button>
            </div>
          </div>
        ) : (
          <>
            <StatsCards stats={stats} loading={loadingFiles} />

            {activeTab === 'projects' ? (
              <ProjectsPage onSelectFileView={(file) => setViewFile(file)} />
            ) : activeTab === 'files' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.85rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('share-links')}
                    style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Link2 size={15} color="var(--primary)" /> One-Time Upload Links
                  </button>
                </div>

                <FileUpload onUploadSuccess={fetchFilesAndStats} />

                <FileList
                  files={files}
                  loading={loadingFiles}
                  storageType={storageType}
                  onSelectFileView={(file) => setViewFile(file)}
                  onDeleteFile={handleDeleteFile}
                  onRefresh={fetchFilesAndStats}
                />
              </>
            ) : activeTab === 'share-links' ? (
              <ShareLinksPanel onSelectFileView={(file) => setViewFile(file)} />
            ) : (
              <AdminPanel />
            )}
          </>
        )}
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {viewFile && (
        <FileViewerModal
          file={viewFile}
          onClose={() => setViewFile(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
