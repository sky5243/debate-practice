import { SpeechService } from './modules/speechServiceLive.js'; 
import { AnswerEvaluator } from './modules/answerEvaluator.js';
import { ScoreManager } from './modules/scoreManager.js';
import { getQuestionList, getUnitConfig } from './data/questionBank.js';

const speechService = new SpeechService();
const scoreManager = new ScoreManager();

speechService.onConnectionStateChange = (state) => {
    if (state === 'connected') {
        if (speechHint.innerText.includes('正在喚醒')) {
            speechHint.innerText = "✅ 伺服器已連線，請按住麥克風開始說話！";
            speechHint.style.color = "#27ae60"; 
            setTimeout(() => { speechHint.style.color = "#64748b"; }, 3500); 
        }
    }
};
speechService.connect();

let isPracticing = false;
let currentUnit = "A";
let currentConfig = null;
let currentQuestionList = [];
let sequentialIndex = 0;
let currentQ = null;
let subQIndex = 0;
let selectedPathIndex = -1; 
let lastQuestionIndex = -1;
let questionDeck = []; // 不重複出題用的洗牌題序（尚未出過的題目索引）

// 過關題數 ≥ 題目數的隨機單元（如 D1、D2、K1、K2）：每題都要問到，不重複出題
function usesNoRepeatDeck() {
    return !!currentConfig && !currentConfig.isSequential &&
           currentQuestionList.length > 0 &&
           scoreManager.streakThreshold >= currentQuestionList.length;
}

// 產生洗牌後的題目索引（Fisher-Yates），可排除指定索引
function shuffledIndices(excludeIndex) {
    const arr = [];
    for (let i = 0; i < currentQuestionList.length; i++) {
        if (i !== excludeIndex) arr.push(i);
    }
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
let userSessionRecords = [];
let prefixText = ""; 
let suffixText = ""; 
let debounceTimer = null;

// 💡 跨題傳遞的例子快取
let currentExtractedExample = "";

let e1SubMode = "recite"; 
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = 0;
let recordTimerInterval = null;
let recordedDurationSec = 0;
let readCount = parseInt(localStorage.getItem('unitE1_readCount') || '0', 10);
let isTreeDiagramOpen = false;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const restBtn = document.getElementById('restBtn'); 
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
const errorBox = document.getElementById('errorBox');
const tutorBox = document.getElementById('tutorBox');
const reviewPanel = document.getElementById('reviewPanel');
const reviewTitle = document.getElementById('reviewTitle');
const reviewContent = document.getElementById('reviewContent');
const DEFAULT_MIC_HINT = '💡 【操作口訣】長按說話 ➔ 放開定稿。若要修改，點擊文字缺口處，再次長按補唸即可插入。';

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

const treeDiagramArea = document.getElementById('treeDiagramArea');
const treeToggleBtn = document.getElementById('treeToggleBtn');
const treeDiagramCard = document.getElementById('treeDiagramCard');
const closeTreeBtn = document.getElementById('closeTreeBtn');

startBtn.onclick = startPractice;
stopBtn.onclick = () => stopPractice(false); 
restBtn.onclick = () => {
    speechService.speak("好的，好好休息吧，方便時再來練習唷！", parseFloat(rateSelect.value));
    stopPractice(true); 
    displayText.innerText = "隨喜您的精進，期待您下次再來練習唷！";
};

repeatBtn.onclick = handleRepeat;
submitAnsBtn.onclick = handleSubmitAnswer; // 內部已改為 async
micBtn.addEventListener('pointerdown', handleMicPointerDown);
// 💡 放開事件改由 handleMicPointerDown 在每次按壓時掛到 window（捕獲階段）與 lostpointercapture，避免事件遺失
micBtn.addEventListener('contextmenu', (e) => e.preventDefault());
unitSelect.onchange = updateUnitPreview;

modeReciteTab.onclick = () => switchE1SubMode("recite");
modeReadTab.onclick = () => switchE1SubMode("read");
startRecordBtn.onclick = startRecording;
stopRecordBtn.onclick = stopRecording;
passCheckBtn.onclick = handleE1PassCheck;
failCheckBtn.onclick = handleE1FailCheck;
addReadCountBtn.onclick = handleAddReadCount;

treeToggleBtn.onclick = toggleTreeDiagram;
closeTreeBtn.onclick = closeTreeDiagram;

userAnswerInput.onkeydown = (e) => { 
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitAnswer();
    }
};

