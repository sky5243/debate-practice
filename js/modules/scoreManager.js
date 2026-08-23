export class ScoreManager {
    constructor(threshold = 10) {
        this.streakThreshold = threshold;
        this.streak = 0;
        this.attempts = 1;
        this.hasResetForCurrentQ = false; // 記錄本題是否已觸發過歸零提示
    }

    // 重置練習會話
    resetSession(threshold) {
        if (threshold !== undefined && threshold !== null) {
            this.streakThreshold = threshold;
        }
        this.streak = 0;
        this.attempts = 1;
        this.hasResetForCurrentQ = false;
    }

    // 開始新的一題時重置本題嘗試狀態
    startNewQuestion() {
        this.attempts = 1;
        this.hasResetForCurrentQ = false;
    }

    // 增加嘗試次數
    incrementAttempt(isSequential = false) {
        this.attempts++;
        let justResetStreak = false;

        // 若為隨機單元且嘗試次數達到 4 次（超過 3 次）
        if (!isSequential && this.attempts > 3) {
            if (!this.hasResetForCurrentQ) {
                this.streak = 0; // 連續紀錄歸零
                this.hasResetForCurrentQ = true;
                justResetStreak = true; // 標記「剛好第一次歸零」
            }
        }

        return {
            attempts: this.attempts,
            justResetStreak: justResetStreak
        };
    }

    // 紀錄作答結果
    recordResult(isAllCorrect, isSequential = false) {
        if (isAllCorrect) {
            // 只要本題三個子題全對，連續次數一律 +1！
            this.streak++;
        }

        return {
            streak: this.streak,
            attempts: this.attempts,
            isPassed: this.streak >= this.streakThreshold
        };
    }
}