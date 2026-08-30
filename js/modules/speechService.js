/**
 * 語音服務模組：完全封裝瀏覽器的 SpeechSynthesis 與 SpeechRecognition
 * 已針對 Android Chrome / iOS Safari 進行語音通道與聲道鎖定優化
 */
export class SpeechService {
    constructor() {
        this.synth = window.speechSynthesis;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
        this.isListening = false;
        this.targetVoice = null;

        // 1. 初始化並載入語音套件（解決 Android 非同步載入問題）
        this._initVoices();
        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this._initVoices();
        }

        if (this.recognition) {
            this.recognition.lang = 'zh-TW';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
        }
    }

    // 取得適合的中文語音包
    _initVoices() {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        // 優先挑選 台灣中文 (zh-TW)，若無則挑選廣義中文 (zh)
        this.targetVoice = voices.find(v => v.lang === 'zh-TW' || v.lang === 'zh_TW') || 
                          voices.find(v => v.lang.startsWith('zh')) || null;
    }

    speak(text, rate = 1.25, onEndCallback) {
        if (!this.synth) return;

        // 💡 關鍵修復 1：喚醒被 Android 鎖定的 TTS 引擎
        if (this.synth.paused) {
            this.synth.resume();
        }

        // 💡 關鍵修復 2：Android 上避免在 speak 前直接 cancel，改用條件式清空
        if (this.synth.speaking || this.synth.pending) {
            this.synth.cancel();
        }

        // 避免 Voice 清單未載入完畢的情況
        if (!this.targetVoice) {
            this._initVoices();
        }

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'zh-TW';
        utter.rate = parseFloat(rate) || 1.25;

        // 💡 關鍵修復 3：明確指派語音包物件
        if (this.targetVoice) {
            utter.voice = this.targetVoice;
        }

        if (onEndCallback) {
            utter.onend = onEndCallback;
            utter.onerror = (e) => {
                console.warn('Speech TTS Error:', e);
                // 發音失敗時仍觸發 onend，確保程式流程不卡死
                onEndCallback();
            };
        }

        // 💡 關鍵修復 4：延遲 50ms 發音，給 Android 聲音通道切換的緩衝時間
        setTimeout(() => {
            this.synth.speak(utter);
        }, 50);
    }

    stopSpeaking() {
        if (this.synth) {
            this.synth.cancel();
        }
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