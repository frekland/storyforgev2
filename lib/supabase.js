// Supabase configuration for StoryForge Library
import { createClient } from '@supabase/supabase-js'

// Supabase credentials (add these to your environment variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// Create Supabase client with additional options for file uploads
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application': 'storyforge'
    }
  }
})

// Storage buckets
export const STORAGE_BUCKETS = {
  ARTWORK: 'artwork',
  AUDIO: 'audio',
  AVATARS: 'avatars'
}

// Authentication helpers
export const auth = {
  // Sign up new user
  signUp: async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: metadata.displayName || '',
            avatar_url: metadata.avatarUrl || ''
          }
        }
      })
      
      if (error) throw error
      
      // Create user profile after signup
      if (data.user) {
        await createUserProfile(data.user)
      }
      
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { user: null, error: error.message }
    }
  },

  // Sign in existing user
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { user: null, error: error.message }
    }
  },

  // Sign in with OAuth (Google, GitHub, etc.)
  signInWithOAuth: async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/library'
        }
      })
      
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('OAuth sign in error:', error)
      return { error: error.message }
    }
  },

  // Sign out
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error.message }
    }
  },

  // Get current user
  getCurrentUser: () => {
    return supabase.auth.getUser()
  },

  // Listen for auth changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Create user profile after successful registration
const createUserProfile = async (user) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.display_name || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          created_at: new Date().toISOString()
        }
      ])
    
    if (error) {
      console.error('Profile creation error:', error)
    } else {
      console.log('✅ User profile created successfully')
    }
  } catch (error) {
    console.error('Profile creation error:', error)
  }
}

// Library API functions
export const libraryAPI = {
  // Get user's stories
  getStories: async (userId, filters = {}) => {
    try {
      let query = supabase
        .from('stories')
        .select(`
          *,
          artwork:cover_image_id (
            id,
            title,
            image_url,
            thumbnail_url
          ),
          audio_files (
            id,
            title,
            audio_url,
            duration,
            chapter_index
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,hero_name.ilike.%${filters.search}%`)
      }
      
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }
      
      if (filters.storyMode) {
        query = query.eq('story_mode', filters.storyMode)
      }
      
      if (filters.isFavorite) {
        query = query.eq('is_favorite', true)
      }

      const { data, error } = await query
      
      if (error) throw error
      return { stories: data || [], error: null }
    } catch (error) {
      console.error('Get stories error:', error)
      return { stories: [], error: error.message }
    }
  },

  // Save new story
  saveStory: async (storyData) => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .insert([storyData])
        .select()
        .single()
      
      if (error) throw error
      return { story: data, error: null }
    } catch (error) {
      console.error('Save story error:', error)
      return { story: null, error: error.message }
    }
  },

  // Update story
  updateStory: async (storyId, updates) => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .update(updates)
        .eq('id', storyId)
        .select()
        .single()
      
      if (error) throw error
      return { story: data, error: null }
    } catch (error) {
      console.error('Update story error:', error)
      return { story: null, error: error.message }
    }
  },

  // Delete story
  deleteStory: async (storyId) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
      
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Delete story error:', error)
      return { error: error.message }
    }
  },

  // Get user's artwork
  getArtwork: async (userId, filters = {}) => {
    try {
      let query = supabase
        .from('artwork')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.type) {
        query = query.eq('artwork_type', filters.type)
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query
      
      if (error) throw error
      return { artwork: data || [], error: null }
    } catch (error) {
      console.error('Get artwork error:', error)
      return { artwork: [], error: error.message }
    }
  },

  // Save artwork
  saveArtwork: async (artworkData) => {
    try {
      const { data, error } = await supabase
        .from('artwork')
        .insert([artworkData])
        .select()
        .single()
      
      if (error) throw error
      return { artwork: data, error: null }
    } catch (error) {
      console.error('Save artwork error:', error)
      return { artwork: null, error: error.message }
    }
  },

  // Get characters
  getCharacters: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select(`
          *,
          artwork:artwork_id (
            id,
            image_url,
            thumbnail_url
          )
        `)
        .eq('user_id', userId)
        .order('name')
      
      if (error) throw error
      return { characters: data || [], error: null }
    } catch (error) {
      console.error('Get characters error:', error)
      return { characters: [], error: error.message }
    }
  },

  // Save character
  saveCharacter: async (characterData) => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .insert([characterData])
        .select()
        .single()
      
      if (error) throw error
      return { character: data, error: null }
    } catch (error) {
      console.error('Save character error:', error)
      return { character: null, error: error.message }
    }
  },

  // Get scenes
  getScenes: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select(`
          *,
          artwork:artwork_id (
            id,
            image_url,
            thumbnail_url
          )
        `)
        .eq('user_id', userId)
        .order('name')
      
      if (error) throw error
      return { scenes: data || [], error: null }
    } catch (error) {
      console.error('Get scenes error:', error)
      return { scenes: [], error: error.message }
    }
  },

  // Save scene
  saveScene: async (sceneData) => {
    try {
      const { data, error } = await supabase
        .from('scenes')
        .insert([sceneData])
        .select()
        .single()
      
      if (error) throw error
      return { scene: data, error: null }
    } catch (error) {
      console.error('Save scene error:', error)
      return { scene: null, error: error.message }
    }
  },

  // Full-text search across all content
  searchLibrary: async (userId, searchQuery) => {
    try {
      const { data, error } = await supabase
        .from('search_index')
        .select(`
          content_type,
          content_id,
          title,
          description,
          tags
        `)
        .eq('user_id', userId)
        .textSearch('search_vector', searchQuery)
        .limit(50)
      
      if (error) throw error
      return { results: data || [], error: null }
    } catch (error) {
      console.error('Search library error:', error)
      return { results: [], error: error.message }
    }
  }
}

