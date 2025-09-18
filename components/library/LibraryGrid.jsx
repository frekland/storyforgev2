// LibraryGrid.jsx - Beautiful grid layout for library items
import React, { useState } from 'react'

const LibraryGrid = ({ contentType, items, searchQuery, user, onItemUpdate }) => {
  const [viewMode, setViewMode] = useState('grid') // grid, list
  const [sortBy, setSortBy] = useState('created_at') // created_at, title, usage_count
  const [sortOrder, setSortOrder] = useState('desc') // desc, asc

  // Sort items based on current settings
  const sortedItems = [...items].sort((a, b) => {
    let aValue = a[sortBy]
    let bValue = b[sortBy]
    
    // Handle different data types
    if (sortBy === 'created_at') {
      aValue = new Date(aValue)
      bValue = new Date(bValue)
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }
    
    if (sortOrder === 'desc') {
      return bValue > aValue ? 1 : -1
    } else {
      return aValue > bValue ? 1 : -1
    }
  })

  // Handle empty state
  if (!items || items.length === 0) {
    return (
      <div className="library-empty-state">
        <div className="empty-content">
          <div className="empty-icon">
            {getEmptyStateIcon(contentType)}
          </div>
          <h3 className="empty-title">
            {getEmptyStateTitle(contentType)}
          </h3>
          <p className="empty-description">
            {getEmptyStateDescription(contentType)}
          </p>
          <button className="empty-action-btn" onClick={() => window.location.href = '/'}>
            <span>✨ Create Your First Story</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="library-grid-container">
      {/* Grid Controls */}
      <div className="grid-controls">
        <div className="view-controls">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <span className="view-icon">⚏</span>
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <span className="view-icon">☰</span>
          </button>
        </div>

        <div className="sort-controls">
          <select 
            className="sort-select"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created_at">Date Created</option>
            <option value="title">Title</option>
            {contentType === 'stories' && <option value="word_count">Length</option>}
            {(contentType === 'characters' || contentType === 'scenes') && (
              <option value="usage_count">Most Used</option>
            )}
          </select>
          <button
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            title={`Sort ${sortOrder === 'desc' ? 'ascending' : 'descending'}`}
          >
            <span className="sort-icon">{sortOrder === 'desc' ? '↓' : '↑'}</span>
          </button>
        </div>

        <div className="results-info">
          <span className="results-count">{sortedItems.length} {contentType}</span>
          {searchQuery && (
            <span className="search-info">for "{searchQuery}"</span>
          )}
        </div>
      </div>

      {/* Items Grid/List */}
      <div className={`library-items ${viewMode}`}>
        {sortedItems.map(item => (
          <LibraryCard
            key={item.id}
            item={item}
            contentType={contentType}
            viewMode={viewMode}
            onUpdate={onItemUpdate}
          />
        ))}
      </div>
    </div>
  )
}

// Individual item card component
const LibraryCard = ({ item, contentType, viewMode, onUpdate }) => {
  const [showActions, setShowActions] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlay = async () => {
    if (contentType === 'stories' && item.audio_files?.length > 0) {
      setIsPlaying(true)
      // Implement audio playback logic here
      console.log('Playing story:', item.title)
      
      // Simulate playing
      setTimeout(() => setIsPlaying(false), 2000)
    }
  }

  const handleFavorite = async () => {
    // Implement favorite toggle logic
    console.log('Toggle favorite:', item.id)
    if (onUpdate) onUpdate()
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${item.title || item.name}"?`)) {
      // Implement delete logic
      console.log('Delete item:', item.id)
      if (onUpdate) onUpdate()
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const getDuration = () => {
    if (contentType === 'stories') {
      const duration = item.total_duration || 0
      if (duration > 0) {
        const minutes = Math.floor(duration / 60)
        return `${minutes}m`
      }
      const wordCount = item.word_count || 0
      return wordCount > 0 ? `${wordCount} words` : ''
    }
    return ''
  }

  return (
    <div 
      className={`library-card ${contentType} ${viewMode} ${showActions ? 'show-actions' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Card Media/Icon */}
      <div className="card-media">
        {contentType === 'stories' && (
          <>
            {item.cover_image_id ? (
              <img 
                src={item.artwork?.image_url} 
                alt={item.title}
                className="story-cover"
              />
            ) : (
              <div className="story-placeholder">
                <span className="story-emoji">📖</span>
              </div>
            )}
            
            {/* Play button overlay */}
            {item.audio_files?.length > 0 && (
              <button 
                className={`play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={handlePlay}
                title="Play story"
              >
                <span className="play-icon">
                  {isPlaying ? '⏸️' : '▶️'}
                </span>
              </button>
            )}
          </>
        )}

        {contentType === 'artwork' && (
          <div className="artwork-preview">
            {item.image_url ? (
              <img 
                src={item.thumbnail_url || item.image_url} 
                alt={item.title}
                className="artwork-image"
              />
            ) : (
              <div className="artwork-placeholder">
                <span className="artwork-emoji">🎨</span>
              </div>
            )}
          </div>
        )}

        {contentType === 'characters' && (
          <div className="character-avatar">
            {item.artwork?.image_url ? (
              <img 
                src={item.artwork.thumbnail_url || item.artwork.image_url}
                alt={item.name}
                className="character-image"
              />
            ) : (
              <div className="character-placeholder">
                <span className="character-emoji">👤</span>
              </div>
            )}
          </div>
        )}

        {contentType === 'scenes' && (
          <div className="scene-preview">
            {item.artwork?.image_url ? (
              <img 
                src={item.artwork.thumbnail_url || item.artwork.image_url}
                alt={item.name}
                className="scene-image"
              />
            ) : (
              <div className="scene-placeholder">
                <span className="scene-emoji">🏞️</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="card-content">
        <h3 className="card-title">
          {item.title || item.name}
        </h3>
        
        <p className="card-description">
          {item.description || 
           (contentType === 'stories' && `${item.hero_name ? `Hero: ${item.hero_name}` : ''}`) ||
           (contentType === 'characters' && item.personality_traits) ||
           (contentType === 'scenes' && `${item.setting_type || ''} ${item.atmosphere || ''}`.trim()) ||
           'No description'}
        </p>

        <div className="card-metadata">
          <div className="metadata-row">
            <span className="metadata-item">
              <span className="metadata-icon">📅</span>
              <span className="metadata-text">{formatDate(item.created_at)}</span>
            </span>
            
            {getDuration() && (
              <span className="metadata-item">
                <span className="metadata-icon">⏱️</span>
                <span className="metadata-text">{getDuration()}</span>
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

          {(contentType === 'characters' || contentType === 'scenes') && item.usage_count > 0 && (
            <div className="usage-info">
              <span className="usage-icon">🔄</span>
              <span>Used {item.usage_count} times</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {item.tags?.length > 0 && viewMode === 'list' && (
          <div className="card-tags">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
            {item.tags.length > 3 && (
              <span className="tag more">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="card-actions">
        <button
          className={`action-btn favorite ${item.is_favorite ? 'active' : ''}`}
          onClick={handleFavorite}
          title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <span className="action-icon">
            {item.is_favorite ? '❤️' : '🤍'}
          </span>
        </button>

        {contentType === 'stories' && (
          <button
            className="action-btn share"
            onClick={() => console.log('Share story:', item.id)}
            title="Share story"
          >
            <span className="action-icon">📤</span>
          </button>
        )}

        <button
          className="action-btn delete"
          onClick={handleDelete}
          title="Delete item"
        >
          <span className="action-icon">🗑️</span>
        </button>
      </div>
    </div>
  )
}

// Helper functions for empty states
const getEmptyStateIcon = (contentType) => {
  const icons = {
    stories: '📚',
    artwork: '🎨',
    characters: '👤',
    scenes: '🏞️'
  }
  return icons[contentType] || '📁'
}

const getEmptyStateTitle = (contentType) => {
  const titles = {
    stories: 'No stories yet!',
    artwork: 'No artwork yet!', 
    characters: 'No characters yet!',
    scenes: 'No scenes yet!'
  }
  return titles[contentType] || 'Nothing here yet!'
}

const getEmptyStateDescription = (contentType) => {
  const descriptions = {
    stories: 'Create your first magical story and it will appear here automatically.',
    artwork: 'Upload artwork while creating stories to build your gallery.',
    characters: 'Characters from your stories will be saved here for reuse.',
    scenes: 'Scene settings from your stories will be collected here.'
  }
  return descriptions[contentType] || 'Start creating content to build your library!'
}

export default LibraryGrid