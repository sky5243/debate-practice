class PCMProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const inputData = input[0];
            const pcm16 = new Int16Array(inputData.length);
            
            for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            // 將轉換好的 16kHz PCM 送回主線程
            this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        }
        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);