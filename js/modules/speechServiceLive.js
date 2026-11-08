import { WS_URL } from './backendConfig.js';

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
        this.isProcessorLoaded = false; // 💡 新增：追蹤音訊模組是否已預載完成
        
        this.isConnected = false;
        this.onConnectionStateChange = null; 
        this._startToken = 0; // 💡 啟動代號：用來取消進行中或逾時的錄音啟動流程
    }

    // 獨立的 WebSocket 連線方法（背景喚醒 Render 伺服器）
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        try {
            // 網址由 backendConfig.js 自動判斷：localhost 開啟時連本機後端，否則連 Render
            this.ws = new WebSocket(WS_URL);
            
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

    // 💡 新增：預載音訊處理模組 (在 mainLive.js 按下「開始練習」時呼叫)
    // 這裡僅建立軟體引擎並下載 pcm-processor.js 模組，不開啟麥克風硬體，絕對不會發燙
    async loadAudioProcessor() {
        if (this.isProcessorLoaded && this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            
            // 💡 建立完成後立即強制暫停，確保背景 0 耗能運作
            if (this.audioContext.state === 'running') {
                await this.audioContext.suspend();
            }
            
            await this.audioContext.audioWorklet.addModule('pcm-processor.js');
            this.isProcessorLoaded = true;
            console.log("音訊處理模組預載完成 (0耗電待命中)");
        } catch (error) {
            console.error("預載音訊模組失敗:", error);
            this.isProcessorLoaded = false;
        }
    }

    // 每次按下麥克風時才動態取得硬體，用完立刻釋放，絕不發燙
    // 💡 A4：整個啟動流程最多等 START_TIMEOUT_MS，逾時即釋放資源並回報錯誤，避免狀態卡死
    async startRecording(onStateChange, onError) {
        console.log("▶️ 1. 啟動錄音！目前 WebSocket 狀態:", this.ws ? this.ws.readyState : "未建立");
        console.log("▶️ 2. 音訊模組是否準備就緒:", this.isProcessorLoaded);
        if (this.isListening) return false;

        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (onError) onError('尚未連線到雲端伺服器，請等待連線成功後再嘗試！');
            return false;
        }

        this.historyText = "";
        this.lastRawText = "";
        this.lastTranscript = "";
        this.isListening = true;

        // 每次啟動取得一個新代號；stopRecognition() 會讓代號失效，晚到的啟動步驟就會自行放棄
        const token = ++this._startToken;
        const START_TIMEOUT_MS = 8000;
        let timeoutId = null;

        const timeoutPromise = new Promise((resolve) => {
            timeoutId = setTimeout(() => resolve('timeout'), START_TIMEOUT_MS);
        });

        try {
            const setupPromise = this._setupAudioPipeline(token);
            // 逾時勝出後，晚到的錯誤不再需要處理；避免瀏覽器出現 unhandled rejection 警告
            setupPromise.catch(() => {});
            const result = await Promise.race([setupPromise, timeoutPromise]);

            if (result === 'timeout') {
                console.warn(`⏱️ 啟動麥克風超過 ${START_TIMEOUT_MS / 1000} 秒，已自動取消`);
                this.stopRecognition();
                if (onError) onError('啟動麥克風逾時，請確認已允許麥克風權限後再按一次。');
                return false;
            }
            if (result === 'cancelled' || token !== this._startToken) {
                // 啟動過程中已被 stopRecognition() 取消（例如送出答案、中斷練習）
                return false;
            }

            if (onStateChange) onStateChange('recording');

            // 發送配置給後端
            this.ws.send(JSON.stringify({ type: 'config', context: this.currentContext }));
            return true;

        } catch (error) {
            console.error('麥克風授權失敗或發生錯誤:', error);
            this.stopRecognition();
            if (onError) onError('無法存取麥克風，請檢查權限設定。');
            return false;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // 建立音訊管線；每個 await 之後都檢查代號，若已被取消就釋放剛取得的資源
    async _setupAudioPipeline(token) {
        const isCancelled = () => token !== this._startToken;

        // 判斷是否已經預載 AudioContext，若無則當下建立
        if (!this.audioContext || !this.isProcessorLoaded) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            await this.audioContext.audioWorklet.addModule('pcm-processor.js');
            if (isCancelled()) return 'cancelled';
            this.isProcessorLoaded = true;
        }

        // 只有在真正按住按鈕的瞬間，才向系統呼叫麥克風硬體授權
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCancelled()) {
            // 啟動已被取消或逾時：立刻關閉這個晚到的麥克風串流，避免麥克風燈一直亮著
            stream.getTracks().forEach(track => track.stop());
            return 'cancelled';
        }
        this.mediaStream = stream;

        // 喚醒音訊引擎
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            if (isCancelled()) return 'cancelled';
        }

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

        this.workletNode.port.onmessage = (event) => {
            if (!this.isListening) return;
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                // 💡 下一行用來追蹤音訊封包是否有正常發送，當有卡頓不收音時再於電腦按F12檢查
                // console.log("正在發送音訊大小:", event.data.byteLength);
                this.ws.send(event.data);
            }
        };

        source.connect(this.workletNode);
        const dummyGain = this.audioContext.createGain();
        dummyGain.gain.value = 0;
        this.workletNode.connect(dummyGain);
        dummyGain.connect(this.audioContext.destination);

        return 'ok';
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
        this._startToken++; // 讓任何進行中的啟動流程失效
        
        if (this.workletNode) {
            try {
                this.workletNode.port.onmessage = null;
                this.workletNode.disconnect();
            } catch (e) { /* ignore */ }
            this.workletNode = null;
        }
        if (this.audioContext) {
            try {
                // 💡 徹底銷毀音訊引擎，釋放記憶體與 CPU
                this.audioContext.close();
            } catch (e) { /* ignore */ }
            this.audioContext = null;
            // 💡 重置預載狀態，確保下次按下麥克風時會建立乾淨無錯誤的引擎
            this.isProcessorLoaded = false; 
        }
        if (this.mediaStream) {
            try {
                // 💡 徹底切斷麥克風硬體，手機狀態列燈號熄滅
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