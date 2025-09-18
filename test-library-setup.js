// =============================================
// StoryForge Library Setup Test Script
// =============================================
// Run this script to verify your Supabase connection
// and library functionality is working correctly

import { supabase, auth, libraryAPI, storage } from './lib/supabase.js';

// Test configuration
const TEST_CONFIG = {
  testEmail: 'test@storyforge.dev',
  testPassword: 'StoryForge2024!',
  testUserName: 'Library Test User'
};

console.log('🚀 Starting StoryForge Library Setup Tests...\n');

// =============================================
// Test 1: Environment Variables
// =============================================
function testEnvironmentVariables() {
  console.log('📋 Test 1: Environment Variables');
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables!');
    console.log('Please check your .env file contains:');
    console.log('VITE_SUPABASE_URL=your-url');
    console.log('VITE_SUPABASE_ANON_KEY=your-key');
    return false;
  }
  
  console.log('✅ Environment variables configured');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
  return true;
}

// =============================================
// Test 2: Supabase Connection
// =============================================
async function testSupabaseConnection() {
  console.log('\n🔌 Test 2: Supabase Connection');
  
  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

// =============================================
// Test 3: Database Schema
// =============================================
async function testDatabaseSchema() {
  console.log('\n🗄️ Test 3: Database Schema');
  
  const expectedTables = [
    'profiles', 'stories', 'artwork', 'characters', 
    'scenes', 'audio_files', 'collections', 'collection_stories'
  ];
  
  let tablesExist = true;
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        console.error(`❌ Table '${table}' does not exist`);
        tablesExist = false;
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    } catch (error) {
      console.error(`❌ Error checking table '${table}':`, error.message);
      tablesExist = false;
    }
  }
  
  return tablesExist;
}

// =============================================
// Test 4: Authentication
// =============================================
async function testAuthentication() {
  console.log('\n🔐 Test 4: Authentication');
  
  try {
    // Test user signup (will fail if user exists, that's ok)
    console.log('   Testing user signup...');
    const signupResult = await auth.signUp(
      TEST_CONFIG.testEmail,
      TEST_CONFIG.testPassword,
      { displayName: TEST_CONFIG.testUserName }
    );
    
    if (signupResult.error && !signupResult.error.includes('already registered')) {
      console.warn(`⚠️  Signup warning: ${signupResult.error}`);
    } else {
      console.log('✅ User signup works (or user already exists)');
    }
    
    // Test user signin
    console.log('   Testing user signin...');
    const signinResult = await auth.signIn(
      TEST_CONFIG.testEmail,
      TEST_CONFIG.testPassword
    );
    
    if (signinResult.error) {
      console.error('❌ Signin failed:', signinResult.error);
      return false;
    }
    
    console.log('✅ User signin successful');
    console.log(`   User ID: ${signinResult.user.id}`);
    
    return { success: true, user: signinResult.user };
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return false;
  }
}

// =============================================
// Test 5: Library API Functions
// =============================================
async function testLibraryAPI(user) {
  console.log('\n📚 Test 5: Library API Functions');
  
  if (!user) {
    console.error('❌ No user provided for API testing');
    return false;
  }
  
  try {
    // Test story creation
    console.log('   Testing story creation...');
    const testStory = {
      user_id: user.id,
      title: 'Test Story - Library Setup',
      description: 'A test story created during library setup',
      full_text: 'Once upon a time, there was a magical library system that worked perfectly!',
      word_count: 15,
      hero_name: 'Test Hero',
      story_mode: 'classic',
      chapter_count: 1,
      chapters: [{
        title: 'Chapter 1: The Beginning',
        text: 'Once upon a time...',
        audio_url: null
      }],
      tags: ['test', 'setup'],
      privacy_level: 'private'
    };
    
    const saveResult = await libraryAPI.saveStory(testStory);
    if (saveResult.error) {
      console.error('❌ Story creation failed:', saveResult.error);
      return false;
    }
    
    console.log('✅ Story created successfully');
    console.log(`   Story ID: ${saveResult.story.id}`);
    
    // Test story retrieval
    console.log('   Testing story retrieval...');
    const getResult = await libraryAPI.getStories(user.id);
    if (getResult.error) {
      console.error('❌ Story retrieval failed:', getResult.error);
      return false;
    }
    
    console.log('✅ Story retrieval successful');
    console.log(`   Found ${getResult.stories.length} stories`);
    
    // Test story search
    console.log('   Testing story search...');
    const searchResult = await libraryAPI.getStories(user.id, { 
      search: 'magical library' 
    });
    
    if (searchResult.error) {
      console.error('❌ Story search failed:', searchResult.error);
      return false;
    }
    
    console.log('✅ Story search successful');
    console.log(`   Found ${searchResult.stories.length} matching stories`);
    
    return { success: true, testStoryId: saveResult.story.id };
  } catch (error) {
    console.error('❌ Library API error:', error.message);
    return false;
  }
}

