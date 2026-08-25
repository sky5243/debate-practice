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

// E1 背誦與讀誦相關變數
let e1SubMode = "recite"; // "recite" 背誦 | "read" 讀誦
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = 0;
let recordTimerInterval = null;
let recordedDurationSec = 0;
let readCount = parseInt(localStorage.getItem('unitE1_readCount') || '0', 10);

// DOM 元素引用
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

// E1 專用 DOM
const recitationPanel = document.getElementById('recitationPanel');
const modeReciteTab = document.getElementById('modeReciteTab');
const modeReadTab = document.getElementById('modeReadTab');
const e1TextContainer = document.getElementById('e1TextContainer');
const recitationSubView = document.getElementById('recitationSubView');
const readingSubView = document.getElementById('readingSubView');
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const recordTimer = document.getElementById('recordTimer');
const timerText = document.getElementById('timerText');
const verifySection = document.getElementById('verifySection');
const audioPlayback = document.getElementById('audioPlayback');
const recordResultTitle = document.getElementById('recordResultTitle');
const passCheckBtn = document.getElementById('passCheckBtn');
const failCheckBtn = document.getElementById('failCheckBtn');
const readCountDisplay = document.getElementById('readCountDisplay');
const addReadCountBtn = document.getElementById('addReadCountBtn');
const recitationHint = document.getElementById('recitationHint');

// 事件綁定
startBtn.onclick = startPractice;
stopBtn.onclick = stopPractice;
repeatBtn.onclick = handleRepeat;
submitAnsBtn.onclick = handleSubmitAnswer;
micBtn.onclick = handleMicToggle;
unitSelect.onchange = updateUnitPreview;

// E1 事件綁定
modeReciteTab.onclick = () => switchE1SubMode("recite");
modeReadTab.onclick = () => switchE1SubMode("read");
startRecordBtn.onclick = startRecording;
stopRecordBtn.onclick = stopRecording;
passCheckBtn.onclick = handleE1PassCheck;
failCheckBtn.onclick = handleE1FailCheck;
addReadCountBtn.onclick = handleAddReadCount;

userAnswerInput.onkeydown = (e) => { 
    if (e.key === 'Enter') handleSubmitAnswer(); 
};

updateUnitPreview();

function updateUnitPreview() {
    if (isPracticing) return;
    const selectedUnit = unitSelect.value;
    const config = getUnitConfig(selectedUnit);

    if (config.mode === "recitation") {
        streakDisplay.innerText = `目標: ≦ 20秒 / 300遍`;
        attemptDisplay.innerText = `本題嘗試: ${scoreManager.attempts}`;
    } else {
        const qList = getQuestionList(selectedUnit);
        const targetTotal = config.targetCount || (config.isSequential ? qList.length : 10);
        const label = config.isSequential ? "進度" : "連續通過";
        streakDisplay.innerText = `${label}: 0 / ${targetTotal}`;
        attemptDisplay.innerText = `本題嘗試: ${scoreManager.attempts}`;
    }
}

function startPractice() {
    isPracticing = true;
    currentUnit = unitSelect.value;
    currentConfig = getUnitConfig(currentUnit);
    currentQuestionList = getQuestionList(currentUnit);
    
    sequentialIndex = 0;
    const targetTotal = currentConfig.targetCount || (currentConfig.isSequential ? currentQuestionList.length : 10);
    
    scoreManager.resetSession(targetTotal);

    startBtn.disabled = true;
    stopBtn.disabled = false;
    unitSelect.disabled = true;

    updateStatusDisplay();

    if (currentConfig.mode === "recitation") {
        startE1Practice();
    } else {
        recitationPanel.style.display = 'none';
        startNewQuestion();
    }
}

function updateStatusDisplay() {
    if (currentConfig && currentConfig.mode === "recitation") {
        streakDisplay.innerText = `目標: ≦ 20秒 / 300遍`;
    } else {
        const label = currentConfig && currentConfig.isSequential ? "進度" : "連續通過";
        streakDisplay.innerText = `${label}: ${scoreManager.streak} / ${scoreManager.streakThreshold}`;
    }
    attemptDisplay.innerText = `本題嘗試: ${scoreManager.attempts}`;
}

