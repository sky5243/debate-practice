export class SpeechService {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.isListening = false;
        this.isThinking = false;
        this.ws = null;
        this.onLiveResult = null;
        this.currentContext = "";
        this.lastTranscript = ""; // 💡 用於防止重複字
        this.historyText = ""; // 💡 用於儲存停頓前已完成的歷史字串
        this.lastRawText = "";  // 💡 紀錄上一次接收到的原始文字
    }

    async startRecording(onStateChange, onError) {
        if (this.isListening) return false;

        // 💡 每次按住麥克風重新錄音時，重置歷史紀錄
        this.historyText = "";
        this.lastRawText = "";

        try {
            this.lastTranscript = "";
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.isListening = true;

            if (onStateChange) onStateChange('recording');

            this.ws = new WebSocket('wss://debate-practice-8h3m.onrender.com');

            this.ws.onopen = () => {
                this.ws.send(JSON.stringify({ type: 'config', context: this.currentContext }));
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.transcript && this.onLiveResult) {
                        // 💡 過濾短時間內的重複字，避免「錯」被連續印出兩次
                        if (data.transcript !== this.lastTranscript) {
                            this.lastTranscript = data.transcript;
                            this.onLiveResult(data.transcript);
                        }
                    }
                } catch (e) {
                    console.error("解析 WebSocket 訊息失敗:", e);
                }
            };

            this.ws.onerror = (err) => {
                console.error('WebSocket 錯誤:', err);
                if (onError) onError('與語音伺服器連線發生錯誤');
            };

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // 💡 1. 載入 AudioWorklet 獨立音訊處理模組
            await this.audioContext.audioWorklet.addModule('pcm-processor.js');

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // 💡 2. 建立 Worklet 節點 (取代舊有的 createScriptProcessor)
            this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
            
            // 💡 3. 接收來自獨立執行緒處理完的 16kHz PCM 音訊資料
            this.workletNode.port.onmessage = (event) => {
                if (!this.isListening) return;
                
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(event.data);
                }
            };

            // 連接音訊鏈結
            source.connect(this.workletNode);
            const dummyGain = this.audioContext.createGain();
            dummyGain.gain.value = 0;
            this.workletNode.connect(dummyGain);
            dummyGain.connect(this.audioContext.destination);

            return true;

        } catch (error) {
            console.error('麥克風授權失敗或發生錯誤:', error);
            if (onError) onError('無法存取麥克風，請檢查權限設定。');
            this.isListening = false;
            return false;
        }
    }

    async stopRecordingAndSend({ onStateChange }) {
        this.stopRecognition();
        
        setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
        }, 1200);
        
        this.isThinking = false;
        if (onStateChange) onStateChange('idle');
    }

    stopRecognition() {
        this.isListening = false;
        
        // 💡 清理 AudioWorkletNode
        if (this.workletNode) {
            this.workletNode.port.onmessage = null;
            this.workletNode.disconnect();
            this.workletNode = null;
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }

    stopSpeaking() {
        window.speechSynthesis.cancel();
    }

    /**
     * 💡 TTS 語音發音校正：將多音字與專有名詞轉換為語音引擎能正確讀出的諧音字
     */
    prepareTextForTTS(text) {
        if (!text) return "";
        let ttsText = text;

        const ttsPronunciationMap = [
            { pattern: /明了/g, replace: "明瞭" },
            { pattern: /補特伽羅/g, replace: "補特茄羅" },
            { pattern: /柱子/g, replace: "注子" },
            // 未來若發現其他念錯的佛學名詞，可直接在此新增規則
        ];

        for (const rule of ttsPronunciationMap) {
            ttsText = ttsText.replace(rule.pattern, rule.replace);
        }

        return ttsText;
    }

    speak(text, rate = 1.0, onEndCallback = null) {
        this.stopSpeaking();
        if (!text) {
            if (onEndCallback) onEndCallback();
            return;
        }

        // 💡 關鍵修改：先將文字轉為 TTS 正確發音版本
        const ttsText = this.prepareTextForTTS(text);

        const utterance = new SpeechSynthesisUtterance(ttsText);
        utterance.lang = 'zh-TW';
        utterance.rate = rate;
        if (onEndCallback) {
            utterance.onend = onEndCallback;
            utterance.onerror = onEndCallback;
        }
        window.speechSynthesis.speak(utterance);
    }
}