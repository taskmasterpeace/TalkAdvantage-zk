// public/audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    // We only need the first channel (mono)
    if (input && input[0]) {
      // Post the Float32Array buffer back to the main thread
      this.port.postMessage(input[0]); 
    }
    // Keep the processor alive
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
