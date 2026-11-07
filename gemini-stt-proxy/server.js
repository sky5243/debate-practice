import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Gemini STT Proxy is running! (v2.0 Live WebSocket + Sautrantika Evaluator)'));

// 💡 新增：依據經部宗法相之 AI 評估端點（當本地法相表未涵蓋該生僻名詞時備援使用）
app.post('/api/evaluate-debate', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '伺服器缺少 GEMINI_API_KEY' });
    }

    try {
        const { noun, logicParams = {}, evalGoal, previousExample = "", userAns = "" } = req.body;
        const modelVersion = process.env.GEMINI_MODEL_VERSION || 'gemini-2.0-flash';
        
        const systemInstruction = `你是一位精通藏傳佛教格魯派賽倉攝類學與經部宗宗義的嚴格因明裁判。
依據經部宗法相體系判定學生的回答：
1. 一切皆為無我（包含補特伽羅無我）。
2. 有（量所緣 / 所知、法、境、成實）vs 無（兔子角、龜毛、虛空花、石女兒等非存在）。
3. 有分為常法（無實事/能作用空）與無常（實事/所作/自相/有為/勝義諦）。
   【特別注意常法例外】：有、所知、法、成實、無實事、補特伽羅無我、法無我、常法本身皆為常法！任何法的反體、非反、是反皆為常法！
4. 無常（實事/所作）三分：
   - 色法（物質）：瓶子、柱子、聲音、顏色、香、味、觸等。
   - 心識（覺知/明了）：現量、比量、分別心、遍智、無分別心等。
   - 心不相應行法：補特伽羅、時間、生滅等。
5. 無（非所知、兔子角等）不是法、不是常法、不是無常，但符合無我。`;

        let prompt = "";
        if (evalGoal === "example") {
            prompt = `請判斷學生舉出的不遍事例「${noun}」是否符合下列因明邏輯要求：
- 宗法(P): ${logicParams.P || '無'}
- 因(R): ${logicParams.R || '無'}
- 規則: ${logicParams.exampleRule || logicParams.type || '符合是因且非宗法'}
- 原論式所諍事: ${logicParams.subject || '無'} (若事例與所諍事相同則不合適)

請嚴格依照經部宗法相判定，以純 JSON 回傳，格式如下：
{
  "isCorrect": true或false,
  "feedback": "若正確給予肯定簡述；若錯誤給予簡短一句因明辨析說明"
}`;
        } else {
            prompt = `請判斷學生針對事例「${previousExample}」所立的宗：「${userAns}」是否正確。
標準模板參考：${JSON.stringify(logicParams.thesisTemplate || [])}
請嚴格依照經部宗法相判定，以純 JSON 回傳，格式如下：
{
  "isCorrect": true或false,
  "feedback": "簡要說明"
}`;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelVersion}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error:', errText);
            return res.status(response.status).json({ error: 'Gemini API 調用失敗' });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return res.status(500).json({ error: 'Gemini 無有效回傳' });
        }

        const result = JSON.parse(text);
        return res.json(result);
    } catch (err) {
        console.error('評估端點異常:', err);
        return res.status(500).json({ error: '評估端點異常: ' + err.message });
    }
});

const server = app.listen(port, () => {
    console.log(`🚀 攝類學 STT Proxy 伺服器已啟動於 port ${port} (v2.0 WebSocket 模式 + API 端點)`);
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
