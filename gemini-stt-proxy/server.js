import 'dotenv/config';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Gemini STT Proxy is running! (v2.0 Live WebSocket)'));

const server = app.listen(port, () => {
    console.log(`🚀 攝類學 STT Proxy 伺服器已啟動於 port ${port} (v2.0 WebSocket 模式)`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('🔗 [1/3] 前端網頁已連線至 Proxy');
    const apiKey = process.env.GEMINI_API_KEY;
    let geminiWs = null;

    if (!apiKey) {
        console.error('❌ 未在 .env 找到 GEMINI_API_KEY');
        ws.send(JSON.stringify({ error: '伺服器缺少 API Key' }));
        ws.close();
        return;
    }

    ws.on('message', (message, isBinary) => {
        if (!isBinary) {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === 'config') {
                    console.log('⚙️ [2/3] 正在建立 Gemini 3.5 Transcribe Live 連線...');
                    const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
                    geminiWs = new WebSocket(geminiUrl);

                    geminiWs.on('open', () => {
                        console.log('✅ [3/3] 成功連線！送出強制繁中與辯論專用詞彙設定...');
                        
                        // 動態解析前端傳來的題目脈絡詞彙，提升辨識率
                        const contextWords = data.context ? data.context.split(/[，。、\s]+/).filter(w => w.length >= 2) : [];
                        const vocabArray = ["無", "有", "對", "錯", "承許", "何以故", "不遍", "因不成立", "常法", "遍", "所作", ...contextWords].slice(0, 90);

                        const setupMsg = {
                            setup: {
                                model: "models/gemini-3.5-transcribe-live",
                                generationConfig: {
                                    responseModalities: ["TEXT"]
                                },
                                // 💡 關鍵：強制指定繁體中文 (zh-TW)，解決簡體與韓文亂碼問題
                                inputAudioTranscription: {
                                    languageCodes: ["zh-TW"],
                                    customVocabulary: vocabArray,
                                    mode: "SMART"
                                }
                            }
                        };
                        geminiWs.send(JSON.stringify(setupMsg));
                    });

                    geminiWs.on('message', (geminiMsg) => {
                        try {
                            const res = JSON.parse(geminiMsg.toString());
                            
                            let text = res.serverContent?.interimInputTranscription?.text || 
                                         res.serverContent?.inputTranscription?.text ||
                                         res.serverContent?.modelTurn?.parts?.[0]?.text;

                            if (text) {
                                // 💡 升級版淨化：同時過濾所有全形/半形標點符號、問號、句號、逗號以及前後空白
                                text = text.trim().replace(/[！？，。？！\?,\.\s]+/g, '');
                                if (text) {
                                    console.log(`🗣️ 辨識文字 (全面淨化後): ${text}`);
                                    ws.send(JSON.stringify({ transcript: text }));
                                }
                            }
                        } catch (e) {
                            console.error("解析 Gemini JSON 失敗", e);
                        }
                    });

                    geminiWs.on('error', (err) => console.error('Gemini API 錯誤：', err.message));
                }
            } catch (e) {
                console.error("解析前端設定失敗", e);
            }
        } 
        else {
            if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
                const base64Audio = message.toString('base64');
                const audioMsg = {
                    realtimeInput: {
                        mediaChunks: [{
                            mimeType: "audio/pcm;rate=16000",
                            data: base64Audio
                        }]
                    }
                };
                geminiWs.send(JSON.stringify(audioMsg));
            }
        }
    });

    ws.on('close', () => {
        console.log('🔌 前端連線中斷');
        if (geminiWs) geminiWs.close();
    });
});