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
    
    if (format === 'simple') {
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
  const sampleRate = 8000; // Very low sample rate for simplicity
  const duration = 1; // 1 second
  const samples = sampleRate * duration;
  const frequency = 440;
  
  // Generate simple sine wave
  const pcmData = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 16384; // 50% volume
    pcmData[i] = Math.max(-32768, Math.min(32767, sample));
  }
  
  // Create WAV header for 8kHz 16-bit mono
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  const byteRate = sampleRate * 2;
  const dataSize = samples * 2;
  const fileSize = 36 + dataSize;
  
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
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  
  // data chunk
  view.setUint32(36, 0x61746164, false); // "data"
  view.setUint32(40, dataSize, true);
  
  const headerBytes = new Uint8Array(header);
  const pcmBytes = new Uint8Array(pcmData.buffer);
  
  // Combine header and data
  const buffer = new Uint8Array(headerBytes.length + pcmBytes.length);
  buffer.set(headerBytes, 0);
  buffer.set(pcmBytes, headerBytes.length);
  
  return buffer;
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
