import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

// 💡 兩個模型皆由環境變數設定：語音轉文字 (STT) 與 舉例/立宗判定 (EVAL)
const STT_MODEL = process.env.GEMINI_STT_MODEL || 'gemini-3.5-transcribe-live';
const EVAL_MODEL = process.env.GEMINI_EVAL_MODEL || 'gemini-3.5-flash-lite';

const CLASSIFY_OPTIONS = ["無", "常法", "色法", "心識", "心不相應行法", "無法明確歸類"];

// 呼叫 Gemini 並解析 JSON 回傳；失敗時丟出帶 status 的錯誤（429 等狀態碼會原樣傳回前端）
async function callGeminiJson(apiKey, systemInstruction, prompt, responseSchema = null) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EVAL_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
                ...(responseSchema ? { responseSchema } : {})
            }
        })
    });
    if (!response.ok) {
        const errText = await response.text();
        console.error(`Gemini API Error (model=${EVAL_MODEL}, HTTP ${response.status}):`, errText);
        const err = new Error(`Gemini API 調用失敗 (model=${EVAL_MODEL}, HTTP ${response.status})`);
        err.status = response.status;
        throw err;
    }
    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('');
    if (!text) {
        console.error('Gemini 無有效回傳:', JSON.stringify(data).slice(0, 1000));
        throw new Error('Gemini 無有效回傳');
    }
    try {
        return parseModelJson(text);
    } catch {
        console.error('Gemini 回傳 JSON 解析失敗，原始內容:', text);
        throw new Error('Gemini 回傳格式錯誤');
    }
}

// 把模型回傳的類別文字對應到六個選項之一（容忍「色法：物質…」這類照抄整行的回答）
function normalizeCategory(raw) {
    if (typeof raw !== 'string') return null;
    const text = raw.trim();
    if (CLASSIFY_OPTIONS.includes(text)) return text;
    const head = text.split(/[：:（(s]/)[0].trim();
    if (CLASSIFY_OPTIONS.includes(head)) return head;
    // 由長到短比對開頭，避免「無法明確歸類」被誤判成「無」
    const byLength = [...CLASSIFY_OPTIONS].sort((a, b) => b.length - a.length);
    return byLength.find(opt => text.startsWith(opt)) || null;
}

const CLASSIFY_SCHEMA = {
    type: "OBJECT",
    properties: {
        category: { type: "STRING", enum: CLASSIFY_OPTIONS },
        reason: { type: "STRING" }
    },
    required: ["category", "reason"]
};

// 解析模型回傳的 JSON：容忍 ```json ... ``` 包裝或前後多餘文字
function parseModelJson(text) {
    let cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        const first = cleaned.indexOf('{');
        const last = cleaned.lastIndexOf('}');
        if (first !== -1 && last > first) {
            return JSON.parse(cleaned.slice(first, last + 1));
        }
        throw new Error('模型回傳內容不是有效 JSON');
    }
}

app.get('/', (req, res) => res.send('Gemini STT Proxy is running! (v3.5 Live WebSocket + Sautrantika Evaluator)'));

