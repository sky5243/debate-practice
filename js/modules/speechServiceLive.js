/**
 * 語音服務模組 (Live API 升級版)
 */
export class SpeechService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.isListening = false;
        this.targetVoice = null;
        
        this.socket = null;
        this.mediaRecorder = null;
        this.stream = null;

        this._initVoices();
        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this._initVoices();
        }
    }

    _initVoices() {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        this.targetVoice = voices.find(v => v.lang === 'zh-TW' || v.lang === 'zh_TW') || 
                           voices.find(v => v.lang.startsWith('zh')) || null;
    }

    correctPhoneticsForTTS(text) {
        if (!text) return "";
        let ttsText = text;
        const phoneticMap = {
            "明了": "明瞭",       
            "補特伽羅": "補特茄羅", 
            "伽羅": "茄羅",
            "般若": "缽惹"        
        };
        for (const [raw, phonetic] of Object.entries(phoneticMap)) {
            ttsText = ttsText.replaceAll(raw, phonetic);
        }
        return ttsText;
    }

    speak(text, rate = 1.25, onEndCallback) {
        if (!this.synth) return;
        if (this.synth.paused) this.synth.resume();
        if (this.synth.speaking || this.synth.pending) this.synth.cancel();
        if (!this.targetVoice) this._initVoices();

        const correctedText = this.correctPhoneticsForTTS(text);
        const utter = new SpeechSynthesisUtterance(correctedText);
        utter.lang = 'zh-TW';
        utter.rate = parseFloat(rate) || 1.25;
        if (this.targetVoice) utter.voice = this.targetVoice;

        if (onEndCallback) {
            utter.onend = onEndCallback;
            utter.onerror = (e) => {
                console.warn('Speech TTS Error:', e);
                onEndCallback();
            };
        }

        setTimeout(() => this.synth.speak(utter), 50);
    }

    stopSpeaking() {
        if (this.synth) this.synth.cancel();
    }

    startRecognition(onResult, onError, onStateChange, context = "", vocab = []) {
        this.stopRecognition(); 

        const proxyUrl = 'ws://localhost:3000';
        this.socket = new WebSocket(proxyUrl);

        this.socket.onopen = () => {
            const configMsg = {
                type: 'config',
                context: context,
                vocab: vocab
            };
            this.socket.send(JSON.stringify(configMsg));

            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    this.stream = stream;
                    this.isListening = true;
                    if (onStateChange) onStateChange(true);

                    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
                    
                    // 💡 安全修正：使用可選鏈 ?. 避免 this.socket 為 null 時崩潰
                    this.mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
                            this.socket.send(event.data);
                        }
                    };
                    this.mediaRecorder.start(250);
                })
                .catch(err => {
                    console.error("Microphone error:", err);
                    if (onError) onError("無法存取麥克風");
                });
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.text && onResult) {
                    onResult(data.text);
                }
            } catch(e) {
                console.error("Message format error", e);
            }
        };

        this.socket.onerror = () => {
            if (onError) onError("伺服器連線發生錯誤");
        };

        this.socket.onclose = () => {
            this.isListening = false;
            if (onStateChange) onStateChange(false);
        };
    }

    stopRecognition() {
        // 💡 安全修正：優先解綁 ondataavailable，停止麥克風持續觸發發送事件
        if (this.mediaRecorder) {
            this.mediaRecorder.ondataavailable = null;
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
            this.mediaRecorder = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isListening = false;
    }
}