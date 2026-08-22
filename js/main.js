import { SpeechService } from './modules/speechService.js';
import { AnswerEvaluator } from './modules/answerEvaluator.js';
import { ScoreManager } from './modules/scoreManager.js';
import { getQuestionList, getUnitConfig } from './data/questionBank.js';

const speechService = new SpeechService();
const scoreManager = new ScoreManager();

let isPracticing = false;
let currentUnit = "A";
let currentConfig = null;
let currentQuestionList = [];
let sequentialIndex = 0;
let currentQ = null;
let subQIndex = 0;
let lastQuestionIndex = -1;
let userSessionRecords = [];

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const unitSelect = document.getElementById('unitSelect');
const rateSelect = document.getElementById('rateSelect');
const streakDisplay = document.getElementById('streakDisplay');
const attemptDisplay = document.getElementById('attemptDisplay');
const statementBox = document.getElementById('statementBox');
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

startBtn.onclick = startPractice;
stopBtn.onclick = stopPractice;
repeatBtn.onclick = handleRepeat;
submitAnsBtn.onclick = handleSubmitAnswer;
micBtn.onclick = handleMicToggle;
unitSelect.onchange = updateUnitPreview;

userAnswerInput.onkeydown = (e) => { 
    if (e.key === 'Enter') handleSubmitAnswer(); 
};

// 網頁載入時自動讀取預設單元預覽
updateUnitPreview();

function updateUnitPreview() {
    if (isPracticing) return;
    const selectedUnit = unitSelect.value;
    const config = getUnitConfig(selectedUnit);
    const qList = getQuestionList(selectedUnit);
    const targetTotal = config.targetCount || (config.isSequential ? qList.length : 10);
    const label = config.isSequential ? "進度" : "連續通過";
    streakDisplay.innerText = `${label}: 0 / ${targetTotal}`;
}

function startPractice() {
    isPracticing = true;
    currentUnit = unitSelect.value;
    currentConfig = getUnitConfig(currentUnit);
    currentQuestionList = getQuestionList(currentUnit);
    
    sequentialIndex = 0;
    const targetTotal = currentConfig.targetCount || (currentConfig.isSequential ? currentQuestionList.length : 10);
    
    // 重置計分器並明確帶入該單元的目標題數 (避免觸發預設值 10)
    scoreManager.resetSession(targetTotal);

    startBtn.disabled = true;
    stopBtn.disabled = false;
    unitSelect.disabled = true;

    updateStatusDisplay();
    startNewQuestion();
}

function updateStatusDisplay() {
    const label = currentConfig && currentConfig.isSequential ? "進度" : "連續通過";
    streakDisplay.innerText = `${label}: ${scoreManager.streak} / ${scoreManager.streakThreshold}`;
    attemptDisplay.innerText = `本題嘗試: ${scoreManager.attempts}`;
}

function stopPractice() {
    isPracticing = false;
    speechService.stopSpeaking();
    speechService.stopRecognition();

    startBtn.disabled = false;
    stopBtn.disabled = true;
    unitSelect.disabled = false;

    statementBox.style.display = 'none';
    interactiveArea.style.display = 'none';
    reviewPanel.style.display = 'none';
    displayText.innerText = "請選擇單元開始練習";
    updateUnitPreview();
}

function startNewQuestion() {
    reviewPanel.style.display = 'none';
    interactiveArea.style.display = 'none';
    reviewContent.innerHTML = "";
    userAnswerInput.value = "";
    speechHint.innerText = "";

    if (currentConfig.isSequential) {
        currentQ = currentQuestionList[sequentialIndex];
    } else {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * currentQuestionList.length);
        } while (currentQuestionList.length > 1 && newIndex === lastQuestionIndex);
        lastQuestionIndex = newIndex;
        currentQ = currentQuestionList[newIndex];
    }

    subQIndex = 0;
    userSessionRecords = [];

    scoreManager.startNewQuestion();
    updateStatusDisplay();

    askSubQuestion(true);
}

function getSpeechQuestionText(index) {
    if (currentQ.speechQuestions && currentQ.speechQuestions[index]) {
        return currentQ.speechQuestions[index];
    }
    return currentQ.questions[index].replace(/[（\(]/g, ' ').replace(/[）\)]/g, ' ').trim();
}

function askSubQuestion(readStatement) {
    userAnswerInput.value = "";
    speechHint.innerText = "";
    interactiveArea.style.display = 'none';

    statementBox.innerText = `【論式】${currentQ.statement}`;
    statementBox.style.display = 'block';

    displayText.innerText = `👉 請回答：【${currentQ.questions[subQIndex]}】`;

    const speechText = getSpeechQuestionText(subQIndex);
    const textToSpeak = (readStatement ? currentQ.statement + "， " : "") + speechText;

    speechService.speak(textToSpeak, rateSelect.value, () => {
        interactiveArea.style.display = 'block';
        userAnswerInput.value = "";
        userAnswerInput.focus();
    });
}

function handleRepeat() {
    if (!isPracticing) return;
    scoreManager.incrementAttempt();
    updateStatusDisplay();

    interactiveArea.style.display = 'none';
    const speechText = getSpeechQuestionText(subQIndex);
    const textToSpeak = currentQ.statement + "， " + speechText;

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
            (errorMsg) => { speechHint.innerText = `⚠️ 語音辨識提醒：${errorMsg}`; },
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
    
    let isCorrect = false;
    if (currentConfig.isSequential) {
        isCorrect = (val === std);
    } else {
        isCorrect = AnswerEvaluator.checkAnswer(val, std);
    }

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

    updateStatusDisplay();

    let html = "";
    userSessionRecords.forEach((rec, idx) => {
        const statusIcon = rec.correct ? "✅" : "❌";
        html += `<div class="review-row">
            <strong>Q${idx + 1}: ${rec.q} ${statusIcon}</strong><br>
            👉 您的輸入：<span style="color: #2980b9;">${rec.ans || "(未填)"}</span><br>
            🎯 標準答案：<span style="color: #27ae60; font-weight: bold;">${rec.std}</span>
        </div>`;
    });
    reviewContent.innerHTML = html;
    reviewPanel.style.display = 'block';

    if (allCorrect) {
        if (currentConfig.isSequential) {
            sequentialIndex++;
            if (sequentialIndex >= currentQuestionList.length) {
                reviewTitle.innerText = "🏆 恭喜您！成功順利完成本單元的所有練習題！";
                speechService.speak("恭喜您成功通過本單元的所有練習", rateSelect.value, () => { stopPractice(); });
            } else {
                reviewTitle.innerText = "🎉 本題完全答對！準備進入下一題...";
                speechService.speak("太棒了，答對了", rateSelect.value, () => setTimeout(startNewQuestion, 1500));
            }
        } else {
            if (scoreResult.isPassed) {
                reviewTitle.innerText = "🏆 恭喜您！成功通過本單元的測試！";
                speechService.speak("恭喜您通過本單元的測試，請重新選擇練習單元", rateSelect.value, () => { stopPractice(); });
            } else {
                reviewTitle.innerText = "🎉 本題完全答對！";
                speechService.speak("太棒了", rateSelect.value, () => setTimeout(startNewQuestion, 1500));
            }
        }
    } else {
        reviewTitle.innerText = "❌ 有答錯的子題，請再試一次本題！";
        scoreManager.incrementAttempt();
        speechService.speak("答錯了，請再試一次", rateSelect.value, () => {
            setTimeout(() => {
                reviewPanel.style.display = 'none';
                subQIndex = 0;
                userSessionRecords = [];
                updateStatusDisplay();
                askSubQuestion(true);
            }, 1500);
        });
    }
}