readCountDisplay.innerText = readCount;
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

    if (speechService && typeof speechService.loadAudioProcessor === 'function') {
        speechService.loadAudioProcessor();
    }
    
    currentConfig = getUnitConfig(currentUnit);
    currentQuestionList = getQuestionList(currentUnit);
    
    sequentialIndex = 0;
    questionDeck = [];
    lastQuestionIndex = -1;
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
        closeTreeDiagram();
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

function stopPractice(keepSpeaking = false) {
    isPracticing = false;
    
    if (speechService && !keepSpeaking) {
        speechService.stopSpeaking();
        speechService.stopRecognition(); 
    } else if (speechService) {
        speechService.stopRecognition(); 
    }

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
    if (typeof recordTimerInterval !== 'undefined' && recordTimerInterval) { 
        clearInterval(recordTimerInterval); 
        recordTimerInterval = null; 
    }

    startBtn.disabled = false;
    stopBtn.disabled = true;
    unitSelect.disabled = false;

    userAnswerInput.disabled = false;
    micBtn.disabled = false;
    submitAnsBtn.disabled = false;
    repeatBtn.disabled = false;
    micBtn.classList.remove('recording', 'thinking');
    hideError();

    statementBox.style.display = 'none';
    interactiveArea.style.display = 'none';
    reviewPanel.style.display = 'none';
    recitationPanel.style.display = 'none';
    closeTreeDiagram();
    
    displayText.style.display = 'flex';
    displayText.innerText = "請重新選擇新單元後，再按【開始練習】";
    speechHint.innerText = DEFAULT_MIC_HINT;
    userAnswerInput.value = "";
    updateUnitPreview();
}

function toggleTreeDiagram() {
    if (isTreeDiagramOpen) {
        closeTreeDiagram();
    } else {
        openTreeDiagram();
    }
}

function openTreeDiagram() {
    isTreeDiagramOpen = true;
    treeDiagramCard.style.display = 'block';
    userAnswerInput.disabled = true;
    micBtn.disabled = true;
    submitAnsBtn.disabled = true;
    repeatBtn.disabled = true;
    speechHint.innerText = "🔒 查看法相表期間答題已鎖定，請關閉法相表後繼續答題。";
}

function closeTreeDiagram() {
    isTreeDiagramOpen = false;
    treeDiagramCard.style.display = 'none';
    userAnswerInput.disabled = false;
    micBtn.disabled = false;
    submitAnsBtn.disabled = false;
    repeatBtn.disabled = false;
    if (speechHint.innerText.includes("🔒")) {
        speechHint.innerText = "";
    }
}

// ----------------- E1 背誦/讀誦邏輯 -----------------
function startE1Practice() {
    statementBox.style.display = 'none';
    interactiveArea.style.display = 'none';
    displayText.style.display = 'none';
    reviewPanel.style.display = 'none';

    recitationPanel.style.display = 'block';
    e1TextContainer.innerText = currentConfig.text;
    e1TextContainer.style.display = 'block';

    readCount = parseInt(localStorage.getItem('unitE1_readCount') || '0', 10);
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
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
    clearInterval(recordTimerInterval);
}

function processRecordingResult() {
    recordedDurationSec = Math.round((Date.now() - recordStartTime) / 1000);
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);

    e1TextContainer.style.display = 'block';
    stopRecordBtn.style.display = 'none';
    recordTimer.style.display = 'none';
    verifySection.style.display = 'block';

    audioPlayback.src = audioUrl;
    recordResultTitle.innerText = `背誦錄音完成！長度： ${recordedDurationSec} 秒`;
}

