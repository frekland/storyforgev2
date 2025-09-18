/**
 * StoryForge Library - Production Ready
 * Built with inline React components for reliable loading
 */

// Supabase Service Class
class LibraryService {
  constructor() {
    this.supabase = window.supabase;
    this.isOnline = !!this.supabase;
    
    if (this.supabase) {
      console.log('✅ Supabase client initialized');
      this.testConnection();
    } else {
      console.error('❌ Supabase client not found on window object');
    }
  }
  
  async testConnection() {
    try {
      console.log('🔍 Testing Supabase connection...');
      const { data, error } = await this.supabase
        .from('stories')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
      } else {
        console.log('✅ Supabase connection test successful');
      }
    } catch (error) {
      console.error('❌ Supabase connection error:', error);
    }
  }

  async getCurrentUser() {
    if (!this.supabase) return null;
    
    try {
      // Check if user is already authenticated
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        console.log('✅ Authenticated user:', user.id);
        return user;
      }
      
      // Sign in anonymously for demo purposes
      console.log('🔑 No authenticated user, signing in anonymously...');
      const { data, error } = await this.supabase.auth.signInAnonymously();
      if (error) {
        console.error('Anonymous auth failed:', error);
        console.error('Please enable anonymous authentication in Supabase dashboard');
        return null;
      }
      
      console.log('✅ Anonymous user created:', data.user.id);
      return data.user;
    } catch (error) {
      console.error('Auth error:', error);
      return null;
    }
  }

  async getStories(userId) {
    if (!this.supabase || !userId) {
      console.log('⚠️ Supabase not available or no user, using mock stories');
      return this.getMockStories();
    }
    
    console.log('📋 Fetching stories for user:', userId);
    
    try {
      const { data, error } = await this.supabase
        .from('stories')
        .select(`
          id,
          title,
          description,
          full_text,
          story_mode,
          hero_name,
          age_target,
          created_at,
          audio_files(id, title, file_path, duration)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase fetch error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('✅ Stories fetched successfully:', data?.length || 0, 'stories');
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching stories, using mock data:', error.message);
      return this.getMockStories();
    }
  }

  async saveStory(storyData, userId) {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    console.log('💾 Saving story to Supabase:', storyData.title);
    console.log('🔍 User ID:', userId);

    try {
      console.log('📄 Inserting story data:', {
        title: storyData.title,
        description: storyData.description || '',
        genre: storyData.genre || 'adventure',
        user_id: userId,
        content_length: storyData.content?.length || 0
      });
      
        const { data, error } = await this.supabase
          .from('stories')
          .insert({
            title: storyData.title,
            description: storyData.description || '',
            full_text: storyData.content || storyData.text, // Match database schema: full_text
            story_mode: storyData.genre || 'classic', // Use story_mode instead of genre
            user_id: userId
          })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('✅ Story inserted successfully:', data);

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
        id: 'story-demo',
        title: 'Welcome to StoryForge!',
        description: 'This is a sample story to show you how your library works. Create your own stories to see them appear here!',
        genre: 'demo',
        created_at: new Date().toISOString(),
        audio_files: [],
        characters: [],
        scenes: []
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
    
    // Listen for new stories being added
    const handleStoryAdded = (event) => {
      console.log('📚 New story added, refreshing library...', event.detail.title);
      initializeLibrary(); // Refresh the entire library
    };
    
    window.addEventListener('storyAdded', handleStoryAdded);
    
    return () => {
      window.removeEventListener('storyAdded', handleStoryAdded);
    };
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
        gap: '1.5rem'
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
          color: 'var(--text-secondary)',
          marginBottom: '1.5rem'
        }
      }, [
        React.createElement('span', { key: 'count' }, `${stories.length} stories`),
        user && React.createElement('span', { 
          key: 'user',
          style: { fontSize: '0.9rem' }
        }, `• ${user.email}`)
      ]),
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
          React.createElement('div', {
            key: item.id || index,
            className: 'story-card',
            style: {
              background: 'var(--bg-paper)',
              border: '2px solid var(--border-color)',
              borderRadius: '15px',
              padding: '1.5rem',
              boxShadow: '0 4px 8px var(--shadow-medium)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }
          }, [
            React.createElement('h3', {
              key: 'title',
              style: {
                fontFamily: 'var(--font-title)',
                color: 'var(--text-primary)',
                fontSize: '1.3rem',
                margin: '0 0 1rem 0'
              }
            }, item.title || item.name),
            item.description && React.createElement('p', {
              key: 'description',
              style: {
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                marginBottom: '1rem',
                fontSize: '0.95rem'
              }
            }, item.description),
            item.genre && React.createElement('span', {
              key: 'genre',
              style: {
                background: 'var(--accent-color)',
                color: 'white',
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }
            }, item.genre)
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