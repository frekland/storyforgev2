export default async function handler(req, res) {
  try {
    console.log('🔧 Test audio endpoint called');
    console.log('Request method:', req.method);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request query:', JSON.stringify(req.query, null, 2));

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Get format from query parameter
    const format = req.query.format || 'wav';
    console.log('🎵 Requested format:', format);

    // Format-specific audio generation
    let audioBuffer, contentType;
    
    if (format === 'minimal') {
      // Minimal test - return smallest possible valid WAV
      audioBuffer = createMinimalWAV();
      contentType = 'audio/wav';
      console.log(`🎵 Generated minimal WAV: ${audioBuffer.length} bytes`);
    } else if (format === 'simple') {
      // Ultra simple WAV for testing
      audioBuffer = createSimpleWAV();
      contentType = 'audio/wav';
      console.log(`🎵 Generated simple WAV: ${audioBuffer.length} bytes`);
    } else if (format === 'wav44') {
      // WAV at 44.1kHz (CD quality)
      const result = generateWAV(44100, 5);
      audioBuffer = result.buffer;
      contentType = 'audio/wav';
      console.log(`🎵 Generated WAV 44.1kHz: ${audioBuffer.length} bytes`);
    } else if (format === 'wav22') {
      // WAV at 22.05kHz (our TTS rate)
      const result = generateWAV(22050, 5);
      audioBuffer = result.buffer;
      contentType = 'audio/wav';
      console.log(`🎵 Generated WAV 22.05kHz: ${audioBuffer.length} bytes`);
    } else {
      // Default WAV 22kHz
      const result = generateWAV(22050, 5);
      audioBuffer = result.buffer;
      contentType = 'audio/wav';
      console.log(`🎵 Generated default WAV: ${audioBuffer.length} bytes`);
    }
    
    // Set audio headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    
    res.status(200).send(Buffer.from(audioBuffer));
    
  } catch (error) {
    console.error('❌ Test audio error:', error);
    res.status(500).json({ 
      error: 'Test audio generation failed',
      details: error.message 
    });
  }
}

function generateWAV(sampleRate, duration) {
  const frequency = 440; // A note
  const samples = sampleRate * duration;
  
  // Create PCM audio data
  const audioData = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3; // 30% volume
  }
  
  // Convert to 16-bit PCM
  const pcmData = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {
    pcmData[i] = audioData[i] * 32767;
  }
  
  // Create WAV header
  const wavHeader = createWAVHeader(samples, sampleRate);
  const pcmBytes = new Uint8Array(pcmData.buffer);
  
  // Combine header and data
  const buffer = new Uint8Array(wavHeader.length + pcmBytes.length);
  buffer.set(wavHeader, 0);
  buffer.set(pcmBytes, wavHeader.length);
  
  return { buffer, samples, sampleRate, duration };
}

// Create a minimal WAV file for testing
function createSimpleWAV() {
  const sampleRate = 22050; // Use same as TTS for consistency
  const duration = 2; // 2 seconds
  const samples = sampleRate * duration;
  const frequency = 440;
  
  console.log(`Creating WAV: ${sampleRate}Hz, ${duration}s, ${samples} samples`);
  
  // Generate simple sine wave with proper 16-bit range
  const pcmBuffer = new ArrayBuffer(samples * 2);
  const pcmView = new DataView(pcmBuffer);
  
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5; // 50% volume
    const intSample = Math.round(sample * 32767);
    pcmView.setInt16(i * 2, intSample, true); // little-endian
  }
  
  // WAV file structure
  const dataSize = samples * 2;
  const fileSize = 44 + dataSize;
  
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);
  
  // RIFF header (12 bytes)
  view.setUint32(0, 0x52494646, false);  // "RIFF" - big endian
  view.setUint32(4, fileSize - 8, true);  // file size - 8
  view.setUint32(8, 0x57415645, false);   // "WAVE" - big endian
  
  // fmt chunk (24 bytes)
  view.setUint32(12, 0x666d7420, false); // "fmt " - big endian
  view.setUint32(16, 16, true);          // fmt chunk size (16 bytes)
  view.setUint16(20, 1, true);           // audio format (PCM = 1)
  view.setUint16(22, 1, true);           // number of channels (mono = 1)
  view.setUint32(24, sampleRate, true);  // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate (sample rate * channels * bytes per sample)
  view.setUint16(32, 2, true);           // block align (channels * bytes per sample)
  view.setUint16(34, 16, true);          // bits per sample
  
  // data chunk header (8 bytes)
  view.setUint32(36, 0x64617461, false); // "data" - big endian
  view.setUint32(40, dataSize, true);    // data size
  
  // Copy PCM data
  const wavBytes = new Uint8Array(wavBuffer);
  const pcmBytes = new Uint8Array(pcmBuffer);
  wavBytes.set(pcmBytes, 44);
  
  console.log(`WAV created: ${wavBytes.length} bytes total (${dataSize} audio data)`);
  
  return wavBytes;
}

// Create the smallest possible valid WAV file
function createMinimalWAV() {
  console.log('Creating minimal WAV test...');
  
  // Create a very short beep - 0.1 seconds at 8kHz
  const sampleRate = 8000;
  const duration = 0.1;
  const samples = Math.floor(sampleRate * duration);
  const frequency = 1000; // 1kHz beep
  
  // Create audio data
  const audioData = [];
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    const intSample = Math.round(sample * 32767);
    // Convert to bytes (little-endian 16-bit)
    audioData.push(intSample & 0xFF, (intSample >> 8) & 0xFF);
  }
  
  const dataSize = audioData.length;
  const fileSize = 36 + dataSize;
  
  // Build WAV header manually as byte array
  const wav = [
    // RIFF header
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    fileSize & 0xFF, (fileSize >> 8) & 0xFF, (fileSize >> 16) & 0xFF, (fileSize >> 24) & 0xFF,
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    
    // fmt chunk
    0x66, 0x6D, 0x74, 0x20, // "fmt "
    16, 0, 0, 0,            // chunk size
    1, 0,                   // audio format (PCM)
    1, 0,                   // channels (mono)
    sampleRate & 0xFF, (sampleRate >> 8) & 0xFF, (sampleRate >> 16) & 0xFF, (sampleRate >> 24) & 0xFF,
    (sampleRate * 2) & 0xFF, ((sampleRate * 2) >> 8) & 0xFF, ((sampleRate * 2) >> 16) & 0xFF, ((sampleRate * 2) >> 24) & 0xFF,
    2, 0,                   // block align
    16, 0,                  // bits per sample
    
    // data chunk
    0x64, 0x61, 0x74, 0x61, // "data"
    dataSize & 0xFF, (dataSize >> 8) & 0xFF, (dataSize >> 16) & 0xFF, (dataSize >> 24) & 0xFF,
    
    ...audioData
  ];
  
  console.log(`Minimal WAV: ${wav.length} bytes, ${samples} samples`);
  return new Uint8Array(wav);
}

function createWAVHeader(samples, sampleRate) {
  const byteRate = sampleRate * 2; // 16-bit mono
  const blockAlign = 2;
  const dataSize = samples * 2;
  const fileSize = 36 + dataSize;
  
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  // RIFF header
  view.setUint32(0, 0x46464952, false); // "RIFF"
  view.setUint32(4, fileSize, true);
  view.setUint32(8, 0x45564157, false); // "WAVE"
  
  // fmt chunk
  view.setUint32(12, 0x20746d66, false); // "fmt "
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  
  // data chunk
  view.setUint32(36, 0x61746164, false); // "data"
  view.setUint32(40, dataSize, true);
  
  return new Uint8Array(header);
}