function handleE1PassCheck() {
    const currentRate = parseFloat(rateSelect.value) || 1.0;
    const STARTUP_BUFFER = 800; 
    if (recordedDurationSec <= currentConfig.targetTime) {
        recitationHint.innerText = `🎉 恭喜您！成功在 ${recordedDurationSec} 秒內（≦ 20秒）正確背誦法相自宗！`;
        const dynamicDelay = Math.round((4200 / currentRate) + STARTUP_BUFFER);
        let hasExecuted = false;
        const nextStep = () => {
            if (hasExecuted) return;
            hasExecuted = true;
            stopPractice(true);
        };
        speechService.speak("恭喜您成功通過法相自宗背誦測試！", currentRate, nextStep);
        setTimeout(nextStep, dynamicDelay);
    } else {
        scoreManager.incrementAttempt(false);
        updateStatusDisplay();
        recitationHint.innerText = `⚠️ 背誦正確！但背誦時間為 ${recordedDurationSec} 秒（目標為 ≦ 20秒）。請繼續練習加快速度！`;
        const dynamicDelay = Math.round((4800 / currentRate) + STARTUP_BUFFER);
        let hasExecuted = false;
        const nextStep = () => {
            if (hasExecuted) return;
            hasExecuted = true;
            resetE1RecordState();
        };
        speechService.speak("背誦正確，但時間超過20秒，請再試一次", currentRate, nextStep);
        setTimeout(nextStep, dynamicDelay);
    }
}

