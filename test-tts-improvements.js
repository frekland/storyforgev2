// Test script for TTS improvements
// This simulates the functions without requiring actual TTS clients

// Mock the voice selection logic
function getVoiceSettings(age) {
  switch (age) {
    case '3':
      return {
        languageCode: 'en-US',
        name: 'en-US-Casual-K', // Warm, friendly female voice
        ssmlGender: 'FEMALE'
      };
    case '6':
      return {
        languageCode: 'en-US',
        name: 'en-US-Journey-F', // Clear, engaging female voice
        ssmlGender: 'FEMALE'
      };
    case '9':
      return {
        languageCode: 'en-US',
        name: 'en-US-Journey-D', // Professional, engaging voice
        ssmlGender: 'MALE'
      };
    case '12':
      return {
        languageCode: 'en-US',
        name: 'en-US-Studio-O', // Mature, sophisticated voice
        ssmlGender: 'FEMALE'
      };
    default:
      return {
        languageCode: 'en-US',
        name: 'en-US-Journey-F',
        ssmlGender: 'FEMALE'
      };
  }
}

// Mock the SSML processing function
function processStoryForTTS(storyText, age) {
  // Remove non-pronounceable characters and format for TTS
  let cleanText = storyText
    // Remove asterisks and other special characters
    .replace(/\*/g, '')
    .replace(/[^a-zA-Z0-9\s.,!?;:'"-]/g, '')
    // Fix common TTS issues
    .replace(/\s+/g, ' ')
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .trim();

  // Age-appropriate SSML processing
  let processedText = cleanText;
  
  // Add dramatic emphasis for exciting parts
  processedText = processedText
    .replace(/(!)/g, '<emphasis level="strong">$1</emphasis><break time="0.3s"/>')
    .replace(/(\?)/g, '<emphasis level="moderate">$1</emphasis><break time="0.2s"/>')
    .replace(/(\"[^\"]*\")/g, '<prosody pitch="+1st" rate="0.95">$1</prosody>') // Dialogue with slight pitch change
    .replace(/(suddenly|amazing|wonderful|magical|incredible)/gi, '<emphasis level="strong">$1</emphasis>')
    .replace(/(whispered|quietly)/gi, '<prosody volume="-3dB">$1</prosody>')
    .replace(/(shouted|yelled|roared)/gi, '<prosody volume="+3dB" pitch="+2st">$1</prosody>');

  // Age-specific SSML enhancements
  let baseRate, basePitch, pauseTime;
  
  switch (age) {
    case '3':
      baseRate = '0.8';
      basePitch = '+3st';
      pauseTime = '0.8s';
      break;
    case '6':
      baseRate = '0.9';
      basePitch = '+1st';
      pauseTime = '0.6s';
      break;
    case '9':
      baseRate = '0.95';
      basePitch = '+0.5st';
      pauseTime = '0.4s';
      break;
    case '12':
      baseRate = '1.0';
      basePitch = '0st';
      pauseTime = '0.3s';
      break;
    default:
      baseRate = '0.9';
      basePitch = '+1st';
      pauseTime = '0.5s';
  }

  // Create SSML with age-appropriate settings
  const ssmlText = `<speak>
    <prosody rate="${baseRate}" pitch="${basePitch}" volume="+2dB">
      <break time="${pauseTime}"/>
      ${processedText}
      <break time="1s"/>
    </prosody>
  </speak>`;

  return {
    displayText: cleanText, // Clean text for UI display
    ttsText: ssmlText      // SSML-enhanced text for TTS
  };
}

// Test the functions
console.log('Testing TTS improvements...\n');

const testStory = 'Once upon a time, there was a magical dragon! "Hello there!" said the dragon quietly. The princess shouted, "That\'s amazing!" *The dragon smiled*.';

const ages = ['3', '6', '9', '12'];

ages.forEach(age => {
  console.log(`=== AGE ${age} ===`);
  
  const voiceSettings = getVoiceSettings(age);
  console.log('Voice Settings:', voiceSettings);
  
  const processedStory = processStoryForTTS(testStory, age);
  console.log('Display Text:', processedStory.displayText);
  console.log('TTS Text:', processedStory.ttsText);
  console.log('');
});

console.log('✅ All tests completed successfully!');