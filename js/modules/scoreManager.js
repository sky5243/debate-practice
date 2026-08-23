export class ScoreManager {
    constructor(threshold = 10) {
        this.streakThreshold = threshold;
        this.streak = 0;
        this.attempts = 1;
    }

    // 重置練習會話
    resetSession(threshold) {
        if (threshold !== undefined && threshold !== null) {
            this.streakThreshold = threshold;
        }
        this.streak = 0;
        this.attempts = 1;
    }

    startNewQuestion() {
        this.attempts = 1;
    }

    // 增加嘗試次數；若是隨機單元且嘗試 > 3，連續歸零
    incrementAttempt(isSequential = false) {
        this.attempts++;
        if (!isSequential && this.attempts > 3) {
            this.streak = 0; // 隨機單元超過 3 次嘗試，連續紀錄歸零
        }
        return this.attempts;
    }

    recordResult(isAllCorrect, isSequential = false) {
        if (isSequential) {
            // 循序單元：只要答對進度就 +1，不因嘗試次數歸零
            if (isAllCorrect) {
                this.streak++;
            }
        } else {
            // 隨機單元：全對且嘗試 <= 3 才算連續通過；否則歸零
            if (isAllCorrect) {
                if (this.attempts <= 3) {
                    this.streak++;
                } else {
                    this.streak = 0; // 雖然最後答對，但嘗試 > 3 次，連續次數歸零
                }
            } else {
                this.streak = 0; // 答錯，連續次數歸零
            }
        }

        return {
            streak: this.streak,
            attempts: this.attempts,
            isPassed: this.streak >= this.streakThreshold
        };
    }
}