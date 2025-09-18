// StoryForge Library - Artwork Gallery Component
import React, { useState } from 'react'

const ArtworkGallery = ({ artwork, onArtworkClick, onFavorite, onUseInStory, searchQuery }) => {
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [viewMode, setViewMode] = useState('masonry') // masonry, grid, list
  const [filterType, setFilterType] = useState('all') // all, character, scene, cover, other

  // Filter artwork based on search and type
  const filteredArtwork = artwork.filter(art => {
    const matchesSearch = !searchQuery || 
      art.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = filterType === 'all' || art.artwork_type === filterType
    
    return matchesSearch && matchesType
  })

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const handleArtworkClick = (art) => {
    setSelectedArtwork(art)
    if (onArtworkClick) {
      onArtworkClick(art)
    }
  }

  const closeModal = () => {
    setSelectedArtwork(null)
  }

  if (filteredArtwork.length === 0) {
    return (
      <div className="artwork-gallery-empty">
        <div className="empty-state">
          <div className="empty-icon">🎨</div>
          <h3>No Artwork Yet</h3>
          {searchQuery ? (
            <p>No artwork found matching "{searchQuery}"</p>
          ) : (
            <p>Start creating stories and upload your amazing artwork to build your gallery!</p>
          )}
          <button 
            className="create-story-btn"
            onClick={() => window.location.href = '#/create'}
          >
            ✨ Create Your First Story
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="artwork-gallery">
      {/* Gallery Controls */}
      <div className="gallery-controls">
        <div className="view-controls">
          <button 
            className={`view-btn ${viewMode === 'masonry' ? 'active' : ''}`}
            onClick={() => setViewMode('masonry')}
            title="Masonry view"
          >
            🧱
          </button>
          <button 
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            ⚏
          </button>
          <button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            ☰
          </button>
        </div>

        <div className="filter-controls">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="type-filter"
          >
            <option value="all">All Types</option>
            <option value="character">🦸 Characters</option>
            <option value="scene">🏞️ Scenes</option>
            <option value="cover">📚 Covers</option>
            <option value="other">🎨 Other</option>
          </select>
        </div>

        <div className="gallery-stats">
          <span>{filteredArtwork.length} artwork items</span>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className={`artwork-grid ${viewMode}`}>
        {filteredArtwork.map((art) => (
          <div key={art.id} className="artwork-item">
            <div className="artwork-card" onClick={() => handleArtworkClick(art)}>
              {/* Artwork Image */}
              <div className="artwork-image-container">
                <img 
                  src={art.thumbnail_url || art.image_url} 
                  alt={art.title || 'Artwork'}
                  className="artwork-image"
                  loading="lazy"
                />
                
                {/* Hover Overlay */}
                <div className="artwork-overlay">
                  <div className="overlay-actions">
                    <button 
                      className="overlay-btn view-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleArtworkClick(art)
                      }}
                      title="View full size"
                    >
                      🔍
                    </button>
                    <button 
                      className={`overlay-btn favorite-btn ${art.is_favorite ? 'favorited' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onFavorite(art)
                      }}
                      title={art.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {art.is_favorite ? '❤️' : '🤍'}
                    </button>
                    <button 
                      className="overlay-btn use-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onUseInStory(art)
                      }}
                      title="Use in new story"
                    >
                      ✨
                    </button>
                  </div>
                  
                  {/* Usage Info */}
                  {art.usage_count > 0 && (
                    <div className="usage-badge">
                      <span>🔄 Used {art.usage_count} times</span>
                    </div>
                  )}
                </div>

                {/* Type Badge */}
                <div className="artwork-type-badge">
                  <span>
                    {art.artwork_type === 'character' && '🦸'}
                    {art.artwork_type === 'scene' && '🏞️'}
                    {art.artwork_type === 'cover' && '📚'}
                    {art.artwork_type === 'other' && '🎨'}
                    {!art.artwork_type && '🎨'}
                  </span>
                </div>
              </div>

              {/* Artwork Info */}
              <div className="artwork-info">
                <h4 className="artwork-title">
                  {art.title || `Artwork ${formatDate(art.created_at)}`}
                </h4>
                
                {art.description && (
                  <p className="artwork-description">
                    {art.description.length > 60 
                      ? `${art.description.substring(0, 60)}...`
                      : art.description
                    }
                  </p>
                )}

                <div className="artwork-meta">
                  <span className="artwork-date">
                    📅 {formatDate(art.created_at)}
                  </span>
                  <span className="artwork-size">
                    📏 {art.width}×{art.height}
                  </span>
                  <span className="file-size">
                    💾 {formatFileSize(art.file_size)}
                  </span>
                </div>

                {/* Tags */}
                {art.tags && art.tags.length > 0 && (
                  <div className="artwork-tags">
                    {art.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="artwork-tag">
                        #{tag}
                      </span>
                    ))}
                    {art.tags.length > 3 && (
                      <span className="more-tags">+{art.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Artwork Modal */}
      {selectedArtwork && (
        <div className="artwork-modal-overlay" onClick={closeModal}>
          <div className="artwork-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedArtwork.title || 'Your Artwork'}</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-content">
              <div className="modal-image-container">
                <img 
                  src={selectedArtwork.image_url} 
                  alt={selectedArtwork.title}
                  className="modal-image"
                />
              </div>
              
              <div className="modal-info">
                <div className="artwork-details">
                  <h4>Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Type:</span>
                      <span className="value">
                        {selectedArtwork.artwork_type === 'character' && '🦸 Character'}
                        {selectedArtwork.artwork_type === 'scene' && '🏞️ Scene'}
                        {selectedArtwork.artwork_type === 'cover' && '📚 Cover'}
                        {selectedArtwork.artwork_type === 'other' && '🎨 Other'}
                        {!selectedArtwork.artwork_type && '🎨 Artwork'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Size:</span>
                      <span className="value">{selectedArtwork.width} × {selectedArtwork.height} pixels</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">File Size:</span>
                      <span className="value">{formatFileSize(selectedArtwork.file_size)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Created:</span>
                      <span className="value">{formatDate(selectedArtwork.created_at)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Used in Stories:</span>
                      <span className="value">{selectedArtwork.usage_count || 0} times</span>
                    </div>
                  </div>
                </div>

                {selectedArtwork.description && (
                  <div className="artwork-description-full">
                    <h4>Description</h4>
                    <p>{selectedArtwork.description}</p>
                  </div>
                )}

                {selectedArtwork.tags && selectedArtwork.tags.length > 0 && (
                  <div className="artwork-tags-full">
                    <h4>Tags</h4>
                    <div className="tags-container">
                      {selectedArtwork.tags.map((tag, index) => (
                        <span key={index} className="artwork-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className={`modal-btn favorite-btn ${selectedArtwork.is_favorite ? 'favorited' : ''}`}
                onClick={() => onFavorite(selectedArtwork)}
              >
                {selectedArtwork.is_favorite ? '❤️ Favorited' : '🤍 Add to Favorites'}
              </button>
              <button 
                className="modal-btn use-btn"
                onClick={() => onUseInStory(selectedArtwork)}
              >
                ✨ Use in New Story
              </button>
              <button 
                className="modal-btn download-btn"
                onClick={() => window.open(selectedArtwork.image_url, '_blank')}
              >
                💾 Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArtworkGallery