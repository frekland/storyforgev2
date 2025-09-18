// ImportFromLibrary.jsx - Modal for importing artwork and assets from library
import React, { useState, useEffect } from 'react'

const ImportFromLibrary = ({ user, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState('artwork')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Load library content
  useEffect(() => {
    if (user) {
      loadContent()
    }
  }, [user, activeTab])

  const loadContent = async () => {
    setLoading(true)
    try {
      // Import libraryAPI from the parent context or pass as prop
      const { libraryAPI } = await import('../../lib/supabase.js')
      
      let result
      switch (activeTab) {
        case 'artwork':
          result = await libraryAPI.getArtwork(user.id)
          setItems(result.artwork || [])
          break
        case 'characters':
          result = await libraryAPI.getCharacters(user.id)
          setItems(result.characters || [])
          break
        case 'scenes':
          result = await libraryAPI.getScenes(user.id)
          setItems(result.scenes || [])
          break
      }
      
      if (result?.error) {
        console.error('Import load error:', result.error)
      }
    } catch (error) {
      console.error('Import content load error:', error)
    }
    setLoading(false)
  }

  // Filter items based on search
  const filteredItems = items.filter(item => {
    const searchTerm = searchQuery.toLowerCase()
    return (
      (item.title || item.name || '').toLowerCase().includes(searchTerm) ||
      (item.description || '').toLowerCase().includes(searchTerm) ||
      (item.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
    )
  })

  // Handle item selection
  const toggleSelection = (itemId) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const selectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)))
    }
  }

  const handleImport = () => {
    const selectedData = filteredItems.filter(item => selectedItems.has(item.id))
    onImport(selectedData)
  }

  return (
    <div className="import-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="import-modal">
        {/* Modal Header */}
        <div className="import-header">
          <div className="header-content">
            <h2 className="import-title">
              <span className="title-icon">📥</span>
              <span>Import from Library</span>
            </h2>
            <p className="import-description">
              Select artwork, characters, or scenes to use in your story creation.
            </p>
          </div>
          <button className="close-btn" onClick={onClose} title="Close">
            <span className="close-icon">✕</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="import-tabs">
          {[
            { id: 'artwork', label: 'Artwork', icon: '🎨' },
            { id: 'characters', label: 'Characters', icon: '👤' },
            { id: 'scenes', label: 'Scenes', icon: '🏞️' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`import-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count">
                {tab.id === 'artwork' ? items.filter(i => !activeTab || activeTab === 'artwork').length :
                 tab.id === 'characters' ? items.filter(i => !activeTab || activeTab === 'characters').length :
                 items.filter(i => !activeTab || activeTab === 'scenes').length}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="import-search">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <span className="clear-icon">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* Selection Controls */}
        {!loading && filteredItems.length > 0 && (
          <div className="selection-controls">
            <button
              className="select-all-btn"
              onClick={selectAll}
            >
              <span className="btn-icon">
                {selectedItems.size === filteredItems.length ? '☑️' : '☐'}
              </span>
              <span>
                {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            
            <div className="selection-info">
              <span className="selected-count">
                {selectedItems.size} of {filteredItems.length} selected
              </span>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="import-content">
          {loading ? (
            <div className="import-loading">
              <div className="loading-spinner">
                <span className="spinner-icon">🔄</span>
              </div>
              <p className="loading-text">Loading {activeTab}...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="import-empty">
              <div className="empty-icon">
                {activeTab === 'artwork' ? '🎨' : activeTab === 'characters' ? '👤' : '🏞️'}
              </div>
              <h3 className="empty-title">
                No {activeTab} {searchQuery ? 'found' : 'available'}
              </h3>
              <p className="empty-description">
                {searchQuery ? 
                  `No ${activeTab} match your search "${searchQuery}".` :
                  `You haven't created any ${activeTab} yet. They'll appear here after you create stories.`
                }
              </p>
              {searchQuery && (
                <button
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <span className="btn-icon">🧹</span>
                  <span>Clear Search</span>
                </button>
              )}
            </div>
          ) : (
            <div className="import-grid">
              {filteredItems.map(item => (
                <ImportCard
                  key={item.id}
                  item={item}
                  type={activeTab}
                  isSelected={selectedItems.has(item.id)}
                  onToggle={() => toggleSelection(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="import-footer">
          <div className="footer-info">
            <span className="info-text">
              Selected items will be available during story creation.
            </span>
          </div>
          
          <div className="footer-actions">
            <button
              className="import-action-btn cancel"
              onClick={onClose}
            >
              <span className="btn-text">Cancel</span>
            </button>
            
            <button
              className="import-action-btn import"
              onClick={handleImport}
              disabled={selectedItems.size === 0}
            >
              <span className="btn-icon">📥</span>
              <span className="btn-text">
                Import {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Individual import card component
const ImportCard = ({ item, type, isSelected, onToggle }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <div 
      className={`import-card ${type} ${isSelected ? 'selected' : ''}`}
      onClick={onToggle}
    >
      {/* Selection Indicator */}
      <div className="selection-indicator">
        <span className="selection-icon">
          {isSelected ? '✓' : '○'}
        </span>
      </div>

      {/* Card Preview */}
      <div className="card-preview">
        {type === 'artwork' && (
          <div className="artwork-preview">
            {item.image_url ? (
              <img 
                src={item.thumbnail_url || item.image_url} 
                alt={item.title}
                className="preview-image"
              />
            ) : (
              <div className="preview-placeholder">
                <span className="placeholder-icon">🎨</span>
              </div>
            )}
          </div>
        )}

        {type === 'characters' && (
          <div className="character-preview">
            {item.artwork?.image_url ? (
              <img 
                src={item.artwork.thumbnail_url || item.artwork.image_url}
                alt={item.name}
                className="preview-image"
              />
            ) : (
              <div className="preview-placeholder">
                <span className="placeholder-icon">👤</span>
              </div>
            )}
          </div>
        )}

        {type === 'scenes' && (
          <div className="scene-preview">
            {item.artwork?.image_url ? (
              <img 
                src={item.artwork.thumbnail_url || item.artwork.image_url}
                alt={item.name}
                className="preview-image"
              />
            ) : (
              <div className="preview-placeholder">
                <span className="placeholder-icon">🏞️</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="card-info">
        <h4 className="card-title">
          {item.title || item.name}
        </h4>
        
        <p className="card-description">
          {type === 'artwork' && item.description}
          {type === 'characters' && item.personality_traits}
          {type === 'scenes' && `${item.setting_type || ''} ${item.atmosphere || ''}`.trim()}
        </p>

        <div className="card-metadata">
          <span className="metadata-item">
            <span className="metadata-icon">📅</span>
            <span className="metadata-text">{formatDate(item.created_at)}</span>
          </span>
          
          {item.usage_count > 0 && (
            <span className="metadata-item">
              <span className="metadata-icon">🔄</span>
              <span className="metadata-text">Used {item.usage_count}x</span>
            </span>
          )}

          {item.tags?.length > 0 && (
            <span className="metadata-item">
              <span className="metadata-icon">🏷️</span>
              <span className="metadata-text">{item.tags[0]}</span>
              {item.tags.length > 1 && (
                <span className="tag-count">+{item.tags.length - 1}</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Selection Overlay */}
      {isSelected && (
        <div className="selection-overlay">
          <div className="selection-check">
            <span className="check-icon">✓</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportFromLibrary