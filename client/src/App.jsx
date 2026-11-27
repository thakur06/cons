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
import { Lock } from 'lucide-react';
import logo from './assets/images/biogaseng.png';

const MainApp = () => {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [viewFile, setViewFile] = useState(null);
  const [storageType, setStorageType] = useState('AWS S3 Bucket');

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
          <div className="hero-card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <img
              src={logo}
              alt="Biogas Engineering"
              style={{ height: '56px', width: 'auto', objectFit: 'contain', margin: '0 auto 1.25rem', display: 'block' }}
            />
            <h1 className="hero-title" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.45rem', color: 'var(--text-main)' }}>
              Document vault
            </h1>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.35rem', fontSize: '0.9rem', lineHeight: 1.55 }}>
              Sign in to manage projects, files, and one-time upload links.
            </p>
            <button className="btn btn-primary" onClick={() => setAuthModalOpen(true)}>
              <Lock size={15} /> Sign in
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'projects' ? (
              <ProjectsPage onSelectFileView={(file) => setViewFile(file)} />
            ) : activeTab === 'files' ? (
              <>
                <StatsCards stats={stats} loading={loadingFiles} />
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
