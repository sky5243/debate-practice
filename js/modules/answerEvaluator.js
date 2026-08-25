export class AnswerEvaluator {
    static checkAnswer(userAns, stdAns) {
        const rawVal = (userAns || "").trim().toLowerCase();
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