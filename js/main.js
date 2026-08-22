import { SpeechService } from './modules/speechService.js';
import { AnswerEvaluator } from './modules/answerEvaluator.js';
import { ScoreManager } from './modules/scoreManager.js';
import { getQuestionList } from './data/questionBank.js';

// 初始化模組元件
const speechService = new SpeechService();
const scoreManager = new ScoreManager(10);

// 全域狀態變數
let isPracticing = false;
let currentUnit = "A";
let currentQuestionList = [];
let currentQ = null;
let subQIndex = 0;
let lastQuestionIndex = -1;
let userSessionRecords = [];

// DOM 元素引用
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const unitSelect = document.getElementById('unitSelect');
const rateSelect = document.getElementById('rateSelect');
const streakDisplay = document.getElementById('streakDisplay');
const attemptDisplay = document.getElementById('attemptDisplay');
const displayText = document.getElementById('displayText');
const interactiveArea = document.getElementById('interactiveArea');
const repeatBtn = document.getElementById('repeatBtn');
const userAnswerInput = document.getElementById('userAnswerInput');
const micBtn = document.getElementById('micBtn');
const submitAnsBtn = document.getElementById('submitAnsBtn');
const speechHint = document.getElementById('speechHint');
const reviewPanel = document.getElementById('reviewPanel');
const reviewTitle = document.getElementById('reviewTitle');
const reviewContent = document.getElementById('reviewContent');

// 綁定控制項事件
startBtn.onclick = startPractice;
stopBtn.onclick = stopPractice;
repeatBtn.onclick = handleRepeat;
submitAnsBtn.onclick = handleSubmitAnswer;
micBtn.onclick = handleMicToggle;

userAnswerInput.onkeydown = (e) => {
    if (e.key === 'Enter') handleSubmitAnswer();
};

function startPractice() {
    isPracticing = true;
    currentUnit = unitSelect.value;
    currentQuestionList = getQuestionList(currentUnit);
    scoreManager.resetSession();

    startBtn.disabled = true;
    stopBtn.disabled = false;
    unitSelect.disabled = true;

    streakDisplay.innerText = `連續通過: ${scoreManager.streak} / ${scoreManager.streakThreshold}`;
    startNewQuestion();
}

function stopPractice() {
    isPracticing = false;
    speechService.stopSpeaking();
    speechService.stopRecognition();

    startBtn.disabled = false;
    stopBtn.disabled = true;
    unitSelect.disabled = false;

    interactiveArea.style.display = 'none';
    reviewPanel.style.display = 'none';
    displayText.innerText = "請選擇單元開始練習";
}

function startNewQuestion() {
    reviewPanel.style.display = 'none';
    interactiveArea.style.display = 'none';
    reviewContent.innerHTML = "";
    userAnswerInput.value = "";
    speechHint.innerText = "";

    // 隨機抽選題目（避開與上一題相同）
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * currentQuestionList.length);
    } while (currentQuestionList.length > 1 && newIndex === lastQuestionIndex);

    lastQuestionIndex = newIndex;
    currentQ = currentQuestionList[newIndex];
    subQIndex = 0;
    userSessionRecords = [];

    scoreManager.startNewQuestion();
    attemptDisplay.innerText = `本題嘗試: ${scoreManager.attempts}`;

    askSubQuestion(true);
}

function askSubQuestion(readStatement) {
    userAnswerInput.value = "";
    speechHint.innerText = "";
    interactiveArea.style.display = 'none';

    const textToSpeak = (readStatement ? currentQ.statement + "， " : "") + currentQ.questions[subQIndex];
    
    speechService.speak(textToSpeak, rateSelect.value, () => {
        interactiveArea.style.display = 'block';
        userAnswerInput.value = "";
        userAnswerInput.focus();
        displayText.innerText = "🎧 答題中...（請依語音作答）";
    });
}

