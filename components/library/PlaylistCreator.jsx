// StoryForge Library - Playlist Creator Component
import React, { useState, useEffect } from 'react'

const PlaylistCreator = ({ onClose, onSave, existingPlaylist = null }) => {
  const [playlistName, setPlaylistName] = useState(existingPlaylist?.name || '')
  const [playlistDescription, setPlaylistDescription] = useState(existingPlaylist?.description || '')
  const [playlistColor, setPlaylistColor] = useState(existingPlaylist?.color || '#6366f1')
  const [playlistIcon, setPlaylistIcon] = useState(existingPlaylist?.icon || '📚')
  const [privacyLevel, setPrivacyLevel] = useState(existingPlaylist?.privacy_level || 'private')
  
  const [availableStories, setAvailableStories] = useState([])
  const [selectedStories, setSelectedStories] = useState(existingPlaylist?.stories || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const colorOptions = [
    { value: '#6366f1', name: 'Purple', emoji: '💜' },
    { value: '#ef4444', name: 'Red', emoji: '❤️' },
    { value: '#22c55e', name: 'Green', emoji: '💚' },
    { value: '#3b82f6', name: 'Blue', emoji: '💙' },
    { value: '#f59e0b', name: 'Orange', emoji: '🧡' },
    { value: '#8b5cf6', name: 'Violet', emoji: '💜' },
    { value: '#06b6d4', name: 'Cyan', emoji: '🩵' },
    { value: '#84cc16', name: 'Lime', emoji: '💚' }
  ]

  const iconOptions = [
    '📚', '🎵', '⭐', '🎭', '🎪', '🎨', '🌟', '✨',
    '🦄', '🐉', '🏰', '🌈', '🎁', '🎯', '🎪', '🎠',
    '📖', '📝', '🎧', '🎶', '🔮', '👑', '🎪', '🎊'
  ]

  useEffect(() => {
    loadAvailableStories()
  }, [])

  const loadAvailableStories = async () => {
    try {
      const supabase = window.supabaseClient
      if (!supabase) {
        console.error('Supabase client not available')
        return
      }

      const { data: stories, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading stories:', error)
      } else {
        setAvailableStories(stories || [])
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Error in loadAvailableStories:', error)
      setIsLoading(false)
    }
  }

  const filteredStories = availableStories.filter(story => 
    !searchQuery || 
    story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.hero_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleStoryToggle = (story) => {
    const isSelected = selectedStories.find(s => s.id === story.id)
    if (isSelected) {
      setSelectedStories(selectedStories.filter(s => s.id !== story.id))
    } else {
      setSelectedStories([...selectedStories, story])
    }
  }

  const handleSave = () => {
    if (!playlistName.trim()) {
      alert('Please enter a playlist name')
      return
    }

    if (selectedStories.length === 0) {
      alert('Please select at least one story')
      return
    }

    const playlistData = {
      id: existingPlaylist?.id,
      name: playlistName.trim(),
      description: playlistDescription.trim(),
      color: playlistColor,
      icon: playlistIcon,
      privacy_level: privacyLevel,
      stories: selectedStories
    }

    onSave(playlistData)
  }

  const getTotalDuration = () => {
    return selectedStories.reduce((total, story) => total + (story.total_duration || 0), 0)
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="playlist-creator-overlay" onClick={onClose}>
      <div className="playlist-creator" onClick={(e) => e.stopPropagation()}>
        <div className="creator-header">
          <h2>
            <span>{existingPlaylist ? '✏️' : '✨'}</span>
            {existingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="creator-content">
          {/* Playlist Settings */}
          <div className="playlist-settings">
            <div className="settings-row">
              <div className="setting-group">
                <label htmlFor="playlist-name">Playlist Name *</label>
                <input
                  id="playlist-name"
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="My Awesome Stories"
                  className="playlist-input"
                />
              </div>
              
              <div className="setting-group">
                <label htmlFor="privacy-level">Privacy</label>
                <select
                  id="privacy-level"
                  value={privacyLevel}
                  onChange={(e) => setPrivacyLevel(e.target.value)}
                  className="playlist-select"
                >
                  <option value="private">🔒 Private</option>
                  <option value="family">👨‍👩‍👧‍👦 Family</option>
                  <option value="public">🌍 Public</option>
                </select>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="playlist-description">Description</label>
              <textarea
                id="playlist-description"
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                placeholder="A collection of my favorite bedtime stories..."
                className="playlist-textarea"
                rows="2"
              />
            </div>

            <div className="settings-row">
              <div className="setting-group">
                <label>Color Theme</label>
                <div className="color-options">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      className={`color-option ${playlistColor === color.value ? 'selected' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setPlaylistColor(color.value)}
                      title={color.name}
                    >
                      {playlistColor === color.value && '✓'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <label>Icon</label>
                <div className="icon-options">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      className={`icon-option ${playlistIcon === icon ? 'selected' : ''}`}
                      onClick={() => setPlaylistIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Playlist Preview */}
            <div className="playlist-preview">
              <div className="preview-card" style={{ borderColor: playlistColor }}>
                <div className="preview-icon" style={{ backgroundColor: playlistColor }}>
                  {playlistIcon}
                </div>
                <div className="preview-info">
                  <h4>{playlistName || 'Playlist Name'}</h4>
                  <p>{selectedStories.length} stories • {formatDuration(getTotalDuration())}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Story Selection */}
          <div className="story-selection">
            <div className="selection-header">
              <h3>Select Stories ({selectedStories.length} selected)</h3>
              <div className="search-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stories..."
                  className="story-search"
                />
                <span className="search-icon">🔍</span>
              </div>
            </div>

            {/* Selected Stories Preview */}
            {selectedStories.length > 0 && (
              <div className="selected-stories">
                <h4>Selected Stories:</h4>
                <div className="selected-list">
                  {selectedStories.map((story, index) => (
                    <div key={story.id} className="selected-story">
                      <span className="story-index">{index + 1}</span>
                      <span className="story-title">{story.title}</span>
                      <button 
                        className="remove-btn"
                        onClick={() => handleStoryToggle(story)}
                        title="Remove from playlist"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Stories */}
            <div className="available-stories">
              {isLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading stories...</p>
                </div>
              ) : (
                <div className="stories-grid">
                  {filteredStories.map((story) => {
                    const isSelected = selectedStories.find(s => s.id === story.id)
                    return (
                      <div
                        key={story.id}
                        className={`story-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleStoryToggle(story)}
                      >
                        <div className="story-cover">
                          {story.cover_image_url ? (
                            <img src={story.cover_image_url} alt={story.title} />
                          ) : (
                            <div className="cover-placeholder">
                              {story.story_mode === 'classic' && '📚'}
                              {story.story_mode === 'adventure-me' && '⚔️'}
                              {story.story_mode === 'dream-job' && '🔮'}
                              {story.story_mode === 'monster-maker' && '👹'}
                              {story.story_mode === 'sleep-forge' && '🌙'}
                              {story.story_mode === 'homework-forge' && '📝'}
                              {!story.story_mode && '📖'}
                            </div>
                          )}
                          {isSelected && <div className="selected-overlay">✓</div>}
                        </div>
                        <div className="story-info">
                          <h5>{story.title}</h5>
                          <p>🦸 {story.hero_name}</p>
                          <span className="story-duration">
                            🎧 {formatDuration(story.total_duration)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Creator Actions */}
        <div className="creator-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={!playlistName.trim() || selectedStories.length === 0}
          >
            <span>💾</span>
            {existingPlaylist ? 'Update Playlist' : 'Create Playlist'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlaylistCreator