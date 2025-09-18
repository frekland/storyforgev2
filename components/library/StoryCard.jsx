// StoryForge Library - Story Card Component with Audio Playback
import React, { useState, useRef, useEffect } from 'react'

const StoryCard = ({ story, isPlaying, onPlay, onPause, onFavorite, onAddToCollection, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const audioRef = useRef(null)

  // Format duration to mm:ss
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return 'Unknown'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Format date to readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause()
    } else {
      onPlay(story)
    }
  }

  return (
    <div 
      className={`story-card ${className} ${isPlaying ? 'playing' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Story Cover */}
      <div className="story-cover">
        {story.cover_image_url ? (
          <img 
            src={story.cover_image_url} 
            alt={story.title}
            className="cover-image"
          />
        ) : (
          <div className="cover-placeholder">
            <div className="placeholder-icon">
              {story.story_mode === 'classic' && '📚'}
              {story.story_mode === 'adventure-me' && '⚔️'}
              {story.story_mode === 'dream-job' && '🔮'}
              {story.story_mode === 'monster-maker' && '👹'}
              {story.story_mode === 'sleep-forge' && '🌙'}
              {story.story_mode === 'homework-forge' && '📝'}
              {!story.story_mode && '📖'}
            </div>
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="play-overlay">
          <button 
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause story' : 'Play story'}
          >
            <div className="play-icon">
              {isPlaying ? '⏸️' : '▶️'}
            </div>
          </button>
          {isPlaying && (
            <div className="audio-waves">
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>
          )}
        </div>

        {/* Chapter Indicator */}
        {story.chapter_count > 1 && (
          <div className="chapter-badge">
            <span>📚 {story.chapter_count} chapters</span>
          </div>
        )}
      </div>

      {/* Story Info */}
      <div className="story-info">
        <h3 className="story-title" title={story.title}>
          {story.title}
        </h3>
        
        <div className="story-meta">
          <span className="hero-name">
            🦸 {story.hero_name || 'Unknown Hero'}
          </span>
          <span className="story-date">
            📅 {formatDate(story.created_at)}
          </span>
        </div>

        <div className="story-stats">
          <span className="duration">
            🎧 {formatDuration(story.total_duration)}
          </span>
          <span className="word-count">
            📝 {story.word_count || 0} words
          </span>
          <span className="play-count">
            ▶️ {story.play_count || 0} plays
          </span>
        </div>

        {/* Story Description Preview */}
        {story.description && (
          <p className="story-description">
            {story.description.length > 100 
              ? `${story.description.substring(0, 100)}...`
              : story.description
            }
          </p>
        )}

        {/* Story Mode Badge */}
        <div className="story-mode-badge">
          <span className="mode-icon">
            {story.story_mode === 'classic' && '📚'}
            {story.story_mode === 'adventure-me' && '⚔️'}
            {story.story_mode === 'dream-job' && '🔮'}
            {story.story_mode === 'monster-maker' && '👹'}
            {story.story_mode === 'sleep-forge' && '🌙'}
            {story.story_mode === 'homework-forge' && '📝'}
          </span>
          <span className="mode-name">
            {story.story_mode?.replace('-', ' ') || 'Story'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="story-actions">
        <button 
          className={`action-btn favorite-btn ${story.is_favorite ? 'favorited' : ''}`}
          onClick={() => onFavorite(story)}
          title={story.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {story.is_favorite ? '❤️' : '🤍'}
        </button>
        
        <button 
          className="action-btn collection-btn"
          onClick={() => onAddToCollection(story)}
          title="Add to collection"
        >
          📚
        </button>
        
        <button 
          className="action-btn details-btn"
          onClick={() => setShowDetails(!showDetails)}
          title="View story details"
        >
          {showDetails ? '📖' : '📋'}
        </button>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="story-details">
          <div className="detail-section">
            <h4>Story Arc</h4>
            <div className="story-arc">
              {story.story_setup && (
                <div className="arc-item">
                  <span className="arc-label">🌅 Beginning:</span>
                  <span className="arc-text">{story.story_setup}</span>
                </div>
              )}
              {story.story_rising && (
                <div className="arc-item">
                  <span className="arc-label">⚡ Challenge:</span>
                  <span className="arc-text">{story.story_rising}</span>
                </div>
              )}
              {story.story_climax && (
                <div className="arc-item">
                  <span className="arc-label">🎆 Resolution:</span>
                  <span className="arc-text">{story.story_climax}</span>
                </div>
              )}
            </div>
          </div>

          {story.tags && story.tags.length > 0 && (
            <div className="detail-section">
              <h4>Tags</h4>
              <div className="story-tags">
                {story.tags.map((tag, index) => (
                  <span key={index} className="story-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h4>Technical Details</h4>
            <div className="tech-details">
              <span>Target Age: {story.age_target} years</span>
              <span>File Size: {((story.total_file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
              <span>Created: {formatDate(story.created_at)}</span>
              {story.last_played_at && (
                <span>Last Played: {formatDate(story.last_played_at)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StoryCard