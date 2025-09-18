// SearchBar.jsx - Advanced search and filtering for library
import React, { useState, useEffect, useRef } from 'react'

const SearchBar = ({ searchQuery, filters, activeTab, onSearch }) => {
  const [localQuery, setLocalQuery] = useState(searchQuery || '')
  const [showFilters, setShowFilters] = useState(false)
  const [localFilters, setLocalFilters] = useState(filters || {})
  const searchInputRef = useRef(null)

  // Update local state when props change
  useEffect(() => {
    setLocalQuery(searchQuery || '')
    setLocalFilters(filters || {})
  }, [searchQuery, filters])

  // Handle search input
  const handleSearchChange = (e) => {
    const query = e.target.value
    setLocalQuery(query)
    
    // Debounce search
    clearTimeout(window.searchTimeout)
    window.searchTimeout = setTimeout(() => {
      onSearch(query, localFilters)
    }, 300)
  }

  // Handle filter changes
  const handleFilterChange = (filterKey, value) => {
    const newFilters = {
      ...localFilters,
      [filterKey]: value
    }
    setLocalFilters(newFilters)
    onSearch(localQuery, newFilters)
  }

  // Clear all filters and search
  const handleClear = () => {
    setLocalQuery('')
    setLocalFilters({})
    onSearch('', {})
    searchInputRef.current?.focus()
  }

  // Quick filter buttons
  const getQuickFilters = () => {
    const baseFilters = [
      { key: 'is_favorite', label: 'Favorites', icon: '❤️' },
      { key: 'recent', label: 'Recent', icon: '🕒' }
    ]

    if (activeTab === 'stories') {
      return [
        ...baseFilters,
        { key: 'story_mode', label: 'Classic', value: 'classic', icon: '📚' },
        { key: 'story_mode', label: 'Adventure', value: 'adventure-me', icon: '⚔️' },
        { key: 'has_audio', label: 'With Audio', icon: '🎧' }
      ]
    }

    if (activeTab === 'artwork') {
      return [
        ...baseFilters,
        { key: 'artwork_type', label: 'Characters', value: 'character', icon: '👤' },
        { key: 'artwork_type', label: 'Scenes', value: 'scene', icon: '🏞️' },
        { key: 'artwork_type', label: 'Covers', value: 'cover', icon: '📖' }
      ]
    }

    return baseFilters
  }

  const quickFilters = getQuickFilters()
  const hasActiveFilters = Object.keys(localFilters).some(key => 
    localFilters[key] && localFilters[key] !== '' && key !== 'search'
  )

  return (
    <div className="search-bar-container">
      {/* Main Search Input */}
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder={getSearchPlaceholder(activeTab)}
            value={localQuery}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.target.blur()
              }
            }}
          />
          {(localQuery || hasActiveFilters) && (
            <button
              className="search-clear"
              onClick={handleClear}
              title="Clear search and filters"
            >
              <span className="clear-icon">✕</span>
            </button>
          )}
        </div>

        <button
          className={`filters-toggle ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle filters"
        >
          <span className="filter-icon">⚙️</span>
          {hasActiveFilters && <span className="filter-dot"></span>}
        </button>
      </div>

      {/* Quick Filters */}
      <div className="quick-filters">
        {quickFilters.map(filter => (
          <button
            key={`${filter.key}-${filter.value || filter.label}`}
            className={`quick-filter ${isFilterActive(filter) ? 'active' : ''}`}
            onClick={() => handleQuickFilter(filter)}
            title={filter.label}
          >
            <span className="filter-icon">{filter.icon}</span>
            <span className="filter-label">{filter.label}</span>
          </button>
        ))}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-content">
            <h4 className="filters-title">
              <span className="filters-icon">🔍</span>
              <span>Advanced Filters</span>
            </h4>

            <div className="filters-grid">
              {/* Date Range Filter */}
              <div className="filter-group">
                <label className="filter-label">Created</label>
                <select
                  className="filter-select"
                  value={localFilters.date_range || ''}
                  onChange={(e) => handleFilterChange('date_range', e.target.value)}
                >
                  <option value="">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                  <option value="year">This year</option>
                </select>
              </div>

              {/* Story-specific filters */}
              {activeTab === 'stories' && (
                <>
                  <div className="filter-group">
                    <label className="filter-label">Story Mode</label>
                    <select
                      className="filter-select"
                      value={localFilters.story_mode || ''}
                      onChange={(e) => handleFilterChange('story_mode', e.target.value)}
                    >
                      <option value="">All modes</option>
                      <option value="classic">Classic Story</option>
                      <option value="adventure-me">Adventure Me</option>
                      <option value="homework-forge">Homework Forge</option>
                      <option value="sleep-forge">Sleep Forge</option>
                      <option value="dream-job">Dream Job</option>
                      <option value="monster-maker">Monster Maker</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Story Length</label>
                    <select
                      className="filter-select"
                      value={localFilters.length || ''}
                      onChange={(e) => handleFilterChange('length', e.target.value)}
                    >
                      <option value="">Any length</option>
                      <option value="short">Short (&lt;100 words)</option>
                      <option value="medium">Medium (100-300 words)</option>
                      <option value="long">Long (&gt;300 words)</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Chapters</label>
                    <select
                      className="filter-select"
                      value={localFilters.chapters || ''}
                      onChange={(e) => handleFilterChange('chapters', e.target.value)}
                    >
                      <option value="">Any chapters</option>
                      <option value="single">Single chapter</option>
                      <option value="multi">Multi-chapter</option>
                    </select>
                  </div>
                </>
              )}

              {/* Artwork-specific filters */}
              {activeTab === 'artwork' && (
                <div className="filter-group">
                  <label className="filter-label">Artwork Type</label>
                  <select
                    className="filter-select"
                    value={localFilters.artwork_type || ''}
                    onChange={(e) => handleFilterChange('artwork_type', e.target.value)}
                  >
                    <option value="">All types</option>
                    <option value="character">Characters</option>
                    <option value="scene">Scenes</option>
                    <option value="cover">Story covers</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Usage filter for characters/scenes */}
              {(activeTab === 'characters' || activeTab === 'scenes') && (
                <div className="filter-group">
                  <label className="filter-label">Usage</label>
                  <select
                    className="filter-select"
                    value={localFilters.usage || ''}
                    onChange={(e) => handleFilterChange('usage', e.target.value)}
                  >
                    <option value="">Any usage</option>
                    <option value="unused">Never used</option>
                    <option value="used">Used in stories</option>
                    <option value="frequent">Frequently used</option>
                  </select>
                </div>
              )}

              {/* Tags filter */}
              <div className="filter-group full-width">
                <label className="filter-label">Tags</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Enter tags separated by commas..."
                  value={localFilters.tags || ''}
                  onChange={(e) => handleFilterChange('tags', e.target.value)}
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="filters-actions">
              <button
                className="filter-action-btn clear"
                onClick={handleClear}
                disabled={!localQuery && !hasActiveFilters}
              >
                <span className="btn-icon">🧹</span>
                <span>Clear All</span>
              </button>
              
              <button
                className="filter-action-btn close"
                onClick={() => setShowFilters(false)}
              >
                <span className="btn-icon">✓</span>
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="active-filters">
          <span className="active-filters-label">Active filters:</span>
          <div className="active-filter-tags">
            {Object.entries(localFilters).map(([key, value]) => {
              if (!value || value === '' || key === 'search') return null
              
              return (
                <span key={key} className="active-filter-tag">
                  <span className="tag-text">{formatFilterTag(key, value)}</span>
                  <button
                    className="tag-remove"
                    onClick={() => handleFilterChange(key, '')}
                    title={`Remove ${key} filter`}
                  >
                    ✕
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
const getSearchPlaceholder = (activeTab) => {
  const placeholders = {
    stories: 'Search stories by title, hero name, or content...',
    artwork: 'Search artwork by title or description...',
    characters: 'Search characters by name or traits...',
    scenes: 'Search scenes by name or setting...'
  }
  return placeholders[activeTab] || 'Search library...'
}

const isFilterActive = (filter, localFilters) => {
  if (filter.key === 'is_favorite') {
    return localFilters.is_favorite === true
  }
  if (filter.key === 'recent') {
    return localFilters.date_range === 'week'
  }
  if (filter.key === 'has_audio') {
    return localFilters.has_audio === true
  }
  if (filter.value) {
    return localFilters[filter.key] === filter.value
  }
  return false
}

const formatFilterTag = (key, value) => {
  const formatMap = {
    is_favorite: 'Favorites',
    story_mode: {
      classic: 'Classic',
      'adventure-me': 'Adventure',
      'homework-forge': 'Homework',
      'sleep-forge': 'Sleep',
      'dream-job': 'Dream Job',
      'monster-maker': 'Monster Maker'
    },
    date_range: {
      today: 'Today',
      week: 'This week',
      month: 'This month',
      year: 'This year'
    },
    length: {
      short: 'Short stories',
      medium: 'Medium stories', 
      long: 'Long stories'
    },
    chapters: {
      single: 'Single chapter',
      multi: 'Multi-chapter'
    },
    artwork_type: {
      character: 'Characters',
      scene: 'Scenes',
      cover: 'Covers',
      other: 'Other'
    },
    usage: {
      unused: 'Never used',
      used: 'Used',
      frequent: 'Frequently used'
    }
  }

  if (formatMap[key] && typeof formatMap[key] === 'object') {
    return formatMap[key][value] || value
  }
  
  return formatMap[key] || `${key}: ${value}`
}

const handleQuickFilter = (filter, localFilters, handleFilterChange) => {
  if (filter.key === 'is_favorite') {
    handleFilterChange('is_favorite', !localFilters.is_favorite)
  } else if (filter.key === 'recent') {
    const isActive = localFilters.date_range === 'week'
    handleFilterChange('date_range', isActive ? '' : 'week')
  } else if (filter.key === 'has_audio') {
    handleFilterChange('has_audio', !localFilters.has_audio)
  } else if (filter.value) {
    const isActive = localFilters[filter.key] === filter.value
    handleFilterChange(filter.key, isActive ? '' : filter.value)
  }
}

// Export the SearchBar component with bound handler
const SearchBarWithHandlers = (props) => {
  const handleQuickFilterBound = (filter) => {
    handleQuickFilter(filter, props.filters, props.onSearch ? 
      (key, value) => {
        const newFilters = { ...props.filters, [key]: value }
        props.onSearch(props.searchQuery || '', newFilters)
      } : () => {}
    )
  }

  const isFilterActiveBound = (filter) => {
    return isFilterActive(filter, props.filters || {})
  }

  return (
    <SearchBar
      {...props}
      onQuickFilter={handleQuickFilterBound}
      isFilterActive={isFilterActiveBound}
    />
  )
}

export default SearchBar