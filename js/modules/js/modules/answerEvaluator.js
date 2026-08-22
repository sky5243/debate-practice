/**
 * 答案比對與口語化正規化模組
 */
export class AnswerEvaluator {
    static checkAnswer(userAns, stdAns) {
        const rawVal = (userAns || "").trim();
        const rawStd = (stdAns || "").trim();

        // 1. 完全比對（或兩者皆留空）
        if (rawVal === rawStd || (rawStd === "" && rawVal === "")) {
            return true;
        }

        // 2. 阿拉伯數字轉國字口語比對（例如 "兩個" -> "2"）
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
