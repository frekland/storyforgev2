-- StoryForge Library Database Schema for Supabase
-- This schema supports user libraries, story management, and social sharing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  
  -- Library settings
  storage_used BIGINT DEFAULT 0, -- bytes used
  storage_limit BIGINT DEFAULT 1073741824, -- 1GB default limit
  
  -- Preferences
  privacy_default TEXT DEFAULT 'private' CHECK (privacy_default IN ('private', 'family', 'public')),
  auto_sync_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stories table - core content
CREATE TABLE public.stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Story content
  title TEXT NOT NULL,
  description TEXT,
  full_text TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  
  -- Multi-chapter support
  chapter_count INTEGER DEFAULT 1,
  chapters JSONB DEFAULT '[]', -- Array of chapter objects with titles, text, audio_url
  
  -- Story generation metadata
  hero_name TEXT,
  story_setup TEXT,
  story_rising TEXT,
  story_climax TEXT,
  age_target TEXT DEFAULT '6',
  story_mode TEXT DEFAULT 'classic', -- classic, adventure-me, etc.
  
  -- Media
  cover_image_id UUID, -- References artwork table
  total_duration INTEGER DEFAULT 0, -- seconds
  total_file_size BIGINT DEFAULT 0, -- bytes
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('private', 'family', 'public')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_played_at TIMESTAMP WITH TIME ZONE,
  play_count INTEGER DEFAULT 0
);

-- Artwork table - images uploaded by users
CREATE TABLE public.artwork (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Image details
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL, -- Supabase storage URL
  thumbnail_url TEXT, -- Compressed version
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  
  -- Usage tracking
  artwork_type TEXT DEFAULT 'character' CHECK (artwork_type IN ('character', 'scene', 'cover', 'other')),
  used_in_stories UUID[] DEFAULT '{}', -- Array of story IDs
  usage_count INTEGER DEFAULT 0,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Characters table - extracted/defined characters for reuse
CREATE TABLE public.characters (
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
  stories_used UUID[] DEFAULT '{}', -- Array of story IDs
  usage_count INTEGER DEFAULT 0,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scenes table - locations/settings for reuse
CREATE TABLE public.scenes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Scene details
  name TEXT NOT NULL,
  description TEXT,
  setting_type TEXT, -- forest, castle, underwater, etc.
  atmosphere TEXT, -- magical, scary, peaceful, etc.
  
  -- Visual representation
  artwork_id UUID REFERENCES public.artwork(id) ON DELETE SET NULL,
  
  -- Usage tracking
  stories_used UUID[] DEFAULT '{}', -- Array of story IDs
  usage_count INTEGER DEFAULT 0,
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio files table - generated narrations
CREATE TABLE public.audio_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  
  -- Audio details
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL, -- Supabase storage URL
  duration INTEGER NOT NULL, -- seconds
  file_size BIGINT NOT NULL,
  
  -- Generation metadata
  chapter_index INTEGER DEFAULT 0, -- 0 for single chapter, 1+ for multi-chapter
  voice_settings JSONB, -- Voice type, speed, etc.
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collections table - user-created groupings
CREATE TABLE public.collections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Collection details
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1', -- UI color theme
  icon TEXT DEFAULT '📚', -- Emoji icon
  
  -- Privacy and sharing
  privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('private', 'family', 'public')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for stories in collections
CREATE TABLE public.collection_stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, story_id)
);

-- Sharing links table - public URLs for stories
CREATE TABLE public.sharing_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Link details
  public_slug TEXT UNIQUE NOT NULL, -- Short URL identifier
  title TEXT, -- Custom title for shared link
  description TEXT, -- Custom description
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  -- Settings
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = never expires
  is_active BOOLEAN DEFAULT true,
  allow_download BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Search index table for full-text search
CREATE TABLE public.search_index (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('story', 'artwork', 'character', 'scene')),
  content_id UUID NOT NULL,
  
  -- Searchable content
  title TEXT,
  description TEXT,
  tags TEXT[],
  searchable_text TEXT, -- Combined searchable content
  
  -- Search vector for full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || array_to_string(tags, ' '))
  ) STORED,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add foreign key reference for cover images
