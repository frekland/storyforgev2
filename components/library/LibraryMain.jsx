// StoryForge Library - Main component with search and navigation
// Note: Using React from window/global scope for browser compatibility
const { useState, useEffect } = window.React || {};

// Check if React is available
if (!window.React) {
  console.warn('⚠️ React not available, LibraryMain cannot initialize');
}

const LibraryMain = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stories') // stories, artwork, characters, scenes
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [showImportModal, setShowImportModal] = useState(false)

  // Library content state
  const [stories, setStories] = useState([])
  const [artwork, setArtwork] = useState([])
  const [characters, setCharacters] = useState([])
  const [scenes, setScenes] = useState([])

  // Initialize with mock data for now
  useEffect(() => {
    setLoading(true);
    
    // Simulate loading
    setTimeout(() => {
      setUser({ email: 'demo@storyforge.com' });
      setLoading(false);
      console.log('📚 Library initialized with demo data');
    }, 1000);
  }, []);

  const loadLibraryContent = () => {
    // For now, initialize with empty arrays
    // TODO: Connect to Supabase later
    setStories([]);
    setArtwork([]);
    setCharacters([]);
    setScenes([]);
  };

  const clearLibraryContent = () => {
    setStories([])
    setArtwork([])
    setCharacters([])
    setScenes([])
  }

  const handleSearch = async (query, newFilters = {}) => {
    setSearchQuery(query)
    setFilters({ ...filters, ...newFilters, search: query })
    
    if (user) {
      await loadLibraryContent(user.id)
    }
  }

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      // Auth state change will handle the cleanup
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Get current tab content
  const getCurrentContent = () => {
    switch (activeTab) {
      case 'stories':
        return stories
      case 'artwork':
        return artwork
      case 'characters':
        return characters
      case 'scenes':
        return scenes
      default:
        return []
    }
  }

  // Get total items count
  const getTotalCount = () => {
    return stories.length + artwork.length + characters.length + scenes.length
  }

  if (loading) {
    return (
      <div className="library-loading">
        <div className="magical-spinner"></div>
        <p className="loading-text">
          <span className="loading-emoji">📚</span>
          <span>Loading your Story Library...</span>
          <span className="loading-emoji">✨</span>
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="library-auth-prompt paper-scrap">
        <div className="auth-content">
          <h2 className="auth-title">
            <span className="auth-icon">📚</span>
            <span>Welcome to Your StoryForge Library!</span>
          </h2>
          <p className="auth-description">
            Create an account to save your stories, artwork, and characters. 
            Build your own magical collection that grows with every adventure!
          </p>
          <div className="auth-features">
            <div className="feature-item">
              <span className="feature-icon">📖</span>
              <span>Save all your stories</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎨</span>
              <span>Gallery of your artwork</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <span>Search and organize</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎧</span>
              <span>Listen anytime</span>
            </div>
          </div>
          <div className="auth-buttons">
            <button className="auth-btn primary" onClick={() => window.location.href = '/signup'}>
              <span>📚 Create Your Library</span>
            </button>
            <button className="auth-btn secondary" onClick={() => window.location.href = '/signin'}>
              <span>🔑 Sign In</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="library-main">
      {/* Library Header */}
      <div className="library-header paper-scrap">
        <div className="header-content">
          <div className="library-title-section">
            <h1 className="library-title">
              <span className="library-icon">📚</span>
              <span>My StoryForge Library</span>
            </h1>
            <div className="library-stats">
              <span className="stat-item">
                <span className="stat-number">{getTotalCount()}</span>
                <span className="stat-label">items</span>
              </span>
              <span className="stat-separator">•</span>
              <span className="stat-item">
                <span className="stat-number">{stories.length}</span>
                <span className="stat-label">stories</span>
              </span>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="import-btn"
              onClick={() => setShowImportModal(true)}
              title="Import artwork for story creation"
            >
              <span className="btn-icon">📥</span>
              <span>Import</span>
            </button>
            
            <div className="user-menu">
              <span className="user-name">{user.email}</span>
              <button className="sign-out-btn" onClick={handleSignOut}>
                <span>🚪 Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Simple Search Bar */}
        <div className="library-search">
          <input 
            type="text"
            placeholder="Search your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="library-nav">
        <div className="nav-tabs">
          {[
            { id: 'stories', label: 'Stories', icon: '📚', count: stories.length },
            { id: 'artwork', label: 'Artwork', icon: '🎨', count: artwork.length },
            { id: 'characters', label: 'Characters', icon: '👤', count: characters.length },
            { id: 'scenes', label: 'Scenes', icon: '🏞️', count: scenes.length }
          ].map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Library Content */}
      <div className="library-content">
        {getCurrentContent().length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'stories' && '📚'}
              {activeTab === 'artwork' && '🎨'}
              {activeTab === 'characters' && '👤'}
              {activeTab === 'scenes' && '🏞️'}
            </div>
            <h3>No {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Yet</h3>
            <p>Your {activeTab} will appear here as you create stories with StoryForge!</p>
            <button className="create-btn" onClick={() => window.location.reload()}>✨ Create Your First Story</button>
          </div>
        ) : (
          <div className="content-grid">
            {getCurrentContent().map((item, index) => (
              <div key={index} className="content-card">
                <h4>{item.title || item.name}</h4>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Make LibraryMain available globally for browser loading
if (typeof window !== 'undefined') {
  window.LibraryMain = LibraryMain;
}

export default LibraryMain
