export class SpeechService {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.workletNode = null;
        this.isListening = false;
        this.isThinking = false;
        this.ws = null;
        this.onLiveResult = null;
        this.currentContext = "";
        this.lastTranscript = "";
        this.historyText = "";
        this.lastRawText = "";
        
        this.isConnected = false;
        this.onConnectionStateChange = null; 
    }

    // 獨立的 WebSocket 連線方法（背景喚醒 Render 伺服器）
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        try {
            this.ws = new WebSocket('wss://debate-practice-8h3m.onrender.com');

            this.ws.onopen = () => {
                console.log("WebSocket 連線成功");
                this.isConnected = true;
                if (this.onConnectionStateChange) this.onConnectionStateChange('connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.transcript && this.onLiveResult) {
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
                this.isConnected = false;
                if (this.onConnectionStateChange) this.onConnectionStateChange('error');
            };

            this.ws.onclose = () => {
                console.log('WebSocket 連線已關閉');
                this.isConnected = false;
                if (this.onConnectionStateChange) this.onConnectionStateChange('disconnected');
            };
        } catch (error) {
            console.error("WebSocket 建立失敗:", error);
        }
    }

    // 每次按下麥克風時才動態取得硬體，用完立刻釋放，絕不發燙
    async startRecording(onStateChange, onError) {
        if (this.isListening) return false;

        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (onError) onError('尚未連線到雲端伺服器，請等待連線成功後再嘗試！');
            return false;
        }

        this.historyText = "";
        this.lastRawText = "";

        try {
            this.lastTranscript = "";
            this.isListening = true;

            // 啟動麥克風硬體與音訊處理
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            await this.audioContext.audioWorklet.addModule('pcm-processor.js');

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
            
            this.workletNode.port.onmessage = (event) => {
                if (!this.isListening) return;
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(event.data);
                }
            };

            source.connect(this.workletNode);
            const dummyGain = this.audioContext.createGain();
            dummyGain.gain.value = 0;
            this.workletNode.connect(dummyGain);
            dummyGain.connect(this.audioContext.destination);

            if (onStateChange) onStateChange('recording');

            // 發送配置給後端
            this.ws.send(JSON.stringify({ type: 'config', context: this.currentContext }));

            return true;

        } catch (error) {
            console.error('麥克風授權失敗或發生錯誤:', error);
            if (onError) onError('無法存取麥克風，請檢查權限設定。');
            this.isListening = false;
            this.stopRecognition();
            return false;
        }
    }

    async stopRecordingAndSend({ onStateChange }) {
        // 放開按鈕時，立刻完整關閉硬體資源
        this.stopRecognition();
        this.isThinking = false;
        if (onStateChange) onStateChange('idle');
    }

    // 核心釋放機制：徹底關閉音訊串流、AudioContext 與 Worklet，讓手機 CPU 進入休眠
    stopRecognition() {
        this.isListening = false;
        
        if (this.workletNode) {
            try {
                this.workletNode.port.onmessage = null;
                this.workletNode.disconnect();
            } catch (e) { /* ignore */ }
            this.workletNode = null;
        }
        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) { /* ignore */ }
            this.audioContext = null;
        }
        if (this.mediaStream) {
            try {
                this.mediaStream.getTracks().forEach(track => track.stop());
            } catch (e) { /* ignore */ }
            this.mediaStream = null;
        }
    }

    stopSpeaking() {
        window.speechSynthesis.cancel();
    }

    prepareTextForTTS(text) {
        if (!text) return "";
        let ttsText = text;
        const ttsPronunciationMap = [
            { pattern: /明了/g, replace: "明瞭" },
            { pattern: /補特伽羅/g, replace: "補特茄羅" },
            { pattern: /柱子/g, replace: "注子" }
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