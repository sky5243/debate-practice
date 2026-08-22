/**
 * 計分與嘗試次數邏輯模組
 */
export class ScoreManager {
    constructor(threshold = 10) {
        this.streakThreshold = threshold;
        this.streak = 0;
        this.attempts = 1;
    }

    resetSession() {
        this.streak = 0;
        this.attempts = 1;
    }

    startNewQuestion() {
        this.attempts = 1;
    }

    incrementAttempt() {
        this.attempts++;
        if (this.attempts > 3) {
            this.streak = 0; // 超過 3 次嘗試，連續次數歸零
        }
        return this.attempts;
    }

    recordResult(isAllCorrect) {
        if (isAllCorrect) {
            if (this.attempts <= 3) {
                this.streak++;
            } else {
                this.streak = 0;
            }
        } else {
            this.attempts++;
            if (this.attempts > 3) {
                this.streak = 0;
            }
        }
        return {
            streak: this.streak,
            attempts: this.attempts,
            isPassed: this.streak >= this.streakThreshold
        };
    }
}
