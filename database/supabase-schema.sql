-- =============================================
-- StoryForge Library - Supabase Compatible Schema
-- =============================================
-- This schema is tested and compatible with Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  
  -- Library settings
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 1073741824,
  
  -- Preferences
  privacy_default TEXT DEFAULT 'private',
  auto_sync_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for privacy_default
ALTER TABLE public.profiles ADD CONSTRAINT profiles_privacy_default_check 
CHECK (privacy_default IN ('private', 'family', 'public'));

-- =============================================
-- STORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Story content
  title TEXT NOT NULL,
  description TEXT,
  full_text TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  
  -- Multi-chapter support
  chapter_count INTEGER DEFAULT 1,
  chapters JSONB DEFAULT '[]',
  
  -- Story metadata
  hero_name TEXT,
  story_setup TEXT,
  story_rising TEXT,
  story_climax TEXT,
  age_target TEXT DEFAULT '6',
  story_mode TEXT DEFAULT 'classic',
  
  -- Media references
  cover_image_id UUID,
  total_duration INTEGER DEFAULT 0,
  total_file_size BIGINT DEFAULT 0,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  privacy_level TEXT DEFAULT 'private',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_played_at TIMESTAMPTZ,
  play_count INTEGER DEFAULT 0
);

-- Add constraints for stories
ALTER TABLE public.stories ADD CONSTRAINT stories_privacy_level_check 
CHECK (privacy_level IN ('private', 'family', 'public'));

-- =============================================
-- ARTWORK TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.artwork (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Image details
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  
  -- Usage tracking
  artwork_type TEXT DEFAULT 'character',
  used_in_stories UUID[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints for artwork
ALTER TABLE public.artwork ADD CONSTRAINT artwork_type_check 
CHECK (artwork_type IN ('character', 'scene', 'cover', 'other'));

-- =============================================
-- CHARACTERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Character details
  name TEXT NOT NULL,
  description TEXT,
  personality_traits TEXT,
  special_abilities TEXT,
  
  -- Visual representation
  artwork_id UUID REFERENCES public.artwork(id) ON DELETE SET NULL,
  
  -- Usage tracking
  stories_used UUID[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SCENES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Scene details
  name TEXT NOT NULL,
  description TEXT,
  setting_type TEXT,
  atmosphere TEXT,
  
  -- Visual representation
  artwork_id UUID REFERENCES public.artwork(id) ON DELETE SET NULL,
  
  -- Usage tracking
  stories_used UUID[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AUDIO FILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.audio_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  
  -- Audio details
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL,
  file_size BIGINT NOT NULL,
  
  -- Generation metadata
  chapter_index INTEGER DEFAULT 0,
  voice_settings JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COLLECTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Collection details
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📚',
  
  -- Privacy
  privacy_level TEXT DEFAULT 'private',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints for collections
ALTER TABLE public.collections ADD CONSTRAINT collections_privacy_level_check 
CHECK (privacy_level IN ('private', 'family', 'public'));

-- =============================================
-- COLLECTION STORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.collection_stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, story_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_tags ON public.stories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_stories_privacy ON public.stories(privacy_level);
CREATE INDEX IF NOT EXISTS idx_stories_favorite ON public.stories(user_id, is_favorite);

-- Artwork indexes
CREATE INDEX IF NOT EXISTS idx_artwork_user_id ON public.artwork(user_id);
CREATE INDEX IF NOT EXISTS idx_artwork_type ON public.artwork(artwork_type);
CREATE INDEX IF NOT EXISTS idx_artwork_tags ON public.artwork USING GIN(tags);

-- Characters indexes
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON public.characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_usage ON public.characters(usage_count DESC);

-- Scenes indexes
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON public.scenes(user_id);

-- Audio files indexes
CREATE INDEX IF NOT EXISTS idx_audio_files_story ON public.audio_files(story_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_chapter ON public.audio_files(chapter_index);

-- Collections indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_stories_collection ON public.collection_stories(collection_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_stories ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Stories policies
CREATE POLICY "Users can view own stories" ON public.stories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stories" ON public.stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- Artwork policies
CREATE POLICY "Users can view own artwork" ON public.artwork FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own artwork" ON public.artwork FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own artwork" ON public.artwork FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own artwork" ON public.artwork FOR DELETE USING (auth.uid() = user_id);

-- Characters policies
CREATE POLICY "Users can view own characters" ON public.characters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own characters" ON public.characters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own characters" ON public.characters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own characters" ON public.characters FOR DELETE USING (auth.uid() = user_id);

-- Scenes policies
CREATE POLICY "Users can view own scenes" ON public.scenes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scenes" ON public.scenes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scenes" ON public.scenes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scenes" ON public.scenes FOR DELETE USING (auth.uid() = user_id);

-- Audio files policies
CREATE POLICY "Users can view own audio files" ON public.audio_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audio files" ON public.audio_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audio files" ON public.audio_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audio files" ON public.audio_files FOR DELETE USING (auth.uid() = user_id);

-- Collections policies
CREATE POLICY "Users can view own collections" ON public.collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own collections" ON public.collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own collections" ON public.collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own collections" ON public.collections FOR DELETE USING (auth.uid() = user_id);

-- Collection stories policies
CREATE POLICY "Users can view own collection stories" ON public.collection_stories 
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM public.collections WHERE id = collection_id
  )
);

CREATE POLICY "Users can insert own collection stories" ON public.collection_stories 
FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.collections WHERE id = collection_id
  )
);

CREATE POLICY "Users can delete own collection stories" ON public.collection_stories 
FOR DELETE USING (
  auth.uid() IN (
    SELECT user_id FROM public.collections WHERE id = collection_id
  )
);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.artwork FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.scenes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ StoryForge Library database schema created successfully!';
    RAISE NOTICE '🏗️  Tables: profiles, stories, artwork, characters, scenes, audio_files, collections, collection_stories';
    RAISE NOTICE '🔒 Row Level Security enabled with user-specific policies';
    RAISE NOTICE '🔧 Triggers configured for auto-timestamps and profile creation';
    RAISE NOTICE '📚 Ready for StoryForge Library integration!';
END $$;