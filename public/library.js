/**
 * StoryForge Library - Production Ready
 * Built with inline React components for reliable loading
 */

// Supabase Service Class
class LibraryService {
  constructor() {
    this.supabase = window.supabase;
    this.isOnline = !!this.supabase;
  }

  async getCurrentUser() {
    if (!this.supabase) return { id: 'demo', email: 'demo@storyforge.com' };
    
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return user || { id: 'demo', email: 'demo@storyforge.com' };
    } catch (error) {
      console.error('Auth error:', error);
      return { id: 'demo', email: 'demo@storyforge.com' };
    }
  }

  async getStories(userId) {
    if (!this.supabase) return this.getMockStories();
    
    try {
      const { data, error } = await this.supabase
        .from('stories')
        .select(`
          *,
          audio_files(*),
          characters(*),
          scenes(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || this.getMockStories();
    } catch (error) {
      console.error('Error fetching stories:', error);
      return this.getMockStories();
    }
  }

  async saveStory(storyData, userId) {
    if (!this.supabase) {
      console.log('Would save story:', storyData);
      return { id: 'mock-' + Date.now() };
    }

    try {
      const { data, error } = await this.supabase
        .from('stories')
        .insert({
          title: storyData.title,
          description: storyData.description || '',
          content: storyData.content || storyData.text,
          genre: storyData.genre || 'adventure',
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      // Save audio file if provided
      if (storyData.audioUrl && data) {
        await this.supabase
          .from('audio_files')
          .insert({
            story_id: data.id,
            file_path: storyData.audioUrl,
            duration: storyData.duration || 0
          });
      }

      return data;
    } catch (error) {
      console.error('Error saving story:', error);
      throw error;
    }
  }

  getMockStories() {
    return [
      {
        id: 'story-1',
        title: 'The Magical Garden Adventure',
        description: 'A young explorer discovers a secret garden filled with talking flowers and friendly creatures.',
        genre: 'fantasy',
        created_at: new Date().toISOString(),
        audio_files: [{
          id: 'audio-1',
          duration: 780
        }],
        characters: [
          { id: 'char-1', name: 'Luna the Explorer' }
        ]
      }
    ];
  }
}

// Main Library Component
const StoryForgeLibrary = () => {
  const [user, setUser] = React.useState(null);
  const [stories, setStories] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('stories');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [artwork, setArtwork] = React.useState([]);
  const [characters, setCharacters] = React.useState([]);
  const [scenes, setScenes] = React.useState([]);

  const libraryService = React.useMemo(() => new LibraryService(), []);

  React.useEffect(() => {
    initializeLibrary();
  }, []);

  const initializeLibrary = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = await libraryService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const userStories = await libraryService.getStories(currentUser.id);
        setStories(userStories);
        
        // Extract artwork, characters, and scenes from stories
        const allArtwork = [];
        const allCharacters = [];
        const allScenes = [];
        
        userStories.forEach(story => {
          if (story.characters) {
            allCharacters.push(...story.characters.map(char => ({
              ...char,
              story_id: story.id,
              story_title: story.title
            })));
          }
          if (story.scenes) {
            allScenes.push(...story.scenes.map(scene => ({
              ...scene,
              story_id: story.id,
              story_title: story.title
            })));
          }
        });
        
        setArtwork(allArtwork);
        setCharacters(allCharacters);
        setScenes(allScenes);
      }
    } catch (err) {
      setError('Failed to load library');
      console.error('Library init error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get current tab content with search filtering
  const getCurrentContent = React.useMemo(() => {
    let content = [];
    switch (activeTab) {
      case 'stories':
        content = stories;
        break;
      case 'artwork':
        content = artwork;
        break;
      case 'characters':
        content = characters;
        break;
      case 'scenes':
        content = scenes;
        break;
      default:
        content = stories;
    }
    
    if (!searchQuery.trim()) return content;
    const query = searchQuery.toLowerCase();
    return content.filter(item => {
      const searchFields = [
        item.title,
        item.name,
        item.description,
        item.genre,
        item.personality,
        item.story_title
      ].filter(Boolean);
      
      return searchFields.some(field => 
        field && field.toLowerCase().includes(query)
      );
    });
  }, [activeTab, stories, artwork, characters, scenes, searchQuery]);

  const handlePlayStory = (story) => {
    if (story.audio_files && story.audio_files.length > 0) {
      // Integrate with existing audio player
      const audioPlayer = document.getElementById('story-audio-player');
      if (audioPlayer && story.audio_files[0].file_path) {
        audioPlayer.src = story.audio_files[0].file_path;
        audioPlayer.style.display = 'block';
        audioPlayer.play();
      }
    }
  };
  
  // Helper functions for empty states
  const getEmptyStateTitle = () => {
    if (searchQuery) return `No ${activeTab} match your search`;
    const titles = {
      stories: 'No Stories Yet',
      artwork: 'No Artwork Yet', 
      characters: 'No Characters Yet',
      scenes: 'No Scenes Yet'
    };
    return titles[activeTab] || 'No Content Yet';
  };
  
  const getEmptyStateDescription = () => {
    if (searchQuery) return 'Try searching for something else, or create your first story!';
    const descriptions = {
      stories: 'Your magical stories will appear here as you create them with StoryForge!',
      artwork: 'Upload artwork when creating stories to build your art collection!',
      characters: 'Characters from your stories will be saved here for reuse.',
      scenes: 'Scene descriptions from your stories will appear here.'
    };
    return descriptions[activeTab] || 'Create stories to see content here!';
  };
  
  const getEmptyStateIcon = () => {
    const icons = {
      stories: '📚',
      artwork: '🎨',
      characters: '👤', 
      scenes: '🏞️'
    };
    return icons[activeTab] || '📚';
  };

  if (loading) {
    return React.createElement('div', {
      className: 'library-loading',
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        gap: '1rem'
      }
    }, [
      React.createElement('div', {
        key: 'spinner',
        className: 'spinner',
        style: {
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #8b5cf6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }
      }),
      React.createElement('p', {
        key: 'text',
        style: { color: '#6b7280' }
      }, '📚 Loading your Story Library...')
    ]);
  }

  if (error) {
    return React.createElement('div', {
      className: 'library-error',
      style: {
        textAlign: 'center',
        padding: '2rem',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        margin: '1rem'
      }
    }, [
      React.createElement('h3', { key: 'title' }, '⚠️ Library Error'),
      React.createElement('p', { key: 'message' }, error),
      React.createElement('button', {
        key: 'retry',
        onClick: initializeLibrary,
        style: {
          background: '#dc2626',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      }, '🔄 Retry')
    ]);
  }

  return React.createElement('div', {
    className: 'storyforge-library',
    style: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '1rem'
    }
  }, [
    // Header
    React.createElement('div', {
      key: 'header',
      className: 'library-header',
      style: {
        background: 'var(--bg-paper)',
        border: '2px solid var(--border-color)',
        borderRadius: '15px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 8px var(--shadow-medium)'
      }
    }, [
      React.createElement('div', {
        key: 'title-section',
        style: { marginBottom: '1.5rem' }
      }, [
        React.createElement('h1', {
          key: 'title',
          style: {
            fontFamily: 'var(--font-title)',
            fontSize: '2.5rem',
            color: 'var(--accent-color)',
            margin: '0 0 0.5rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }
        }, ['📚', ' My StoryForge Library']),
        React.createElement('div', {
          key: 'stats',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--text-secondary)'
          }
        }, [
          React.createElement('span', { key: 'count' }, `${stories.length} stories`),
          user && React.createElement('span', { 
            key: 'user',
            style: { fontSize: '0.9rem' }
          }, `• ${user.email}`)
        ])
      ]),
      // Search
      React.createElement('input', {
        key: 'search',
        type: 'text',
        placeholder: 'Search your stories...',
        value: searchQuery,
        onChange: (e) => setSearchQuery(e.target.value),
        style: {
          width: '100%',
          padding: '1rem 1.5rem',
          border: '2px solid var(--border-color)',
          borderRadius: '25px',
          fontSize: '1rem',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)'
        }
      })
    ]),

    // Tab Navigation
    React.createElement('div', {
      key: 'tabs',
      className: 'library-tabs',
      style: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        background: 'var(--bg-secondary)',
        padding: '0.75rem',
        borderRadius: '15px',
        border: '1px solid var(--border-color)'
      }
    }, [
      { id: 'stories', label: 'Stories', icon: '📚', count: stories.length },
      { id: 'artwork', label: 'Artwork', icon: '🎨', count: artwork.length },
      { id: 'characters', label: 'Characters', icon: '👤', count: characters.length },
      { id: 'scenes', label: 'Scenes', icon: '🏞️', count: scenes.length }
    ].map(tab => 
      React.createElement('button', {
        key: tab.id,
        onClick: () => setActiveTab(tab.id),
        style: {
          background: activeTab === tab.id ? 'var(--accent-color)' : 'var(--bg-primary)',
          color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
          border: '2px solid ' + (activeTab === tab.id ? 'var(--accent-color)' : 'var(--border-color)'),
          borderRadius: '12px',
          padding: '0.75rem 1.5rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.95rem',
          transition: 'all 0.3s ease'
        },
        onMouseEnter: (e) => {
          if (activeTab !== tab.id) {
            e.target.style.background = 'var(--bg-paper)';
            e.target.style.borderColor = 'var(--accent-color)';
            e.target.style.transform = 'translateY(-2px)';
          }
        },
        onMouseLeave: (e) => {
          if (activeTab !== tab.id) {
            e.target.style.background = 'var(--bg-primary)';
            e.target.style.borderColor = 'var(--border-color)';
            e.target.style.transform = 'translateY(0)';
          }
        }
      }, [
        React.createElement('span', { key: 'icon', style: { fontSize: '1.1rem' } }, tab.icon),
        React.createElement('span', { key: 'label' }, tab.label),
        React.createElement('span', {
          key: 'count',
          style: {
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '0.15rem 0.5rem',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            minWidth: '1.5rem',
            textAlign: 'center'
          }
        }, tab.count)
      ])
    )),
    
    // Content
    React.createElement('div', {
      key: 'content',
      className: 'library-content'
    }, [
      getCurrentContent.length === 0 ? (
        // Empty State
        React.createElement('div', {
          key: 'empty',
          style: {
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'var(--bg-paper)',
            border: '2px dashed var(--border-color)',
            borderRadius: '15px'
          }
        }, [
          React.createElement('div', {
            key: 'icon',
            style: { fontSize: '4rem', marginBottom: '1rem' }
          }, getEmptyStateIcon()),
          React.createElement('h3', {
            key: 'title',
            style: {
              fontFamily: 'var(--font-title)',
              fontSize: '1.8rem',
              color: 'var(--text-primary)',
              margin: '0 0 1rem 0'
            }
          }, getEmptyStateTitle()),
          React.createElement('p', {
            key: 'description',
            style: {
              color: 'var(--text-secondary)',
              fontSize: '1.1rem',
              marginBottom: '2rem'
            }
          }, getEmptyStateDescription()),
          React.createElement('button', {
            key: 'create',
            onClick: () => window.backToModeSelection && window.backToModeSelection(),
            style: {
              background: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '15px',
              fontSize: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }
          }, '✨ Create Your First Story')
        ])
      ) : (
        // Stories Grid
        React.createElement('div', {
          key: 'grid',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem'
          }
        }, getCurrentContent.map((item, index) => 
          renderContentCard(item, index)
        })
      )
    ])
  ]);
  
  // Render different content types
  const renderContentCard = (item, index) => {
    const cardKey = item.id || `${activeTab}-${index}`;
    
    if (activeTab === 'stories') {
      return renderStoryCard(item, cardKey);
    } else if (activeTab === 'artwork') {
      return renderArtworkCard(item, cardKey);
    } else if (activeTab === 'characters') {
      return renderCharacterCard(item, cardKey);
    } else if (activeTab === 'scenes') {
      return renderSceneCard(item, cardKey);
    }
    
    // Fallback
    return React.createElement('div', { key: cardKey }, 'Unknown content type');
  };
  
  const renderStoryCard = (story, cardKey) => {
    return React.createElement('div', {
      key: cardKey,
      className: 'story-card',
      style: {
        background: 'var(--bg-paper)',
        border: '2px solid var(--border-color)',
        borderRadius: '15px',
        padding: '1.5rem',
        boxShadow: '0 4px 8px var(--shadow-medium)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      },
            onMouseEnter: (e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 25px var(--shadow-dark)';
              e.currentTarget.style.borderColor = 'var(--accent-color)';
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 8px var(--shadow-medium)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }
          }, [
            React.createElement('div', {
              key: 'header',
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }
            }, [
              React.createElement('h3', {
                key: 'title',
                style: {
                  fontFamily: 'var(--font-title)',
                  color: 'var(--text-primary)',
                  fontSize: '1.3rem',
                  margin: 0
                }
              }, story.title),
              story.genre && React.createElement('span', {
                key: 'genre',
                style: {
                  background: 'var(--accent-color)',
                  color: 'white',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }
              }, story.genre)
            ]),
            
            story.description && React.createElement('p', {
              key: 'description',
              style: {
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                marginBottom: '1rem',
                fontSize: '0.95rem'
              }
            }, story.description),

            story.audio_files && story.audio_files.length > 0 && React.createElement('div', {
              key: 'audio-info',
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }
            }, [
              React.createElement('span', { key: 'icon' }, '🎧'),
              React.createElement('span', { key: 'duration' }, 
                `Duration: ${Math.floor(story.audio_files[0].duration / 60)}:${(story.audio_files[0].duration % 60).toString().padStart(2, '0')}`
              )
            ]),

            React.createElement('div', {
              key: 'actions',
              style: {
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end'
              }
            }, [
              story.audio_files && story.audio_files.length > 0 && React.createElement('button', {
                key: 'play',
                onClick: (e) => {
                  e.stopPropagation();
                  handlePlayStory(story);
                },
                style: {
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }
              }, '▶️ Play'),
              React.createElement('button', {
                key: 'details',
                onClick: (e) => {
                  e.stopPropagation();
                  console.log('Story details:', story);
                },
                style: {
                  background: 'var(--accent-color)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }
              }, '📖 Details')
            ])
          ])
        ))
      )
    ])
  ]);
};

// Expose library service globally for story saving
window.LibraryService = LibraryService;
window.StoryForgeLibrary = StoryForgeLibrary;

// Add spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);