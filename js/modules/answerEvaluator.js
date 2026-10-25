export class AnswerEvaluator {
    // 💡 建立 OpenCC 轉換器快取（單例模式，確保只初始化一次以節省效能）
    static _converter = null;

    /**
     * 呼叫外部 OpenCC 庫將簡體字轉為繁體字
     */
    static convertToTraditional(text) {
        if (!text) return "";
        
        // 若尚未建立轉換器，且外部的 OpenCC 已成功載入
        if (!this._converter) {
            if (typeof OpenCC !== 'undefined') {
                this._converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            } else {
                // 若 CDN 載入失敗或無網路，作為保護機制，直接回傳原字串
                return text; 
            }
        }
        return this._converter(text);
    }

    /**
     * 語音辨識近音字與句型自動校正邏輯
     * @param {string} text 原始輸入文字
     * @returns {string} 校正後的標準化文字
     */
    static normalizeSTTText(text) {
        if (!text) return "";
        let cleanText = text.trim();

        // 1. 常用句型與關鍵專有名詞 (採用字符集組合 Regex 歸納)
        const regexRules = [
            // 核心句型與連接詞
            // 💡 使用 + 號：不論 STT 吐出 1 個「的」還是 2 個「的」，都會被一次性吃掉並校正
            { pattern: /[的得]+[話畫]?[遍便變片邊騙]+/g, replace: "的話遍" },
            { pattern: /[所鎖索][作做座著]/g, replace: "所作" },
            { pattern: /[合可和][一以衣][顧故]/g, replace: "何以故" },

            // 核心法相
            { pattern: /[五吾舞]常|無場/g, replace: "無常" },
            { pattern: /[誠承乘]實|誠石/g, replace: "成實" },
            { pattern: /[變便扁騙]智|變質/g, replace: "遍智" },
            { pattern: /[鎖索]知|所[支隻]/g, replace: "所知" },
            { pattern: /[決爵絕]知|覺之/g, replace: "覺知" },
            { pattern: /[名鳴]了|[名明]聊|明瞭/g, replace: "明了" },
            { pattern: /[設瑟]法|色[發罰髮]/g, replace: "色法" },
            { pattern: /[時史石十]事|實是|44|14/g, replace: "實事" },
            { pattern: /霧質|物資/g, replace: "物質" },
            { pattern: /[新心][事視適市室式]/g, replace: "心識" },
            { pattern: /[場唱]法|長[法髮]/g, replace: "常法" },
            { pattern: /[吾五]我|無窩/g, replace: "無我" },
            { pattern: /[所鎖][真爭正諍證診針][是事式氏]/g, replace: "所諍事" },
            { pattern: /[所鎖][先前銓現線顯]法/g, replace: "所顯法" },
            { pattern: /[成程誠陳呈]許/g, replace: "承許" },

            // 補特伽羅 (涵蓋聲調與茄/加/迦/家/笳等極多近音變形)
            { pattern: /[補普不]特?[伽迦茄家加]羅/g, replace: "補特伽羅" },
            { pattern: /心不相應[刑形型]法/g, replace: "心不相應行法" },

            // 格式與關係用語
            { pattern: /[照舟州週周][遍變片]/g, replace: "周遍" },
            { pattern: /無法[按昂]立/g, replace: "無法安立" },
            { pattern: /[抖豆]有/g, replace: "都有" },
            { pattern: /不[騙變便片]/g, replace: "不遍" },

            // 舉例名詞
            { pattern: /[雙生聲深]音|聲陰/g, replace: "聲音" },
            { pattern: /[平坪屏]子|瓶自/g, replace: "瓶子" },
            { pattern: /[朱住祝]子|住址/g, replace: "柱子" },
            { pattern: /[許續]空/g, replace: "虛空" },
            { pattern: /自[動費]筆/g, replace: "自動筆" },
            { pattern: /兔[子仔]?腳/g, replace: "兔子角" }
        ];

        // 執行 Regex 全域替換
        for (const rule of regexRules) {
            cleanText = cleanText.replace(rule.pattern, rule.replace);
        }
    
        return cleanText;
    }

    static checkAnswer(userAns, stdAns) {
        let rawVal = (userAns || "").trim().toLowerCase();
        let rawStd = (stdAns || "").trim().toLowerCase(); // 💡 注意：改用 let

        // 💡 關鍵修復：讓使用者輸入與標準答案「同步」進行繁體轉換
        // 這樣不論 OpenCC 把「明了」轉成「明瞭」還是保留「明了」，兩邊都會完全一致！
        rawVal = this.convertToTraditional(rawVal);
        rawStd = this.convertToTraditional(rawStd);

        // 💡 終極字串淨化函式
        const stripSymbols = (str) => {
            if (!str) return "";
            return str
                .toString()
                .replace(/[\s\t\n\r\u00A0\u200B\uFEFF,，、。！？；：;:]/g, "")
                .trim();
        };

        const cleanVal = stripSymbols(rawVal);
        const cleanStd = stripSymbols(rawStd);

        // 判斷是否比對成功
        let isMatch = false;

        // 1. 空字串判斷
        if (rawStd === "") {
            const checkVal = rawVal.replace(/^應該/, '').trim();
            const validEmptyAnswers = ["", "無法安立", "不可安立", "應該無法安立", "應該沒有", "沒有安立"];
            isMatch = validEmptyAnswers.includes(rawVal) || validEmptyAnswers.includes(checkVal);
        } 
        // 2. 對/錯判斷
        else if (rawStd === "對" || rawStd === "錯") {
            const trueSynonyms = ["對", "o", "圈", "正確", "是", "對的", "正確的"];
            const falseSynonyms = ["錯", "x", "叉", "叉叉", "錯誤", "不對", "錯的", "錯誤的"];
            isMatch = rawStd === "對" ? trueSynonyms.includes(rawVal) : falseSynonyms.includes(rawVal);
        } 
        // 3. 一般完全比對 / 淨化後比對
        else if (rawVal === rawStd || cleanVal === cleanStd) {
            isMatch = true;
        } 
        // 4. 單元 A 比對
        else if (rawStd.includes("所諍事") || rawStd.includes("所顯法") || rawStd.includes("因")) {
            const cleanUnitA = (str) => str.replace(/[與和及、，,\s]/g, "");
            if (cleanUnitA(rawVal) === cleanUnitA(rawStd)) isMatch = true;
        } 
        // 5. 數字比對
        else if (/^\d+$/.test(rawStd)) {
            let normalized = rawVal.replace(/一/g, '1').replace(/二|兩|雙/g, '2').replace(/三/g, '3').replace(/四/g, '4').replace(/五/g, '5');
            const foundDigits = normalized.match(/\d+/g);
            if (foundDigits && foundDigits.includes(rawStd)) isMatch = true;
        }

        // 🔍 【除錯核心】如果比對失敗，列印詳細的字元解碼資料至 Console
        if (!isMatch) {
            console.group("❌ [AnswerEvaluator 除錯分析]");
            console.log("【使用者輸入原始值】:", JSON.stringify(userAns));
            console.log("【標準答案原始值】:", JSON.stringify(stdAns));
            console.log("【淨化後使用者輸入】:", JSON.stringify(cleanVal));
            console.log("【淨化後標準答案】:", JSON.stringify(cleanStd));
            
            // 印出字元層級的 Unicode 編碼（Hex）
            const toHex = (str) => Array.from(str).map(c => `U+${c.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`).join(' ');
            console.log("【使用者輸入 CharCodes】:", toHex(cleanVal));
            console.log("【標準答案 CharCodes】:", toHex(cleanStd));
            console.groupEnd();
        }

        return isMatch;
    }
}