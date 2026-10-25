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
        this.lastTranscript = "";
        this.historyText = "";
        this.lastRawText = "";
        
        // 💡 新增：記錄連線狀態與供 UI 更新的回呼函數
        this.isConnected = false;
        this.onConnectionStateChange = null; 
    }

    // 💡 新增：獨立的連線方法，提前喚醒伺服器
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return; // 已經連線或正在連線中，不重複執行
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

    async startRecording(onStateChange, onError) {
        if (this.isListening) return false;

        // 💡 檢查是否已連線，若尚未連線則擋下並提示
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (onError) onError('尚未連線到雲端伺服器，請等待連線成功後再嘗試！');
            return false;
        }

        this.historyText = "";
        this.lastRawText = "";

        try {
            this.lastTranscript = "";
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.isListening = true;

            if (onStateChange) onStateChange('recording');

            // 💡 在開始錄音時，直接發送 config 即可
            this.ws.send(JSON.stringify({ type: 'config', context: this.currentContext }));

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
        
        // 💡 已移除 this.ws.close()，讓 WebSocket 連線保持開啟，下一題就不需等待！
        
        this.isThinking = false;
        if (onStateChange) onStateChange('idle');
    }

    stopRecognition() {
        this.isListening = false;
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