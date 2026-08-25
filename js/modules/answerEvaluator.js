export class AnswerEvaluator {
    static checkAnswer(userAns, stdAns) {
        const rawVal = (userAns || "").trim();
        const rawStd = (stdAns || "").trim();

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