function stopPractice() {
    isPracticing = false;
    speechService.stopSpeaking();
    speechService.stopRecognition();
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
    clearInterval(recordTimerInterval);

    startBtn.disabled = false;
    stopBtn.disabled = true;
    unitSelect.disabled = false;

    statementBox.style.display = 'none';
    interactiveArea.style.display = 'none';
    reviewPanel.style.display = 'none';
    recitationPanel.style.display = 'none';
    displayText.innerText = "請選擇單元開始練習";
    updateUnitPreview();
}

/* ===================================================
   單元 E1 背誦與讀誦邏輯
   =================================================== */
function startE1Practice() {
    statementBox.style.display = 'none';
    interactiveArea.style.display = 'none';
    displayText.style.display = 'none';
    reviewPanel.style.display = 'none';

    recitationPanel.style.display = 'block';
    e1TextContainer.innerText = currentConfig.text;
    e1TextContainer.style.display = 'block';

    readCountDisplay.innerText = readCount;
    switchE1SubMode("recite");
}

function switchE1SubMode(mode) {
    e1SubMode = mode;
    resetE1RecordState();

    if (mode === "recite") {
        modeReciteTab.classList.add('active');
        modeReadTab.classList.remove('active');
        recitationSubView.style.display = 'block';
        readingSubView.style.display = 'none';
        e1TextContainer.style.display = 'block';
    } else {
        modeReadTab.classList.add('active');
        modeReciteTab.classList.remove('active');
        readingSubView.style.display = 'block';
        recitationSubView.style.display = 'none';
        e1TextContainer.style.display = 'block';
    }
}

function resetE1RecordState() {
    clearInterval(recordTimerInterval);
    recordTimer.style.display = 'none';
    verifySection.style.display = 'none';
    startRecordBtn.style.display = 'inline-block';
    stopRecordBtn.style.display = 'none';
    e1TextContainer.style.display = 'block';
    timerText.innerText = "00:00";
    recitationHint.innerText = "【開始背誦請按「錄音按鈕」，完成時請按「停止鈕」】";
}

function startRecording() {
    // 按下錄音：立即清除上一輪的鼓勵提示，還原為初始狀態
    recitationHint.innerText = "【開始背誦請按「錄音按鈕」，完成時請按「停止鈕」】";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        recitationHint.innerText = "⚠️ 您的瀏覽器不支援麥克風錄音功能！";
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = processRecordingResult;

            mediaRecorder.start();
            recordStartTime = Date.now();

            // 按下錄音：法相自宗文字立即消失！
            e1TextContainer.style.display = 'none';
            startRecordBtn.style.display = 'none';
            stopRecordBtn.style.display = 'inline-block';
            recordTimer.style.display = 'block';
            verifySection.style.display = 'none';

            recordTimerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - recordStartTime) / 1000);
                const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
                const ss = String(elapsed % 60).padStart(2, '0');
                timerText.innerText = `${mm}:${ss}`;
            }, 500);
        })
        .catch(err => {
            recitationHint.innerText = "⚠️ 請允許使用麥克風授權進行背誦錄音：" + err.message;
        });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    clearInterval(recordTimerInterval);
}

function processRecordingResult() {
    recordedDurationSec = Math.round((Date.now() - recordStartTime) / 1000);
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);

    // 停止錄音：法相自宗文字重新顯示
    e1TextContainer.style.display = 'block';
    stopRecordBtn.style.display = 'none';
    recordTimer.style.display = 'none';
    verifySection.style.display = 'block';

    audioPlayback.src = audioUrl;
    recordResultTitle.innerText = `背誦錄音完成！長度： ${recordedDurationSec} 秒`;
}

