-- =============================================
-- StoryForge Supabase Authentication Setup
-- =============================================
-- Run this script in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. CREATE PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. CREATE STORIES TABLE (SIMPLIFIED)
-- =============================================
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Story content
  title TEXT NOT NULL,
  description TEXT,
  full_text TEXT NOT NULL,
  
  -- Story metadata
  hero_name TEXT,
  story_mode TEXT DEFAULT 'classic',
  age_target TEXT DEFAULT '6',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. CREATE AUDIO FILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.audio_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL DEFAULT 'Story Audio',
  file_path TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. CREATE CHARACTERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. CREATE SCENES TABLE  
-- =============================================
CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. CREATE RLS POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Stories policies
CREATE POLICY "Users can view own stories" ON public.stories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stories" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON public.stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON public.stories
  FOR DELETE USING (auth.uid() = user_id);

-- Audio files policies
CREATE POLICY "Users can view own audio files" ON public.audio_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio files" ON public.audio_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio files" ON public.audio_files
  FOR DELETE USING (auth.uid() = user_id);

-- Characters policies
CREATE POLICY "Users can view own characters" ON public.characters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own characters" ON public.characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scenes policies
CREATE POLICY "Users can view own scenes" ON public.scenes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scenes" ON public.scenes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 8. CREATE FUNCTION TO HANDLE USER CREATION
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', 'StoryForge User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. CREATE TRIGGER FOR NEW USER PROFILES
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 10. GRANT PERMISSIONS
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on profiles for anon (needed for anonymous auth)
GRANT SELECT, INSERT ON public.profiles TO anon;
GRANT SELECT, INSERT ON public.stories TO anon;
GRANT SELECT, INSERT ON public.audio_files TO anon;
GRANT SELECT, INSERT ON public.characters TO anon;
GRANT SELECT, INSERT ON public.scenes TO anon;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$ 
BEGIN 
  RAISE NOTICE 'StoryForge database setup complete!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Go to Authentication > Settings in Supabase dashboard';
  RAISE NOTICE '2. Enable "Allow anonymous sign-ins"';
  RAISE NOTICE '3. Test the connection from your app';
END $$;