ALTER TABLE public.stories 
ADD CONSTRAINT stories_cover_image_fk 
FOREIGN KEY (cover_image_id) REFERENCES public.artwork(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_created_at ON public.stories(created_at DESC);
CREATE INDEX idx_stories_tags ON public.stories USING gin(tags);
CREATE INDEX idx_stories_privacy_level ON public.stories(privacy_level);

CREATE INDEX idx_artwork_user_id ON public.artwork(user_id);
CREATE INDEX idx_artwork_type ON public.artwork(artwork_type);
CREATE INDEX idx_artwork_created_at ON public.artwork(created_at DESC);
CREATE INDEX idx_artwork_tags ON public.artwork USING gin(tags);

CREATE INDEX idx_characters_user_id ON public.characters(user_id);
CREATE INDEX idx_characters_name ON public.characters(name);

CREATE INDEX idx_scenes_user_id ON public.scenes(user_id);
CREATE INDEX idx_scenes_setting_type ON public.scenes(setting_type);

CREATE INDEX idx_audio_files_story_id ON public.audio_files(story_id);
CREATE INDEX idx_sharing_links_slug ON public.sharing_links(public_slug);
CREATE INDEX idx_search_index_user_search ON public.search_index(user_id, search_vector);

-- Create full-text search index
CREATE INDEX idx_search_vector ON public.search_index USING gin(search_vector);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Stories policies
CREATE POLICY "Users can manage own stories" ON public.stories
  FOR ALL USING (auth.uid() = user_id);
  
CREATE POLICY "Anyone can view public stories" ON public.stories
  FOR SELECT USING (privacy_level = 'public');

-- Artwork policies
CREATE POLICY "Users can manage own artwork" ON public.artwork
  FOR ALL USING (auth.uid() = user_id);

-- Characters policies  
CREATE POLICY "Users can manage own characters" ON public.characters
  FOR ALL USING (auth.uid() = user_id);

-- Scenes policies
CREATE POLICY "Users can manage own scenes" ON public.scenes
  FOR ALL USING (auth.uid() = user_id);

-- Audio files policies
CREATE POLICY "Users can manage own audio files" ON public.audio_files
  FOR ALL USING (auth.uid() = user_id);

-- Collections policies
CREATE POLICY "Users can manage own collections" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own collection stories" ON public.collection_stories
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM public.collections WHERE id = collection_id
  ));

-- Sharing links policies (public read access)
CREATE POLICY "Anyone can view active sharing links" ON public.sharing_links
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));
  
CREATE POLICY "Users can manage own sharing links" ON public.sharing_links
  FOR ALL USING (auth.uid() = user_id);

-- Search index policies
CREATE POLICY "Users can manage own search index" ON public.search_index
  FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON public.stories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_artwork_updated_at BEFORE UPDATE ON public.artwork 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON public.characters 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON public.scenes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to maintain search index
CREATE OR REPLACE FUNCTION maintain_search_index()
RETURNS TRIGGER AS $$
BEGIN
  -- Update search index when content changes
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.search_index (user_id, content_type, content_id, title, description, tags)
    VALUES (NEW.user_id, TG_TABLE_NAME::text, NEW.id, NEW.title, NEW.description, COALESCE(NEW.tags, '{}'))
    ON CONFLICT (user_id, content_type, content_id) 
    DO UPDATE SET 
      title = NEW.title,
      description = NEW.description, 
      tags = COALESCE(NEW.tags, '{}'),
      updated_at = NOW();
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.search_index 
    WHERE content_id = OLD.id AND content_type = TG_TABLE_NAME::text;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create search index maintenance triggers
CREATE TRIGGER maintain_stories_search AFTER INSERT OR UPDATE OR DELETE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION maintain_search_index();
  
CREATE TRIGGER maintain_artwork_search AFTER INSERT OR UPDATE OR DELETE ON public.artwork
  FOR EACH ROW EXECUTE FUNCTION maintain_search_index();
  
CREATE TRIGGER maintain_characters_search AFTER INSERT OR UPDATE OR DELETE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION maintain_search_index();
  
CREATE TRIGGER maintain_scenes_search AFTER INSERT OR UPDATE OR DELETE ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION maintain_search_index();