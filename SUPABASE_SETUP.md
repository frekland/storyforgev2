# StoryForge Supabase Setup Guide

## Step 1: Run the Database Setup

1. Go to your Supabase dashboard
2. Navigate to the **SQL Editor**
3. Copy and paste the entire contents of `database/setup-auth.sql`
4. Click **Run** to execute the script

## Step 2: Enable Anonymous Authentication

1. Go to **Authentication > Settings** in your Supabase dashboard
2. Scroll down to **Site Settings**
3. **Enable** the toggle for **"Allow anonymous sign-ins"**
4. Click **Save**

## Step 3: Verify RLS Policies

1. Go to **Authentication > Policies** in your Supabase dashboard
2. You should see policies for:
   - `profiles` table
   - `stories` table
   - `audio_files` table
   - `characters` table
   - `scenes` table

## Step 4: Test the Connection

1. Deploy your changes and test story creation
2. Check the browser console for authentication logs:
   - ✅ Anonymous user created: [user-id]
   - ✅ Story saved to library successfully!

## Troubleshooting

### If anonymous auth still fails:
1. Check Authentication > Settings > Site URL is set correctly
2. Verify your API keys in the project settings
3. Make sure RLS is enabled on all tables

### If stories don't save:
1. Check the browser console for detailed error messages
2. Verify the database schema matches the code
3. Test the connection manually in SQL Editor:
   ```sql
   SELECT * FROM auth.users LIMIT 5;
   SELECT * FROM public.stories LIMIT 5;
   ```

### If library doesn't load:
1. Check that profiles table is created
2. Verify RLS policies are active
3. Test anonymous authentication is working

## Database Schema Summary

The setup creates these tables:
- `profiles` - User profile information
- `stories` - Main story content with `full_text` column
- `audio_files` - Audio file references with `file_path`
- `characters` - Character data linked to stories  
- `scenes` - Scene data linked to stories

All tables use `auth.uid()` for Row Level Security to ensure users can only access their own data.

## Next Steps

Once this setup is complete:
1. Stories will automatically save to the database
2. The library will load real user data
3. Anonymous users get automatic profiles
4. Data is properly secured with RLS