function handleE1FailCheck() {
    const currentRate = parseFloat(rateSelect.value) || 1.0;
    const STARTUP_BUFFER = 800;
    scoreManager.incrementAttempt(false);
    updateStatusDisplay();
    recitationHint.innerText = "💪 沒關係！請重新錄音挑戰一次，相信您能做得更好！";
    const dynamicDelay = Math.round((3500 / currentRate) + STARTUP_BUFFER);
    let hasExecuted = false;
    const nextStep = () => {
        if (hasExecuted) return;
        hasExecuted = true;
        resetE1RecordState();
    };
    speechService.speak("沒關係，請再接再勵，重新嘗試", currentRate, nextStep);
    setTimeout(nextStep, dynamicDelay);
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

// ----------------- 一般問答與 AI 判定題目邏輯 -----------------
function startNewQuestion() {
    displayText.style.display = 'flex';
    reviewPanel.style.display = 'none';
    interactiveArea.style.display = 'none';
    reviewContent.innerHTML = "";
    userAnswerInput.value = "";
    speechHint.innerText = DEFAULT_MIC_HINT;
    hideError();

    if (currentConfig.hasTreeDiagram) {
        treeDiagramArea.style.display = 'block';
    } else {
        treeDiagramArea.style.display = 'none';
    }

    if (currentConfig.isSequential) {
        currentQ = currentQuestionList[sequentialIndex];
    } else if (usesNoRepeatDeck()) {
        // 💡 過關題數 ≥ 題目數的單元：隨機順序但不重複，抽完一輪才重新洗牌
        if (questionDeck.length === 0) {
            questionDeck = shuffledIndices(-1);
            // 新一輪的第一題避免和上一題相同
            if (questionDeck.length > 1 && questionDeck[0] === lastQuestionIndex) {
                [questionDeck[0], questionDeck[1]] = [questionDeck[1], questionDeck[0]];
            }
        }
        const newIndex = questionDeck.shift();
        lastQuestionIndex = newIndex;
        currentQ = currentQuestionList[newIndex];
    } else {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * currentQuestionList.length);
        } while (currentQuestionList.length > 1 && newIndex === lastQuestionIndex);
        lastQuestionIndex = newIndex;
        currentQ = currentQuestionList[newIndex];
    }

    subQIndex = 0;
    selectedPathIndex = -1; 
    userSessionRecords = [];
    currentExtractedExample = ""; // 重置舉例快取

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
    speechHint.innerText = DEFAULT_MIC_HINT;
    hideError();
    interactiveArea.style.display = 'none';

    if (currentConfig.showStatement) {
        statementBox.innerText = `【論式】${currentQ.statement}`;
        statementBox.style.display = 'block';
    } else {
        statementBox.style.display = 'none';
    }

    if (currentConfig.hideQuestionText) {
        displayText.innerText = "🎧 請聽語音題目，回答「對」或「錯」";
    } else {
        displayText.innerText = `👉 請回答：【${currentQ.questions[subQIndex]}】`;
    }

    let textToSpeak = "";
    if (currentUnit === "E2") {
        textToSpeak = currentQ.statement;
    } else {
        const speechText = getSpeechQuestionText(subQIndex);
        textToSpeak = (readStatement ? currentQ.statement + "， " : "") + speechText;
    }

    speechService.speak(textToSpeak, rateSelect.value, () => {
        if (!isPracticing) return; 
        interactiveArea.style.display = 'block';
        userAnswerInput.value = "";
        if (!isTreeDiagramOpen) {
            userAnswerInput.focus();
        }
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
    let textToSpeak = "";
    if (currentUnit === "E2") {
        textToSpeak = currentQ.statement;
    } else {
        const speechText = getSpeechQuestionText(subQIndex);
        textToSpeak = currentQ.statement + "， " + speechText;
    }
    speechService.speak(textToSpeak, rateSelect.value, () => {
        if (!isPracticing) return; 
        interactiveArea.style.display = 'block';
        userAnswerInput.value = "";
        if (!isTreeDiagramOpen) {
            userAnswerInput.focus();
        }
    });
}

function showError(message) {
    if (!errorBox) return;
    errorBox.innerText = message;
    errorBox.style.display = 'block';
}

function hideError() {
    if (!errorBox) return;
    errorBox.innerText = '';
    errorBox.style.display = 'none';
}

function getCurrentDebateContext() {
    if (!currentQ) return '';
    let context = currentUnit === 'E2' 
        ? (currentQ.statement || '') 
        : `${currentQ.statement || ''}，${getSpeechQuestionText(subQIndex)}`;
    
    if (currentQ.answers && typeof currentQ.answers[0] !== 'object') {
        let expectedAnswers = [];
        if (Array.isArray(currentQ.answers[0])) {
            if (selectedPathIndex !== -1) {
                expectedAnswers.push(currentQ.answers[selectedPathIndex][subQIndex]);
            } else {
                expectedAnswers = currentQ.answers.map(path => path[subQIndex]);
            }
        } else {
            expectedAnswers.push(currentQ.answers[subQIndex]);
        }
        const validAnswers = expectedAnswers.filter(ans => ans).join(" 或 ");
        if (validAnswers) {
            context += ` (預期使用者的回答可能是：「${validAnswers}」)`;
        }
    }
    return context;
}

function applyMicUiState(state) {
    micBtn.classList.remove('recording', 'thinking');
    if (state === 'recording') {
        micBtn.classList.add('recording');
        micBtn.disabled = false;
        submitAnsBtn.disabled = true;
        speechHint.innerText = '🔴 【口訣：按住 ➔ 看到紅燈 ➔ 穩聲說話 ➔ 放開】錄音中...';
        hideError();        
    } else if (state === 'thinking') {
        micBtn.classList.add('thinking');
        micBtn.disabled = true;
        submitAnsBtn.disabled = true;
        userAnswerInput.disabled = true;
        speechHint.innerText = '🧠 判定中，請稍候…';
    } else {
        micBtn.disabled = isTreeDiagramOpen;
        submitAnsBtn.disabled = isTreeDiagramOpen;
        userAnswerInput.disabled = isTreeDiagramOpen;
        const keepHint = speechHint.innerText.startsWith('辨識結果') || speechHint.innerText.startsWith('⚠️') || speechHint.innerText.includes('AI');
        if (!keepHint) {
            speechHint.innerText = DEFAULT_MIC_HINT;
        }
    }
}

let micStartInFlight = false;       // 正在啟動錄音（等待麥克風授權 / 音訊引擎）
let micReleasedDuringStart = false; // 啟動期間使用者已經放開
let micPressActive = false;         // 本次按壓尚未處理「放開」
let micStopInProgress = false;      // 正在停止錄音（避免重複停止）
let activePointerId = null;
let isSubmitting = false;           // 正在送出 / 判定答案（避免重複送出）

function attachMicReleaseListeners() {
    // 掛在 window 的捕獲階段：就算指標移出按鈕、或其他元素攔截事件，也一定收得到放開
    window.addEventListener('pointerup', handleMicRelease, true);
    window.addEventListener('pointercancel', handleMicRelease, true);
    micBtn.addEventListener('lostpointercapture', handleMicRelease);
}

function detachMicReleaseListeners() {
    window.removeEventListener('pointerup', handleMicRelease, true);
    window.removeEventListener('pointercancel', handleMicRelease, true);
    micBtn.removeEventListener('lostpointercapture', handleMicRelease);
}

async function handleMicPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!isPracticing || isTreeDiagramOpen || isSubmitting) return;
    if (speechService.isListening || micStartInFlight || micStopInProgress || micPressActive) return;
    if (!speechService.isConnected) {
        speechHint.innerText = "⏳ 正在喚醒雲端語音伺服器 (約需 30-50 秒)，請稍候再按...";
        speechHint.style.color = "#e67e22";
        speechService.connect();
        return;
    }
    speechHint.style.color = "#64748b";
    event.preventDefault();

    micPressActive = true;
    activePointerId = event.pointerId;
    attachMicReleaseListeners();
    try { micBtn.setPointerCapture(event.pointerId); } catch { /* ignore */ }

    micReleasedDuringStart = false;
    micStartInFlight = true;

    const currentText = userAnswerInput.value || "";
    const cursorStart = userAnswerInput.selectionStart !== null ? userAnswerInput.selectionStart : currentText.length;
    const cursorEnd = userAnswerInput.selectionEnd !== null ? userAnswerInput.selectionEnd : currentText.length;
    prefixText = currentText.substring(0, cursorStart);
    suffixText = currentText.substring(cursorEnd);

    speechService.onLiveResult = (transcript) => {
        const correctedText = AnswerEvaluator.normalizeSTTText(transcript);
        if (!correctedText) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const fullAnswer = prefixText + correctedText + suffixText;
            userAnswerInput.value = fullAnswer;
            const newCursorPos = prefixText.length + correctedText.length;
            userAnswerInput.setSelectionRange(newCursorPos, newCursorPos);
            userAnswerInput.focus();
            hideError();
        }, 250);
    };

    speechService.currentContext = getCurrentDebateContext();

    let started = false;
    try {
        started = await speechService.startRecording(applyMicUiState, (errorMsg) => {
            showError(errorMsg);
            speechHint.innerText = `⚠️ ${errorMsg}`;
            applyMicUiState('idle');
        });
    } finally {
        micStartInFlight = false;
    }

    if (!started) {
        // 啟動失敗或被取消：清掉本次按壓狀態，下次可正常再按
        micPressActive = false;
        activePointerId = null;
        detachMicReleaseListeners();
        return;
    }
    if (micReleasedDuringStart) {
        await stopMicRecording();
    }
}