// File upload helpers
export const storage = {
  // Upload artwork image
  uploadArtwork: async (file, userId, fileName = null) => {
    try {
      const fileExtension = file.name.split('.').pop()
      const uniqueFileName = fileName || `${userId}/${Date.now()}.${fileExtension}`
      
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.ARTWORK)
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) throw error
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKETS.ARTWORK)
        .getPublicUrl(data.path)
      
      return { 
        path: data.path,
        url: publicUrlData.publicUrl,
        error: null 
      }
    } catch (error) {
      console.error('Upload artwork error:', error)
      return { path: null, url: null, error: error.message }
    }
  },

  // Upload audio file
  uploadAudio: async (audioBlob, userId, fileName = null) => {
    try {
      const uniqueFileName = fileName || `${userId}/${Date.now()}.mp3`
      
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.AUDIO)
        .upload(uniqueFileName, audioBlob, {
          contentType: 'audio/mpeg',
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) throw error
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKETS.AUDIO)
        .getPublicUrl(data.path)
      
      return { 
        path: data.path,
        url: publicUrlData.publicUrl,
        error: null 
      }
    } catch (error) {
      console.error('Upload audio error:', error)
      return { path: null, url: null, error: error.message }
    }
  },

  // Delete file
  deleteFile: async (bucket, filePath) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath])
      
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Delete file error:', error)
      return { error: error.message }
    }
  }
}

// Real-time subscriptions
export const subscriptions = {
  // Subscribe to story changes
  subscribeToStories: (userId, callback) => {
    return supabase
      .channel('user-stories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to artwork changes
  subscribeToArtwork: (userId, callback) => {
    return supabase
      .channel('user-artwork')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artwork',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }
}

// Utility functions
export const utils = {
  // Generate unique filename
  generateFileName: (userId, originalName, type = 'image') => {
    const timestamp = Date.now()
    const extension = originalName.split('.').pop()
    return `${userId}/${type}s/${timestamp}.${extension}`
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // Format duration
  formatDuration: (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
}

export default supabase