import 'dotenv/config';

async function listAllModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1alpha/models?key=${apiKey}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data.models) {
            console.log("❌ 讀取失敗，請檢查 API Key 是否正確：", data);
            return;
        }

        console.log(`📋 您的 API Key 目前可存取的完整模型清單（共 ${data.models.length} 個）：\n`);
        data.models.forEach(m => {
            console.log(`📌 model: "${m.name}"`);
            console.log(`   displayName: "${m.displayName}"`);
            console.log(`   methods: ${JSON.stringify(m.supportedGenerationMethods || [])}`);
            console.log(`--------------------------------------------------`);
        });
    } catch (e) {
        console.error("連線錯誤:", e);
    }
}

listAllModels();