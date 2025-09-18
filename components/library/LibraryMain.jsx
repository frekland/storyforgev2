// StoryForge Library - Main component with search and navigation
import React, { useState, useEffect } from 'react'
import { auth, libraryAPI, subscriptions } from '../../lib/supabase.js'
import LibraryGrid from './LibraryGrid.jsx'
import SearchBar from './SearchBar.jsx'
import ImportFromLibrary from './ImportFromLibrary.jsx'

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

  // Authentication check
  useEffect(() => {
    checkUser()
    
    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadLibraryContent(session.user.id)
      } else {
        setUser(null)
        clearLibraryContent()
      }
      setLoading(false)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await auth.getCurrentUser()
      if (user) {
        setUser(user)
        await loadLibraryContent(user.id)
      }
      setLoading(false)
    } catch (error) {
      console.error('Auth check error:', error)
      setLoading(false)
    }
  }

  const loadLibraryContent = async (userId) => {
    try {
      console.log('📚 Loading library content for user:', userId)
      
      // Load all content types in parallel
      const [storiesResult, artworkResult, charactersResult, scenesResult] = await Promise.all([
        libraryAPI.getStories(userId, filters),
        libraryAPI.getArtwork(userId, filters),
        libraryAPI.getCharacters(userId),
        libraryAPI.getScenes(userId)
      ])

      if (storiesResult.error) {
        console.error('Stories load error:', storiesResult.error)
      } else {
        setStories(storiesResult.stories)
        console.log('✅ Loaded', storiesResult.stories.length, 'stories')
      }

      if (artworkResult.error) {
        console.error('Artwork load error:', artworkResult.error)
      } else {
        setArtwork(artworkResult.artwork)
        console.log('✅ Loaded', artworkResult.artwork.length, 'artwork items')
      }

      if (charactersResult.error) {
        console.error('Characters load error:', charactersResult.error)
      } else {
        setCharacters(charactersResult.characters)
        console.log('✅ Loaded', charactersResult.characters.length, 'characters')
      }

      if (scenesResult.error) {
        console.error('Scenes load error:', scenesResult.error)
      } else {
        setScenes(scenesResult.scenes)
        console.log('✅ Loaded', scenesResult.scenes.length, 'scenes')
      }

    } catch (error) {
      console.error('Library content load error:', error)
    }
  }

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

        {/* Search Bar */}
        <SearchBar 
          searchQuery={searchQuery}
          filters={filters}
          activeTab={activeTab}
          onSearch={handleSearch}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="library-nav">
        <div className="nav-tabs">
          {[
            { id: 'stories', label: 'Stories', icon: '📖', count: stories.length },
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

      {/* Library Content Grid */}
      <div className="library-content">
        <LibraryGrid
          contentType={activeTab}
          items={getCurrentContent()}
          searchQuery={searchQuery}
          user={user}
          onItemUpdate={() => loadLibraryContent(user.id)}
        />
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportFromLibrary
          user={user}
          onClose={() => setShowImportModal(false)}
          onImport={(selectedItems) => {
            console.log('Import selected:', selectedItems)
            setShowImportModal(false)
            // Handle import logic here
          }}
        />
      )}
    </div>
  )
}

export default LibraryMain