import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.send('Gemini STT Proxy is running!'));

// 提供標準 HTTP REST 轉錄端點
app.post('/api/transcribe', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '未在 .env 中找到 GEMINI_API_KEY' });
    }

    const { audioBase64, mimeType, context, vocab } = req.body;
    if (!audioBase64) {
        return res.status(400).json({ error: '缺少音訊資料' });
    }

    const vocabList = ["無", "有", "對", "錯", "承許", "何以故", "不遍", "因不成立", ...(vocab || [])].join("、");
    const promptText = `你是一個理路辯論系統的精準語音轉文字（STT）引擎。
【當前題目脈絡】：${context || '無'}
【核心任務與規則】：
1. 請嚴格將聽到的語音轉換為繁體中文文字。
2. 聽到短音發音（例如：「無」、「有」、「對」、「錯」、「承許」、「何以故」、「不遍」、「因不成立」）時，請直接輸出該單字，切勿遺漏，亦不要加上任何標點符號或額外說明。
3. 請優先對齊以下辯論與佛學專有名詞庫：${vocabList}。
4. 請結合當前題目脈絡判斷同音字（例如：所作、成實、補特伽羅）。`;

    // 呼叫您後台真正支援的 models/gemini-3.5-transcribe
    const url = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3.5-transcribe:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [
                { text: promptText },
                {
                    inlineData: {
                        mimeType: mimeType || 'audio/webm;codecs=opus',
                        data: audioBase64
                    }
                }
            ]
        }]
    };

    try {
        const googleRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await googleRes.json();
        if (!googleRes.ok) {
            console.error('❌ Google API 回傳錯誤：', data);
            return res.status(googleRes.status).json(data);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('🎤 [辨識成功] Gemini 3.5 Transcribe：', text.trim());
        res.json({ text: text.trim() });
    } catch (err) {
        console.error('❌ 伺服器處理失敗：', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port} (HTTP REST Mode)`);
});