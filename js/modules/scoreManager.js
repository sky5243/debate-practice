export class ScoreManager {
    constructor(threshold = 10) {
        this.streakThreshold = threshold;
        this.streak = 0;
        this.attempts = 1;
        this.hasResetForCurrentQ = false; // 紀錄本題是否已觸發過第 4 次歸零提醒
    }

    resetSession(threshold) {
        if (threshold !== undefined && threshold !== null) {
            this.streakThreshold = threshold;
        }
        this.streak = 0;
        this.attempts = 1;
        this.hasResetForCurrentQ = false;
    }

    startNewQuestion() {
        this.attempts = 1;
        this.hasResetForCurrentQ = false;
    }

    incrementAttempt(isSequential = false) {
        this.attempts++;
        let justResetStreak = false;

        // 若為隨機單元且累積嘗試次數達到第 4 次（超過 3 次）
        if (!isSequential && this.attempts > 3) {
            if (!this.hasResetForCurrentQ) {
                this.streak = 0; // 連續紀錄歸零
                this.hasResetForCurrentQ = true;
                justResetStreak = true; // 標記為「首次超過3次觸發歸零」
            }
        }

        return {
            attempts: this.attempts,
            justResetStreak: justResetStreak
        };
    }

    recordResult(isAllCorrect, isSequential = false) {
        if (isAllCorrect) {
            // 三個子題全對，連續次數必 +1（無論之前重試過幾次）
            this.streak++;
        }

        return {
            streak: this.streak,
            attempts: this.attempts,
            isPassed: this.streak >= this.streakThreshold
        };
    }
}