function handleRepeat() {
    if (!isPracticing) return;
    const currentAttempts = scoreManager.incrementAttempt();
    attemptDisplay.innerText = `本題嘗試: ${currentAttempts}`;
    streakDisplay.innerText = `連續通過: ${scoreManager.streak} / ${scoreManager.streakThreshold}`;

    interactiveArea.style.display = 'none';
    const textToSpeak = currentQ.statement + "， " + currentQ.questions[subQIndex];

    speechService.speak(textToSpeak, rateSelect.value, () => {
        interactiveArea.style.display = 'block';
        userAnswerInput.value = "";
        userAnswerInput.focus();
    });
}

function handleMicToggle() {
    if (speechService.isListening) {
        speechService.stopRecognition();
    } else {
        speechService.startRecognition(
            (cleanText) => {
                userAnswerInput.value = cleanText;
                speechHint.innerText = `辨識結果："${cleanText}"`;
            },
            (errorMsg) => {
                speechHint.innerText = `⚠️ 語音辨識提醒：${errorMsg}`;
            },
            (isListening) => {
                if (isListening) {
                    micBtn.classList.add('recording');
                    speechHint.innerText = "🎙️ 正在聆聽中，請說出答案...";
                } else {
                    micBtn.classList.remove('recording');
                }
            }
        );
    }
}

function handleSubmitAnswer() {
    speechService.stopRecognition();
    const val = userAnswerInput.value.trim();
    const std = currentQ.answers[subQIndex];
    const isCorrect = AnswerEvaluator.checkAnswer(val, std);

    userSessionRecords.push({
        q: currentQ.questions[subQIndex],
        ans: val,
        correct: isCorrect,
        std: std === "" ? "(留空/無法安立)" : std
    });

    subQIndex++;
    if (subQIndex < currentQ.questions.length) {
        askSubQuestion(false);
    } else {
        showReviewPanel();
    }
}

function showReviewPanel() {
    interactiveArea.style.display = 'none';
    const allCorrect = userSessionRecords.every(r => r.correct);
    const scoreResult = scoreManager.recordResult(allCorrect);

    streakDisplay.innerText = `連續通過: ${scoreResult.streak} / ${scoreManager.streakThreshold}`;
    attemptDisplay.innerText = `本題嘗試: ${scoreResult.attempts}`;

    let html = "";
    userSessionRecords.forEach((rec, idx) => {
        html += `<div class="review-row">
            <strong>Q${idx + 1}: ${rec.q}</strong><br>
            👉 您的輸入：<span style="color: #2980b9;">${rec.ans || "(未填)"}</span><br>
            🎯 標準答案：<span style="color: #27ae60; font-weight: bold;">${rec.std}</span>
        </div>`;
    });
    reviewContent.innerHTML = html;
    reviewPanel.style.display = 'block';

    if (allCorrect) {
        if (scoreResult.isPassed) {
            reviewTitle.innerText = "🏆 恭喜您！成功通過本單元的測試！";
            speechService.speak("恭喜您通過本單元的測試，請重新選擇練習單元", rateSelect.value, () => {
                stopPractice();
            });
        } else {
            reviewTitle.innerText = scoreResult.attempts <= 3 ? "🎉 本題完全答對！" : "⚠️ 答對但嘗試超過3次，連續次數重置！";
            speechService.speak("太棒了", rateSelect.value, () => setTimeout(startNewQuestion, 1500));
        }
    } else {
        reviewTitle.innerText = scoreResult.attempts <= 3 ? "❌ 答錯了，請再試一次本題！" : "⚠️ 嘗試已超過3次，連續次數歸零！請繼續嘗試本題。";
        speechService.speak("答錯了，請再試一次", rateSelect.value, () => {
            setTimeout(() => {
                reviewPanel.style.display = 'none';
                subQIndex = 0;
                userSessionRecords = [];
                askSubQuestion(true);
            }, 1500);
        });
    }
}