// 💡 新增：依據經部宗法相之 AI 評估端點（當本地法相表未涵蓋該生僻名詞時備援使用）
app.post('/api/evaluate-debate', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '伺服器缺少 GEMINI_API_KEY' });
    }

    try {
        const { noun, logicParams = {}, evalGoal, previousExample = "", userAns = "" } = req.body;
        const modelVersion = EVAL_MODEL;
        
        const systemInstruction = `你是一位精通藏傳佛教格魯派賽倉攝類學與經部宗宗義的嚴格因明裁判。
依據經部宗法相體系判定學生的回答：
1. 一切皆為無我（包含補特伽羅無我）。
2. 有（量所緣 / 所知、法、境、成實）vs 無（兔子角、龜毛、虛空花、石女兒等非存在）。
3. 有分為常法（無實事/能作用空）與無常（實事/所作/自相/有為/勝義諦）。
   【特別注意常法例外】：有、所知、法、成實、無實事、補特伽羅無我、法無我、常法本身皆為常法！任何法的反體、非反、是反皆為常法！
4. 無常（實事/所作）三分：
   - 色法（物質）：瓶子、柱子、桌子、聲音、顏色、形狀、形色、顯色、香、味、觸等一切粗細物質。
   - 心識（覺知/明了）：現量、比量、分別心、遍智、無分別心、慈心、貪心等。
   - 心不相應行法：補特伽羅、時間、生滅等。
   - 上位總名本身：無常、實事、所作、有為法皆歸為心不相應行法（既非色法亦非心識）。
5. 無（非所知、兔子角等）不是法、不是常法、不是無常，但是無我。
6. 【相違原則】常法與無常直接相違，凡是有必定是二者之一，沒有第三種可能；
   色法、心識、心不相應行法三者互相相違，凡是無常必定是其中之一，且只能是其中之一（例如色法絕不是心不相應行法）。
7. 「是A的話不遍是B」意思是：存在某個法是A但不是B。「是A的話遍是B」意思是：凡是A都是B。`;

        // 💡 歸類模式：AI 只回答名詞屬於哪一類，對錯由前端本地法相表規則決定
        if (evalGoal === "classify") {
            if (!noun) return res.status(400).json({ error: '缺少 noun' });
            const prompt = `請依經部宗法相，判斷「${noun}」屬於下列哪一類，只能選一項：
- 無：不存在的非所知（如兔子角）
- 常法：存在但非所作的常法（如虛空、所知）
- 色法：物質（如瓶子、聲音）
- 心識：覺知、明了（如遍智、慈心）
- 心不相應行法：既非色法亦非心識的無常（如補特伽羅、時間）
- 無法明確歸類：名詞意義模糊、由兩個以上的法合成、範圍跨越多類，或不是一個明確的名詞

以純 JSON 回傳，格式如下：
{"category": "只填類別名稱，例如「色法」", "reason": "一句簡短理由"}`;
            try {
                const result = await callGeminiJson(apiKey, systemInstruction, prompt, CLASSIFY_SCHEMA);
                const category = normalizeCategory(result.category);
                if (!category) {
                    console.error('Gemini 歸類結果不在選項內:', result);
                    return res.status(502).json({ error: 'Gemini 歸類結果無效' });
                }
                console.log(`🤖 [AI 歸類] ${noun} → ${category}（${result.reason || ''}）`);
                return res.json({ category, reason: result.reason || '' });
            } catch (e) {
                return res.status(e.status || 502).json({ error: e.message });
            }
        }

        let prompt = "";
        let exampleProps = []; // 舉例判定時，要逐一查核的命題
        if (evalGoal === "example") {
            // 💡 新版舉例判定：把例子代入立宗模板（含 {E} 者），請模型逐一查核命題是否成立
            const subject = (logicParams.subject || "").trim();
            if (subject && noun === subject) {
                return res.json({
                    isCorrect: false,
                    feedback: `請盡量不要舉和原論式所諍事（${subject}）一樣的例子，請嘗試舉其他事例！`
                });
            }

            const templates = Array.isArray(logicParams.thesisTemplate) ? logicParams.thesisTemplate : [];
            exampleProps = templates.filter(t => t.includes('{E}')).map(t => t.replace(/\{E\}/g, noun));
            if (exampleProps.length === 0) {
                if (logicParams.R && logicParams.P) {
                    // 無模板時的備援：例子須「是因」且「不是宗法」
                    exampleProps = [`${noun}${logicParams.R}`, `「${noun}${logicParams.P}」這句話不成立`];
                } else {
                    // 無效有法（any_valid）等：只要是存在的法即可
                    exampleProps = [`${noun}是有（是存在的法）`];
                }
            }

            prompt = `學生舉出的例子是「${noun}」。
請依經部宗法相，逐一判斷下列命題是否成立：
${exampleProps.map((p, i) => `${i + 1}. ${p}`).join('\n')}

以純 JSON 回傳，格式如下：
{
  "checks": [{"proposition": "命題", "holds": true或false}],
  "feedback": "一句簡短的因明辨析說明"
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
            console.error(`Gemini API Error (model=${modelVersion}, HTTP ${response.status}):`, errText);
            return res.status(response.status).json({ error: `Gemini API 調用失敗 (model=${modelVersion}, HTTP ${response.status})` });
        }

        const data = await response.json();
        // 取第一個非「思考」的文字段落（避免模型開啟思考時 parts[0] 不是答案）
        const parts = data.candidates?.[0]?.content?.parts || [];
        const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('');
        if (!text) {
            console.error('Gemini 無有效回傳:', JSON.stringify(data).slice(0, 1000));
            return res.status(502).json({ error: 'Gemini 無有效回傳' });
        }

        let result;
        try {
            result = parseModelJson(text);
        } catch (parseErr) {
            console.error('Gemini 回傳 JSON 解析失敗，原始內容:', text);
            return res.status(502).json({ error: 'Gemini 回傳格式錯誤' });
        }

        if (evalGoal === "example") {
            // 💡 是否答對由程式決定：每個命題都成立才算對（不採用模型自行給的總結論）
            const checks = Array.isArray(result.checks) ? result.checks : [];
            if (checks.length !== exampleProps.length) {
                console.error('Gemini 查核結果數量不符:', exampleProps, result);
                return res.status(502).json({ error: 'Gemini 查核結果不完整' });
            }
            result.isCorrect = checks.every(c => c && c.holds === true);
        }
        console.log(`🤖 [AI 判定] goal=${evalGoal} noun=${noun || ''} userAns=${userAns || ''} →`, result);
        return res.json(result);
    } catch (err) {
        console.error('評估端點異常:', err);
        return res.status(500).json({ error: '評估端點異常: ' + err.message });
    }
});

const server = app.listen(port, () => {
    console.log(`🚀 攝類學 STT Proxy 伺服器已啟動於 port ${port} (v3.5 WebSocket 模式 + API 端點)`);
    console.log(`🎙️ 語音轉文字模型 (GEMINI_STT_MODEL): ${STT_MODEL}`);
    console.log(`🧠 舉例/立宗判定模型 (GEMINI_EVAL_MODEL): ${EVAL_MODEL}`);
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
                        const contextWords = data.context ? data.context.split(/[，。、\s：（）\(\)「」"]+/).filter(w => w.length >= 2) : [];
                        const defaultBaseVocab = [
                            "無", "有", "對", "錯", "承許", "何以故", "不遍", "因不成立", "因不成", "無法安立",
                            "常法", "無常", "遍", "所作", "實事", "自相", "共相", "有為", "無為", "勝義諦", "世俗諦",
                            "色法", "物質", "形狀", "形色", "顏色", "心識", "覺知", "明了", "心不相應行法",
                            "補特伽羅", "遍智", "分別心", "現量", "比量", "瓶子", "柱子", "聲音", "虛空", "兔子角", "龜毛",
                            "有法", "所知", "成實", "非所作", "無實事", "反體", "非反", "是反", "無我"
                        ];
                        // 優先放入題目語境詞彙，再補上核心辯論常備詞彙，去重並限制前 90 個
                        const vocabArray = Array.from(new Set([...contextWords, ...defaultBaseVocab])).slice(0, 90);

                        const setupMsg = {
                            setup: {
                                model: `models/${STT_MODEL}`,
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
