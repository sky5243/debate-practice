/**
 * 語音服務模組：完全封裝瀏覽器的 SpeechSynthesis 與 SpeechRecognition
 */
export class SpeechService {
    constructor() {
        this.synth = window.speechSynthesis;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
        this.isListening = false;

        if (this.recognition) {
            this.recognition.lang = 'zh-TW';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
        }
    }

    speak(text, rate = 1.25, onEndCallback) {
        this.synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'zh-TW';
        utter.rate = parseFloat(rate) || 1.25;
        if (onEndCallback) utter.onend = onEndCallback;
        this.synth.speak(utter);
    }

    stopSpeaking() {
        this.synth.cancel();
    }

    startRecognition(onResult, onError, onStateChange) {
        if (!this.recognition) {
            if (onError) onError('不支援語音辨識 API');
            return;
        }

        this.recognition.onstart = () => {
            this.isListening = true;
            if (onStateChange) onStateChange(true);
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const cleanText = transcript.replace(/[。，！？]/g, '').trim();
            if (onResult) onResult(cleanText);
        };

        this.recognition.onerror = (event) => {
            this.isListening = false;
            if (onStateChange) onStateChange(false);
            if (onError) onError(event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (onStateChange) onStateChange(false);
        };

        try {
            this.recognition.start();
        } catch (e) {
            this.recognition.stop();
        }
    }

    stopRecognition() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
}