function handleMicRelease(event) {
    if (!micPressActive) return;
    if (activePointerId !== null && event.pointerId !== undefined && event.pointerId !== activePointerId) return;

    micPressActive = false;
    activePointerId = null;
    detachMicReleaseListeners();
    try { micBtn.releasePointerCapture(event.pointerId); } catch { /* ignore */ }

    if (micStartInFlight) {
        // 麥克風還在啟動中：記下已放開，啟動完成後立刻停止
        micReleasedDuringStart = true;
        return;
    }
    stopMicRecording();
}

// 停止錄音（重複呼叫也只會執行一次）；放開只定稿，不自動送出
async function stopMicRecording() {
    if (micStopInProgress || !speechService.isListening) return;
    micStopInProgress = true;
    try {
        // 刻意延遲 400 毫秒，確保「無」、「對」等極短音的尾音完整送出給伺服器
        await new Promise(resolve => setTimeout(resolve, 400));
        await speechService.stopRecordingAndSend({ onStateChange: applyMicUiState });
    } catch (e) {
        console.error('停止錄音時發生錯誤:', e);
        speechService.stopRecognition();
        applyMicUiState('idle');
    } finally {
        micStopInProgress = false;
    }
}

// 💡 非同步送出答案，並呼叫 AnswerEvaluator 處理 AI 邏輯
// 防重複送出、空白檢查，並以 try/finally 保證介面一定會回到可操作狀態
async function handleSubmitAnswer() {
    if (isSubmitting || !isPracticing || !currentQ) return;

    speechService.stopRecognition();
    const val = userAnswerInput.value.trim();

    let std = "";
    let isCorrect = false;
    let aiFeedback = "";
    let feedbackSource = "local"; // "local"：法相表 / 字串比對；"ai"：後端 AI 判定

    // 💡 空白答案視同「無法安立」（使用者的便利操作），不擋送出，交由判定邏輯處理
    const currentTargetAnswer = currentQ.answers[subQIndex];

    isSubmitting = true;
    let usedThinkingUi = false;
    try {
        if (currentTargetAnswer && currentTargetAnswer.type === "ai_eval") {
            applyMicUiState('thinking');
            usedThinkingUi = true;

            // 呼叫 AnswerEvaluator (本地法相表優先，表外詞彙才調用後端 AI；fetch 內建逾時)
            const aiResult = await AnswerEvaluator.evaluateWithAI(
                val,
                currentQ.logicParams,
                currentTargetAnswer.evalGoal,
                currentExtractedExample,
                {
                    // 只有真的要詢問後端 AI 時，才把提示改成 AI 字樣
                    onAiCall: () => {
                        speechHint.innerText = '🤖 法相表中沒有此例，正在詢問 AI（最多 3 秒）…';
                    }
                }
            );

            if (aiResult.retryable) {
                // AI 使用量暫時達上限：不記錄對錯、停留在本題，讓使用者稍後再送出
                showError(aiResult.feedback);
                speechHint.innerText = `⚠️ ${aiResult.feedback}`;
                return;
            }

            isCorrect = aiResult.isCorrect;
            aiFeedback = aiResult.feedback || "";

            if (currentTargetAnswer.evalGoal === "example" && aiResult.extractedExample) {
                currentExtractedExample = aiResult.extractedExample;
            }

            feedbackSource = aiResult.source === 'ai' ? 'ai' : 'local';
            if (currentTargetAnswer.evalGoal === 'example') {
                std = feedbackSource === 'ai' ? '（表外事例：AI 歸類＋法相表規則判定）' : '（依法相表判定）';
            } else {
                std = aiResult.expectedTheses
                    ? `${aiResult.expectedTheses}（順序不拘）`
                    : '（依舉例代入的立宗）';
            }

        } else {
            if (currentQ.answers && Array.isArray(currentQ.answers[0]) && typeof currentQ.answers[0] !== 'object') {
                if (subQIndex === 0) {
                    let matched = false;
                    for (let i = 0; i < currentQ.answers.length; i++) {
                        const pathStd = currentQ.answers[i][0];
                        const checkPass = currentConfig.isSequential ? (val === pathStd) : AnswerEvaluator.checkAnswer(val, pathStd);
                        if (checkPass) {
                            isCorrect = true;
                            selectedPathIndex = i; 
                            std = pathStd;
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) {
                        selectedPathIndex = 0;
                        std = currentQ.answers.map(p => p[0]).join(" 或 ");
                    }
                } else {
                    std = currentQ.answers[selectedPathIndex][subQIndex];
                    isCorrect = currentConfig.isSequential ? (val === std) : AnswerEvaluator.checkAnswer(val, std);
                }
            } else {
                std = currentTargetAnswer;
                isCorrect = currentConfig.isSequential ? (val === std) : AnswerEvaluator.checkAnswer(val, std);
            }
        }
    } catch (e) {
        console.error('判定答案時發生錯誤:', e);
        showError('判定過程發生錯誤，請再按一次送出。');
        return;
    } finally {
        isSubmitting = false;
        if (usedThinkingUi) {
            // 清掉「判定中 / 正在詢問 AI」等進行中提示，避免殘留在畫面上
            if (speechHint.innerText.startsWith('🧠') || speechHint.innerText.startsWith('🤖')) {
                speechHint.innerText = DEFAULT_MIC_HINT;
            }
            applyMicUiState('idle');
        }
    }

    userSessionRecords.push({
        q: currentUnit === "E2" ? currentQ.statement : currentQ.questions[subQIndex],
        ans: val,
        correct: isCorrect,
        std: std === "" ? "(留空/無法安立)" : std,
        aiFeedback: aiFeedback,
        feedbackSource: feedbackSource
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
            ${rec.aiFeedback ? (rec.feedbackSource === 'ai'
                ? `<br>🤖 <span style="color: #d35400; font-size: 0.9em;">AI 說明：${rec.aiFeedback}</span>`
                : `<br>📘 <span style="color: #2c7a7b; font-size: 0.9em;">判定說明：${rec.aiFeedback}</span>`) : ''}
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
        reviewPanel.style.display = 'none';

        if (currentConfig.isSequential) {
            sequentialIndex++;
            if (sequentialIndex >= currentQuestionList.length) {
                speechService.speak("恭喜您成功通過本單元的所有練習", rateSelect.value, () => { stopPractice(); });
            } else {
                speechService.speak("太棒了，答對了", rateSelect.value, startNewQuestion);
            }
        } else {
            if (scoreResult.isPassed) {
                speechService.speak("恭喜您通過本單元的測試，請重新選擇練習單元", rateSelect.value, () => { stopPractice(); });
            } else {
                speechService.speak("太棒了，答對了", rateSelect.value, startNewQuestion);
            }
        }
    } else {
        const incResult = scoreManager.incrementAttempt(currentConfig.isSequential);
        updateStatusDisplay();

        renderReviewRows();
        reviewPanel.style.display = 'block';

        const retryBtnHtml = `
            <div style="text-align: center; margin-top: 20px;">
                <button id="manualRetryBtn" style="background-color: #3498db; color: white; border: none; padding: 12px 24px; font-size: 18px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.2s;">
                    👀 我看懂了，重新挑戰本題
                </button>
            </div>
        `;

        if (incResult.justResetStreak && usesNoRepeatDeck()) {
            // 連續次數歸零：本題答對後算新一輪的第 1 題，其餘題目重新洗牌，確保接下來連續答對的題數涵蓋全部題目
            questionDeck = shuffledIndices(lastQuestionIndex);
        }

        if (incResult.justResetStreak) {
            reviewTitle.innerText = "⚠️ 本題嘗試超過 3 次，連續通過次數歸零！請仔細檢視錯誤：";
            reviewContent.innerHTML += retryBtnHtml;
            speechService.speak("嘗試超過三次，連續次數歸零，沒關係，請看畫面比對錯誤，再繼續挑戰唷！", rateSelect.value);
        } else {
            reviewTitle.innerText = "❌ 答錯了，請仔細比對您的回答與標準答案：";
            reviewContent.innerHTML += retryBtnHtml;
            speechService.speak("答錯了，沒關係，請看畫面比對錯誤，再來一次！", rateSelect.value);
        }
        document.getElementById('manualRetryBtn').addEventListener('click', retryCurrentQuestion);
    }
}

function retryCurrentQuestion() {
    reviewPanel.style.display = 'none';
    subQIndex = 0;
    selectedPathIndex = -1; 
    userSessionRecords = [];
    currentExtractedExample = ""; 
    updateStatusDisplay();
    askSubQuestion(true);
}