export class ScoreManager {
    constructor(threshold = 10) {
        this.streakThreshold = threshold;
        this.streak = 0;
        this.attempts = 1;
    }

    // 重置練習會話：若有傳入新 threshold 則更新，否則維持原設定
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

    incrementAttempt() {
        this.attempts++;
        return this.attempts;
    }

    recordResult(isAllCorrect) {
        if (isAllCorrect) {
            this.streak++;
        }
        return {
            streak: this.streak,
            attempts: this.attempts,
            isPassed: this.streak >= this.streakThreshold
        };
    }
}