function handleE1PassCheck() {
    if (recordedDurationSec <= currentConfig.targetTime) {
        // 背誦成功 (<= 20 秒，且確認正確)
        recitationHint.innerText = `🎉 恭喜您！成功在 ${recordedDurationSec} 秒內（≦ 20秒）正確背誦法相自宗！`;
        speechService.speak("恭喜您成功通過法相自宗背誦測試！", rateSelect.value, () => {
            stopPractice();
        });
    } else {
        // 正確但超過 20 秒
        scoreManager.incrementAttempt(false);
        updateStatusDisplay();
        recitationHint.innerText = `⚠️ 背誦正確！但背誦時間為 ${recordedDurationSec} 秒（目標為 ≦ 20秒）。請繼續練習加快速度！`;
        speechService.speak("背誦正確，但時間超過20秒，請再試一次", rateSelect.value, () => {
            resetE1RecordState();
        });
    }
}

function handleE1FailCheck() {
    scoreManager.incrementAttempt(false);
    updateStatusDisplay();
    recitationHint.innerText = "💪 沒關係！請重新錄音挑戰一次，相信您能做得更好！";
    speechService.speak("沒關係，請再接再勵，重新嘗試", rateSelect.value, () => {
        resetE1RecordState();
    });
}

function handleAddReadCount() {
    if (readCount < currentConfig.targetRepeatCount) {
        readCount++;
        readCountDisplay.innerText = readCount;
        localStorage.setItem('unitE1_readCount', readCount);

        if (readCount >= currentConfig.targetRepeatCount) {
            recitationHint.innerText = "🏆 恭喜您！已累計完成 300 遍法相自宗讀誦，順利通過本單元！";
            speechService.speak("恭喜您成功完成讀誦300遍目標", rateSelect.value, () => {
                stopPractice();
            });
        }
    }
}

/* ===================================================
   單元 A~D 問答邏輯
   =================================================== */
function startNewQuestion() {
    displayText.style.display = 'flex';
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

    if (currentConfig.showStatement) {
        statementBox.innerText = `【論式】${currentQ.statement}`;
        statementBox.style.display = 'block';
    } else {
        statementBox.style.display = 'none';
    }

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
    const incResult = scoreManager.incrementAttempt(currentConfig.isSequential);
    updateStatusDisplay();

    if (incResult.justResetStreak) {
        speechHint.innerText = "⚠️ 本題嘗試超過 3 次，連續通過次數已歸零！";
    }

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

function renderReviewRows() {
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
}

function showReviewPanel() {
    interactiveArea.style.display = 'none';
    const allCorrect = userSessionRecords.every(r => r.correct);

    if (allCorrect) {
        const scoreResult = scoreManager.recordResult(true, currentConfig.isSequential);
        updateStatusDisplay();

        renderReviewRows();
        reviewPanel.style.display = 'block';

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
                reviewTitle.innerText = "🎉 本題完全答對！進度 +1，準備進入下一題...";
                speechService.speak("太棒了，答對了", rateSelect.value, () => setTimeout(startNewQuestion, 1500));
            }
        }
    } else {
        const incResult = scoreManager.incrementAttempt(currentConfig.isSequential);
        updateStatusDisplay();

        renderReviewRows();
        reviewPanel.style.display = 'block';

        if (incResult.justResetStreak) {
            reviewTitle.innerText = "⚠️ 本題嘗試超過 3 次，連續通過次數歸零！請繼續挑戰本題...";
            speechService.speak("嘗試超過三次，連續次數歸零，請繼續挑戰本題", rateSelect.value, () => {
                setTimeout(retryCurrentQuestion, 1500);
            });
        } else {
            reviewTitle.innerText = "❌ 有答錯的子題，請繼續挑戰本題！";
            speechService.speak("答錯了，請再試一次", rateSelect.value, () => {
                setTimeout(retryCurrentQuestion, 1500);
            });
        }
    }
}

function retryCurrentQuestion() {
    reviewPanel.style.display = 'none';
    subQIndex = 0;
    userSessionRecords = [];
    updateStatusDisplay();
    askSubQuestion(true);
}