import { evaluateExampleWithKB } from '../data/sautrantikaKB.js';

export class AnswerEvaluator {
    // 💡 建立 OpenCC 轉換器快取（單例模式，確保只初始化一次以節省效能）
    static _converter = null;

    /**
     * 呼叫外部 OpenCC 庫將簡體字轉為繁體字
     */
    static convertToTraditional(text) {
        if (!text) return "";
        
        if (!this._converter) {
            if (typeof OpenCC !== 'undefined') {
                this._converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            } else {
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
            { pattern: /[的得]+[話畫]?[不步][遍便變片邊騙]+/g, replace: "的話不遍" },
            { pattern: /[的得]+[話畫]?[遍便變片邊騙]+/g, replace: "的話遍" },
            { pattern: /[所鎖索][作做座著]/g, replace: "所作" },
            { pattern: /[合可和][一以衣][顧故]/g, replace: "何以故" },
            { pattern: /[不步][是適市視]/g, replace: "不是" },

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

            // 補特伽羅
            { pattern: /[補普不]特?[伽迦茄家加]羅/g, replace: "補特伽羅" },
            { pattern: /心不相應[刑形型]法/g, replace: "心不相應行法" },

            // 格式與關係用語
            { pattern: /[照舟州週周][遍變片]/g, replace: "周遍" },
            { pattern: /無法[按昂]立/g, replace: "無法安立" },
            { pattern: /[抖豆]有/g, replace: "都有" },
            { pattern: /不[騙變便片]/g, replace: "不遍" },
            { pattern: /因不[成誠承][立歷力]/g, replace: "因不成立" },
            { pattern: /因[不步][成誠承]/g, replace: "因不成" },

            // 舉例名詞
            { pattern: /[雙生聲深]音|聲陰/g, replace: "聲音" },
            { pattern: /[平坪屏]子|瓶自/g, replace: "瓶子" },
            { pattern: /[朱住祝]子|住址/g, replace: "柱子" },
            { pattern: /[許續]空/g, replace: "虛空" },
            { pattern: /自[動費]筆/g, replace: "自動筆" },
            { pattern: /兔[子仔]?腳/g, replace: "兔子角" }
        ];

        for (const rule of regexRules) {
            cleanText = cleanText.replace(rule.pattern, rule.replace);
        }
    
        return cleanText;
    }

    /**
     * 第一階段：傳統字串/規則比對 (包含多立宗無序比對、留空/無法安立支援等)
     */
    static checkAnswer(userAns, stdAns) {
        let rawVal = (userAns || "").trim().toLowerCase();
        let rawStd = (stdAns || "").trim().toLowerCase();

        rawVal = this.convertToTraditional(rawVal);
        rawStd = this.convertToTraditional(rawStd);

        // 終極字串淨化函式（清除所有空格與標點符號）
        const stripSymbols = (str) => {
            if (!str) return "";
            return str
                .toString()
                .replace(/[\s\t\n\r\u00A0\u200B\uFEFF,，、。！？；：;:~～]/g, "")
                .trim();
        };

        const cleanVal = stripSymbols(rawVal);
        const cleanStd = stripSymbols(rawStd);

        let isMatch = false;

        // 1. 空字串判定（嚴格規定：僅能送出空白或「無法安立」，不可回答「因不成」或「因不成立」）
        if (rawStd === "") {
            const checkVal = rawVal.replace(/^應該/, '').trim();
            const validEmptyAnswers = [
                "", "無法安立", "不可安立", "應該無法安立", "應該沒有", "沒有安立"
            ];
            isMatch = validEmptyAnswers.includes(rawVal) || validEmptyAnswers.includes(checkVal);
        } 
        // 2. 對/錯判斷
        else if (rawStd === "對" || rawStd === "錯") {
            const trueSynonyms = ["對", "o", "圈", "正確", "是", "對的", "正確的"];
            const falseSynonyms = ["錯", "x", "叉", "叉叉", "錯誤", "不對", "錯的", "錯誤的"];
            isMatch = rawStd === "對" ? trueSynonyms.includes(rawVal) : falseSynonyms.includes(rawVal);
        } 
        // 3. 多立宗比對（當標準答案包含分號「；」時，順序不拘，只要把全部立宗講出來即可）
        // 允許練習者連著唸無空格、包含口語連接詞、語助詞（如「嗯」）、或思考過程（如「論式的宗是」、「諍因結合的宗是」、「不遍的立宗是」）
        else if (rawStd.includes("；") || rawStd.includes(";")) {
            const stdTheses = rawStd.split(/[；;]/).map(s => stripSymbols(s)).filter(s => s.length > 0);
            
            let userRemaining = stripSymbols(rawVal);

            // 由長到短排序標準子立宗，避免短項貪婪消除
            const sortedTheses = [...stdTheses].sort((a, b) => b.length - a.length);
            let allThesesFound = true;

            for (const thesis of sortedTheses) {
                const idx = userRemaining.indexOf(thesis);
                if (idx !== -1) {
                    // 消除已講出的一宗
                    userRemaining = userRemaining.slice(0, idx) + userRemaining.slice(idx + thesis.length);
                } else {
                    allThesesFound = false;
                    break;
                }
            }

            // 只要練習者把全部的立宗都講出來（allThesesFound === true），即判定答對！
            if (allThesesFound) {
                isMatch = true;
            }
        }
        // 4. 一般完全比對 / 淨化後比對
        else if (rawVal === rawStd || cleanVal === cleanStd) {
            isMatch = true;
        } 
        // 5. 單元 A 比對
        else if (rawStd.includes("所諍事") || rawStd.includes("所顯法") || rawStd.includes("因")) {
            const cleanUnitA = (str) => str.replace(/[與和及、，,\s]/g, "");
            if (cleanUnitA(rawVal) === cleanUnitA(rawStd)) isMatch = true;
        } 
        // 6. 數字比對
        else if (/^\d+$/.test(rawStd)) {
            let normalized = rawVal.replace(/一/g, '1').replace(/二|兩|雙/g, '2').replace(/三/g, '3').replace(/四/g, '4').replace(/五/g, '5');
            const foundDigits = normalized.match(/\d+/g);
            if (foundDigits && foundDigits.includes(rawStd)) isMatch = true;
        }

        if (!isMatch) {
            console.group("❌ [AnswerEvaluator 除錯分析]");
            console.log("【使用者輸入原始值】:", JSON.stringify(userAns));
            console.log("【標準答案原始值】:", JSON.stringify(stdAns));
            console.log("【淨化後使用者輸入】:", JSON.stringify(cleanVal));
            console.log("【淨化後標準答案】:", JSON.stringify(cleanStd));
            console.groupEnd();
        }

        return isMatch;
    }
    
    /**
     * 第二階段：動態判定 (專門處理舉例與立宗)
     * - 優先查驗本地經部宗法相邊界資料庫 (Sautrantika KB)，毫秒級判定，節省 API 額度
     * - 遇生僻詞彙再安全調用後端代理伺服器 AI 端點
     * @param {string} userAns 使用者輸入
     * @param {object} logicParams 題目邏輯條件
     * @param {string} evalGoal "example" 或是 "thesis"
     * @param {string} previousExample 當 evalGoal 是 thesis 時帶入前一題提取出的事例名詞
     */
    static async evaluateWithAI(userAns, logicParams, evalGoal, previousExample = "") {
        const cleanUserAns = this.normalizeSTTText(this.convertToTraditional(userAns));
        const BACKEND_URL = "https://debate-practice-8h3m.onrender.com/api/evaluate-debate";

        if (evalGoal === "example") {
            // 💡 規則 1：必須依格式回答「某某有法」（例如：「瓶子有法」）
            const match = cleanUserAns.match(/^(.+?)\s*(?:有法)$/);
            if (!match) {
                return {
                    isCorrect: false,
                    extractedExample: "",
                    feedback: "格式錯誤：依規定必須回答「某某有法」（例如：「瓶子有法」）！"
                };
            }

            const rawNoun = match[1].trim();

            // 💡 規則 2：優先透過本地經部宗法相表資料庫進行判定
            const localResult = evaluateExampleWithKB(rawNoun, logicParams, logicParams.subject);
            if (localResult.matched) {
                return {
                    isCorrect: localResult.isCorrect,
                    extractedExample: rawNoun,
                    feedback: localResult.feedback
                };
            }

            // 💡 規則 3：若不在基本法相表中，轉由後端 AI 進行經部宗深度判定
            try {
                console.log(`🤖 [調用後端 AI 判定生僻名詞事例]: ${rawNoun}`);
                const response = await fetch(BACKEND_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        noun: rawNoun,
                        logicParams,
                        evalGoal: "example"
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    return {
                        isCorrect: !!data.isCorrect,
                        extractedExample: rawNoun,
                        feedback: data.feedback || (data.isCorrect ? "AI 判定正確！" : "AI 判定不符合要求。")
                    };
                }
            } catch (e) {
                console.error("AI 事例評估連線失敗:", e);
            }

            return {
                isCorrect: false,
                extractedExample: rawNoun,
                feedback: `事例「${rawNoun}」未在標準法相表中，建議舉出法相表內的標準事例（如：瓶子、柱子、聲音、遍智、虛空等）！`
            };
        } 
        else if (evalGoal === "thesis") {
            // 建立標準立宗模板，將 {E} 替換為剛才使用者舉的例子
            let templates = [];
            if (logicParams.thesisTemplate) {
                templates = logicParams.thesisTemplate.map(t => t.replace(/\{E\}/g, previousExample));
            } else {
                templates = [
                    `${previousExample}不是${logicParams.P}`,
                    `是${logicParams.R}的話不遍是${logicParams.P}`
                ];
            }

            const expectedTheses = templates.join("；");

            // 💡 優先以本地升級版多立宗無序比對演算法進行比對（只要全部立宗都有講出即過關）
            const isMatch = this.checkAnswer(cleanUserAns, expectedTheses);
            if (isMatch) {
                return {
                    isCorrect: true,
                    expectedTheses,
                    feedback: "立宗正確！"
                };
            }

            // 若本地字串未匹配，向後端 AI 尋求語意同義確認
            try {
                console.log(`🤖 [調用後端 AI 判定立宗語意]: ${cleanUserAns}`);
                const response = await fetch(BACKEND_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        evalGoal: "thesis",
                        previousExample,
                        userAns: cleanUserAns,
                        logicParams: {
                            ...logicParams,
                            thesisTemplate: templates
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    return {
                        isCorrect: !!data.isCorrect,
                        expectedTheses,
                        feedback: data.feedback || (data.isCorrect ? "立宗正確！" : `立宗不符，標準立宗應為：「${expectedTheses}」`)
                    };
                }
            } catch (e) {
                console.error("AI 立宗判定連線失敗:", e);
            }

            return {
                isCorrect: false,
                expectedTheses,
                feedback: `立宗不符，標準立宗應為：「${expectedTheses}」`
            };
        }

        return { isCorrect: false, feedback: "未知的評估模式" };
    }
}
