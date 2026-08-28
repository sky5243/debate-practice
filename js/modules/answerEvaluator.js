export class AnswerEvaluator {
    /**
     * 語音辨識近音字與句型自動校正邏輯
     * @param {string} text 原始輸入文字
     * @returns {string} 校正後的標準化文字
     */
    static normalizeSTTText(text) {
        if (!text) return "";
        let cleanText = text.trim();

        // 1. 核心句型正則表達式 (優先處理解決所有「所作」與「的話遍」相關組合)
        cleanText = cleanText.replace(/[的得][話畫][遍便變片邊騙]/g, "的話遍");
        cleanText = cleanText.replace(/[所鎖索][作做座]/g, "所作");

        // 2. 關鍵詞字典對照替換 (僅保留無法用上面 Regex 涵蓋的特例)
        const sttCorrectionMap = {
            // 一、 核心法相與專有名詞
            "鎖著": "所作", // 特例：語音將「所作」誤判為「鎖著」
            "五常": "無常", "無場": "無常", "吾常": "無常", "舞常": "無常",
            "誠實": "成實", "承實": "成實", "乘實": "成實", "誠石": "成實",
            "心不相應刑法": "心不相應行法", "心不相應形法": "心不相應行法", "心不相應型法": "心不相應行法",
            "補特加羅": "補特伽羅", "普特伽羅": "補特伽羅", "不特伽羅": "補特伽羅", "補特迦羅": "補特伽羅",
            "變智": "遍智", "便智": "遍智", "扁智": "遍智", "遍志": "遍智", "騙子": "遍智", "變質": "遍智", "騙智": "遍智",
            "鎖知": "所知", "索知": "所知", "所支": "所知", "所隻": "所知",
            "決知": "覺知", "爵知": "覺知", "覺之": "覺知", "絕知": "覺知",
            "明瞭": "明了", "名了": "明了", "名瞭": "明了", "明老": "明了",
            "設法": "色法", "瑟法": "色法", "色發": "色法", "色罰": "色法", "色髮": "色法",
            "時事": "實事", "史事": "實事", "石事": "實事", "實是": "實事", "十事": "實事", "44": "實事",
            "務質": "物質", "物資": "物質", "霧質": "物質",
            "心事": "心識", "心視": "心識", "新識": "心識", "心適": "心識", "新市": "心識",
            "長法": "常法", "場法": "常法", "唱法": "常法", "長髮": "常法",
            "吾我": "無我", "無窩": "無我", "五我": "無我",
            "兔子腳": "兔子角", "兔仔角": "兔子角", "兔角": "兔子角",
            "所爭事": "所諍事", "所正事": "所諍事", "鎖諍事": "所諍事", "鎖證事": "所諍事", "所診事": "所諍事", "鎖針式": "所諍事",
            "所現法": "所顯法", "所線法": "所顯法", "鎖顯法": "所顯法",

            // 二、 格式用語與關係用語
            "照片": "周遍", "周變": "周遍", "舟遍": "周遍", "州遍": "周遍", "週遍": "周遍",
            "無法按立": "無法安立", "無法昂立": "無法安立",
            "抖有": "都有", "豆有": "都有",

            // 三、 實物與舉例名詞
            "雙音": "聲音", "生音": "聲音", "聲陰": "聲音", "深音": "聲音",
            "平子": "瓶子", "坪子": "瓶子", "屏子": "瓶子",
            "朱子": "柱子", "住子": "柱子", "祝子": "柱子", "住址": "柱子",
            "許空": "虛空", "續空": "虛空",
            "自動比": "自動筆", "自費筆": "自動筆"
        };

        for (const [err, correct] of Object.entries(sttCorrectionMap)) {
            cleanText = cleanText.replaceAll(err, correct);
        }

        return cleanText;
    }

    static checkAnswer(userAns, stdAns) {
        let rawVal = (userAns || "").trim().toLowerCase();
        const rawStd = (stdAns || "").trim().toLowerCase();

        // 當標準答案為空字串（代表「留空 / 無法安立」）
        if (rawStd === "") {
            const cleanVal = rawVal.replace(/^應該/, '').trim();
            const validEmptyAnswers = [
                "", 
                "無法安立", 
                "不可安立", 
                "應該無法安立", 
                "應該沒有", 
                "沒有安立"
            ];
            return validEmptyAnswers.includes(rawVal) || validEmptyAnswers.includes(cleanVal);
        }

        // 當標準答案為「對」或「錯」（單元 E2 真假比對）
        if (rawStd === "對" || rawStd === "錯") {
            const trueSynonyms = ["對", "o", "圈", "正確", "是", "對的", "正確的"];
            const falseSynonyms = ["錯", "x", "叉", "叉叉", "錯誤", "不對", "錯的", "錯誤的"];

            if (rawStd === "對") {
                return trueSynonyms.includes(rawVal);
            } else if (rawStd === "錯") {
                return falseSynonyms.includes(rawVal);
            }
        }

        // 一般完全比對
        if (rawVal === rawStd) {
            return true;
        }

        // 💡 新增：忽略全半形空格與常見標點符號後進行比對（解決單元 B1 語音無法輸入空格的問題）
        const stripSymbols = (str) => str.replace(/[\s\t\n,，、。！？；：]/g, "");
        if (stripSymbols(rawVal) === stripSymbols(rawStd)) {
            return true;
        }

        // 單元 A 專用比對邏輯：僅當標準答案包含單元 A 核心模組詞彙時觸發
        const isUnitAAnswer = (s) => s.includes("所諍事") || s.includes("所顯法") || s.includes("因");
        if (isUnitAAnswer(rawStd)) {
            // 消除連詞「與」、「和」、「及」、所有標點符號與空格，進行精準比對
            const cleanUnitA = (str) => str.replace(/[與和及、，,\s]/g, "");
            if (cleanUnitA(rawVal) === cleanUnitA(rawStd)) {
                return true;
            }
        }

        // 阿拉伯數字轉國字口語比對（例如 "兩個" -> "2"）
        if (/^\d+$/.test(rawStd)) {
            let normalized = rawVal
                .replace(/一/g, '1')
                .replace(/二|兩|雙/g, '2')
                .replace(/三/g, '3')
                .replace(/四/g, '4')
                .replace(/五/g, '5');

            const foundDigits = normalized.match(/\d+/g);
            if (foundDigits && foundDigits.includes(rawStd)) {
                return true;
            }
        }

        return false;
    }
}