// =============================================
// Test 6: Storage Buckets
// =============================================
async function testStorageBuckets() {
  console.log('\n💾 Test 6: Storage Buckets');
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Failed to list buckets:', error.message);
      return false;
    }
    
    const expectedBuckets = ['artwork', 'audio', 'avatars'];
    const existingBuckets = buckets.map(b => b.name);
    
    let allBucketsExist = true;
    for (const bucket of expectedBuckets) {
      if (existingBuckets.includes(bucket)) {
        console.log(`✅ Bucket '${bucket}' exists`);
      } else {
        console.error(`❌ Bucket '${bucket}' missing`);
        allBucketsExist = false;
      }
    }
    
    if (!allBucketsExist) {
      console.log('\n⚠️  Missing buckets. Create them in Supabase Dashboard > Storage:');
      expectedBuckets.forEach(bucket => {
        console.log(`   - ${bucket} (public bucket)`);
      });
    }
    
    return allBucketsExist;
  } catch (error) {
    console.error('❌ Storage test error:', error.message);
    return false;
  }
}

// =============================================
// Test 7: File Upload (Mock)
// =============================================
async function testFileUpload(user) {
  console.log('\n📤 Test 7: File Upload Capability');
  
  if (!user) {
    console.error('❌ No user provided for upload testing');
    return false;
  }
  
  try {
    // Create a small test blob (fake image)
    const testImageData = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzY2NjZmMSIvPjwvc3ZnPg==';
    
    // Convert to blob
    const response = await fetch(testImageData);
    const blob = await response.blob();
    
    console.log('   Testing artwork upload...');
    const uploadResult = await storage.uploadArtwork(blob, user.id, 'test-setup.svg');
    
    if (uploadResult.error) {
      console.error('❌ File upload failed:', uploadResult.error);
      return false;
    }
    
    console.log('✅ File upload successful');
    console.log(`   Upload path: ${uploadResult.path}`);
    console.log(`   Public URL: ${uploadResult.url}`);
    
    return true;
  } catch (error) {
    console.error('❌ Upload test error:', error.message);
    return false;
  }
}

// =============================================
// Main Test Runner
// =============================================
async function runAllTests() {
  console.log('🧪 StoryForge Library Setup Test Suite');
  console.log('=====================================\n');
  
  const results = {
    environment: false,
    connection: false,
    schema: false,
    auth: false,
    api: false,
    storage: false,
    upload: false
  };
  
  // Run tests sequentially
  results.environment = testEnvironmentVariables();
  
  if (results.environment) {
    results.connection = await testSupabaseConnection();
  }
  
  if (results.connection) {
    results.schema = await testDatabaseSchema();
  }
  
  let testUser = null;
  if (results.schema) {
    const authResult = await testAuthentication();
    results.auth = authResult !== false;
    testUser = authResult.user || null;
  }
  
  if (results.auth && testUser) {
    const apiResult = await testLibraryAPI(testUser);
    results.api = apiResult !== false;
  }
  
  results.storage = await testStorageBuckets();
  
  if (results.storage && testUser) {
    results.upload = await testFileUpload(testUser);
  }
  
  // Print summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const testNames = {
    environment: 'Environment Variables',
    connection: 'Supabase Connection',
    schema: 'Database Schema',
    auth: 'Authentication',
    api: 'Library API Functions',
    storage: 'Storage Buckets',
    upload: 'File Upload'
  };
  
  const passedTests = Object.keys(results).filter(key => results[key]);
  const totalTests = Object.keys(results).length;
  
  Object.entries(results).forEach(([key, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testNames[key]}`);
  });
  
  console.log(`\n🎯 ${passedTests.length}/${totalTests} tests passed`);
  
  if (passedTests.length === totalTests) {
    console.log('\n🎉 All tests passed! Your StoryForge Library is ready to use!');
    console.log('\nNext steps:');
    console.log('1. Run the app and test the Library UI');
    console.log('2. Create a story and verify it saves to the library');
    console.log('3. Upload artwork and test the gallery');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above before proceeding.');
    
    if (!results.schema) {
      console.log('\n📋 To fix database schema:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run the schema from database/schema.sql');
    }
    
    if (!results.storage) {
      console.log('\n📋 To fix storage buckets:');
      console.log('1. Go to Supabase Dashboard > Storage');
      console.log('2. Create buckets: artwork, audio, avatars (all public)');
    }
  }
  
  // Clean up test data
  if (testUser) {
    try {
      console.log('\n🧹 Cleaning up test data...');
      await auth.signOut();
      console.log('✅ Test cleanup complete');
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === new URL(window.location.href).href) {
  runAllTests().catch(console.error);
}

export { runAllTests };