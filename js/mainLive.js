import { SpeechService } from './modules/speechServiceLive.js'; // 💡 改為引用 Live 語音模組
import { AnswerEvaluator } from './modules/answerEvaluator.js';
import { ScoreManager } from './modules/scoreManager.js';
import { getQuestionList, getUnitConfig } from './data/questionBank.js';

const speechService = new SpeechService();
const scoreManager = new ScoreManager();

// 💡 修正：網頁一載入就綁定狀態，並在背景提早喚醒伺服器 (爭取 30~50 秒冷啟動時間)
speechService.onConnectionStateChange = (state) => {
    if (state === 'connected') {
        // 如果使用者剛剛按了麥克風正在等，就切換成連線成功提示
        if (speechHint.innerText.includes('正在喚醒')) {
            speechHint.innerText = "✅ 伺服器已連線，請按住麥克風開始說話！";
            speechHint.style.color = "#27ae60"; // 轉為綠色
            setTimeout(() => { speechHint.style.color = "#64748b"; }, 3500); // 3.5秒後恢復預設顏色
        }
    }
};
// 立即在背景發起連線
speechService.connect();

let isPracticing = false;
let currentUnit = "A";
let currentConfig = null;
let currentQuestionList = [];
let sequentialIndex = 0;
let currentQ = null;
let subQIndex = 0;
let selectedPathIndex = -1; // 💡 記錄鎖定的路線索引
let lastQuestionIndex = -1;
let userSessionRecords = [];
let prefixText = ""; // 游標前的文字
let suffixText = ""; // 游標後的文字
let debounceTimer = null;

// E1 背誦與讀誦相關變數
let e1SubMode = "recite"; // "recite" 背誦 | "read" 讀誦
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = 0;
let recordTimerInterval = null;
let recordedDurationSec = 0;
let readCount = parseInt(localStorage.getItem('unitE1_readCount') || '0', 10);

// E2 法相表狀態
let isTreeDiagramOpen = false;

// DOM 元素引用
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const restBtn = document.getElementById('restBtn'); // 💡 綁定休眠按鈕 DOM
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

// E2 專用 DOM
const treeDiagramArea = document.getElementById('treeDiagramArea');
const treeToggleBtn = document.getElementById('treeToggleBtn');
const treeDiagramCard = document.getElementById('treeDiagramCard');
const closeTreeBtn = document.getElementById('closeTreeBtn');

// 事件綁定
startBtn.onclick = startPractice;
stopBtn.onclick = () => stopPractice(false); // 明確傳入 false，不管怎樣都把語音卡死

// 💡 修正：修暫止息力按鈕，僅清理狀態與硬體，絕對不切斷 WebSocket 連線
// 💡 修正：加上 parseFloat 確保語音正常播放，並在 stopPractice 後方覆寫專屬提示文字
restBtn.onclick = () => {
    speechService.speak("好的，好好休息吧，方便時再來練習唷！", parseFloat(rateSelect.value));
    stopPractice(true); 
    displayText.innerText = "隨喜您的精進，期待您下次再來練習唷！";
};

repeatBtn.onclick = handleRepeat;
submitAnsBtn.onclick = handleSubmitAnswer;
micBtn.addEventListener('pointerdown', handleMicPointerDown);
micBtn.addEventListener('pointerup', handleMicPointerUp);
micBtn.addEventListener('pointercancel', handleMicPointerUp);
micBtn.addEventListener('contextmenu', (e) => e.preventDefault());
unitSelect.onchange = updateUnitPreview;

// E1 事件綁定
modeReciteTab.onclick = () => switchE1SubMode("recite");
modeReadTab.onclick = () => switchE1SubMode("read");
startRecordBtn.onclick = startRecording;
stopRecordBtn.onclick = stopRecording;
passCheckBtn.onclick = handleE1PassCheck;
failCheckBtn.onclick = handleE1FailCheck;
addReadCountBtn.onclick = handleAddReadCount;

// E2 事件綁定
treeToggleBtn.onclick = toggleTreeDiagram;
closeTreeBtn.onclick = closeTreeDiagram;

// 💡 避免在 textarea 中按下 Enter 換行，維持原有的送出行為
userAnswerInput.onkeydown = (e) => { 
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitAnswer();
    }
};

// 確保頁面一載入就顯示正確的歷史累計次數
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

    // 💡 保留優化：預先載入音訊處理模組，不開啟麥克風權限 (不發熱)，有效縮短點擊時的啟動延遲
    if (speechService && typeof speechService.loadAudioProcessor === 'function') {
        speechService.loadAudioProcessor();
    }
    
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

// 預設 keepSpeaking 為 false
function stopPractice(keepSpeaking = false) {
    isPracticing = false;
    
    // 1. 強制停止語音服務與麥克風資源
    if (speechService && !keepSpeaking) {
        speechService.stopSpeaking();
        speechService.stopRecognition(); 
    } else if (speechService) {
        // 即使保留朗讀，還是要停止語音辨識與麥克風
        speechService.stopRecognition(); 
    }

    // 2. 強制停止 E1 錄音與釋放串流
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
    // 💡 確實清除計時器防耗電
    if (typeof recordTimerInterval !== 'undefined' && recordTimerInterval) { 
        clearInterval(recordTimerInterval); 
        recordTimerInterval = null; 
    }

    // 3. 恢復控制面板與按鈕狀態
    startBtn.disabled = false;
    stopBtn.disabled = true;
    unitSelect.disabled = false;

    // 4. 解鎖輸入框與選單
    userAnswerInput.disabled = false;
    micBtn.disabled = false;
    submitAnsBtn.disabled = false;
    repeatBtn.disabled = false;
    micBtn.classList.remove('recording', 'thinking');
    hideError();

    // 5. 清空與隱藏面板
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

/* ===================================================
   E2 法相樹狀圖控制
   =================================================== */
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
    const STARTUP_BUFFER = 800; // 💡 800ms 固定啟動延遲與聲音切換緩衝

    if (recordedDurationSec <= currentConfig.targetTime) {
        recitationHint.innerText = `🎉 恭喜您！成功在 ${recordedDurationSec} 秒內（≦ 20秒）正確背誦法相自宗！`;
        
        // 17字+標點，1.0倍速基準設為 4200ms
        const dynamicDelay = Math.round((4200 / currentRate) + STARTUP_BUFFER);

        let hasExecuted = false;
        const nextStep = () => {
            if (hasExecuted) return;
            hasExecuted = true;
            // 💡 傳入 true，表示結束練習時不要強制切斷正在播放的語音
            stopPractice(true);
        };

        speechService.speak("恭喜您成功通過法相自宗背誦測試！", currentRate, nextStep);
        setTimeout(nextStep, dynamicDelay);

    } else {
        scoreManager.incrementAttempt(false);
        updateStatusDisplay();
        recitationHint.innerText = `⚠️ 背誦正確！但背誦時間為 ${recordedDurationSec} 秒（目標為 ≦ 20秒）。請繼續練習加快速度！`;
        
        // 20字+標點，1.0倍速基準設為 4800ms
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
    
    // 14字+標點，1.0倍速基準設為 3500ms
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

/* ===================================================
   單元 A~D、E2 及 F~I2 問答邏輯
   =================================================== */
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
    } else {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * currentQuestionList.length);
        } while (currentQuestionList.length > 1 && newIndex === lastQuestionIndex);
        lastQuestionIndex = newIndex;
        currentQ = currentQuestionList[newIndex];
    }

    subQIndex = 0;
    selectedPathIndex = -1; // 💡 重置路線
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
        if (!isPracticing) return; // 💡 防護機制：如果練習已經中斷，就立刻停止，不顯示作答區
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
        if (!isPracticing) return; // 💡 防護機制：同上
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

    // 1. 取得基本題目脈絡（論式 + 當前提問）
    let context = currentUnit === 'E2' 
        ? (currentQ.statement || '') 
        : `${currentQ.statement || ''}，${getSpeechQuestionText(subQIndex)}`;

    // 2. 動態提取當下階段 (subQIndex) 的預期標準答案
    if (currentQ.answers) {
        let expectedAnswers = [];

        if (Array.isArray(currentQ.answers[0])) {
            // 【多重路徑】
            if (selectedPathIndex !== -1) {
                // 已鎖定路線，只給該路線當下階段的答案
                expectedAnswers.push(currentQ.answers[selectedPathIndex][subQIndex]);
            } else {
                // 尚未鎖定路線（通常是第一階），抓取所有路線的可能選項
                expectedAnswers = currentQ.answers.map(path => path[subQIndex]);
            }
        } else {
            // 【單一路徑】包含不遍後面的直接與間接立宗
            expectedAnswers.push(currentQ.answers[subQIndex]);
        }

        // 過濾空值並組合成提示字串
        const validAnswers = expectedAnswers.filter(ans => ans).join(" 或 ");
        if (validAnswers) {
            // 讓 Gemini 知道這就是接下來極有可能聽到的發音
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
        // 💡 加上清晰的操作口訣
        speechHint.innerText = '🔴 【口訣：按住 ➔ 看到紅燈 ➔ 穩聲說話 ➔ 放開】錄音中...';
        hideError();        
    } else if (state === 'thinking') {
        micBtn.classList.add('thinking');
        micBtn.disabled = true;
        submitAnsBtn.disabled = true;
        userAnswerInput.disabled = true;
        speechHint.innerText = '🧠 AI 思考中，正在解析您的語音…';
    } else {
        micBtn.disabled = isTreeDiagramOpen;
        submitAnsBtn.disabled = isTreeDiagramOpen;
        userAnswerInput.disabled = isTreeDiagramOpen;
        const keepHint = speechHint.innerText.startsWith('辨識結果') || speechHint.innerText.startsWith('⚠️');
        if (!keepHint) {
            // 💡 在閒置狀態時也常態顯示口訣提示
            speechHint.innerText = DEFAULT_MIC_HINT;
        }
    }
}

let micStartInFlight = false;
let micReleasedDuringStart = false;

// 💡 修改：在按下按鈕時，綁定 WebSocket 的即時回傳事件 (onLiveResult)
// 💡 修改：改為「游標前綴/後綴擷取」與「防抖插入」邏輯
async function handleMicPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!isPracticing || isTreeDiagramOpen || speechService.isListening || speechService.isThinking || micStartInFlight) return;
    
    // 💡 按下麥克風時，攔截未連線狀態並給予明確提示
    if (!speechService.isConnected) {
        speechHint.innerText = "⏳ 正在喚醒雲端語音伺服器 (約需 30-50 秒)，請稍候再按...";
        speechHint.style.color = "#e67e22"; // 變成醒目的橘色
        speechService.connect(); // 再次確保有觸發連線
        return; // 直接中斷，不啟動錄音
    }
    speechHint.style.color = "#64748b"; // 確保顏色恢復正常
    
    event.preventDefault();
    try {
        micBtn.setPointerCapture(event.pointerId);
    } catch {
        /* ignore */
    }
    micReleasedDuringStart = false;
    micStartInFlight = true;

    // 👉 1. 取得當前輸入框內的文字與游標位置
    const currentText = userAnswerInput.value || "";
    // 若沒有游標焦點，預設將游標視為在文字最末端
    const cursorStart = userAnswerInput.selectionStart !== null ? userAnswerInput.selectionStart : currentText.length;
    const cursorEnd = userAnswerInput.selectionEnd !== null ? userAnswerInput.selectionEnd : currentText.length;

    // 👉 2. 將文字以游標為界線，切成「前半段」與「後半段」
    // 如果使用者反白了一段錯字，這段邏輯會剛好把錯字過濾掉，替換為新的語音
    prefixText = currentText.substring(0, cursorStart);
    suffixText = currentText.substring(cursorEnd);

    // 👉 3. 綁定 Live 模式即時傳回的文字
    speechService.onLiveResult = (transcript) => {
        // 先進行同音字與專有名詞校正
        const correctedText = AnswerEvaluator.normalizeSTTText(transcript);
        if (!correctedText) return;

        // 加入 250ms 防抖緩衝，避免 Gemini 思考中途的微調造成畫面閃爍
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // 💡 直接組合：游標前文字 + 最新語音文字 + 游標後文字
            const fullAnswer = prefixText + correctedText + suffixText;
            
            userAnswerInput.value = fullAnswer;
            
            // 💡 UX 優化：將游標自動定位在剛輸入完的語音文字後方
            const newCursorPos = prefixText.length + correctedText.length;
            userAnswerInput.setSelectionRange(newCursorPos, newCursorPos);
            userAnswerInput.focus();

            hideError();
        }, 250);
    };

    // 👉 傳入 context，讓 WebSocket 連線可以將題目脈絡帶給 Gemini 建立詞彙表
    speechService.currentContext = getCurrentDebateContext();

    const started = await speechService.startRecording(applyMicUiState, (errorMsg) => {
        showError(errorMsg);
        speechHint.innerText = `⚠️ ${errorMsg}`;
        applyMicUiState('idle');
    });
    
    micStartInFlight = false;
    if (started && micReleasedDuringStart) {
        await handleMicPointerUp(event);
    }
}

// 💡 修改：在放開按鈕時，加入 400ms 延遲保留短音，並徹底釋放錄音資源
async function handleMicPointerUp(event) {
    if (micStartInFlight) {
        micReleasedDuringStart = true;
        return;
    }
    if (!speechService.isListening) return;
    event.preventDefault();

    // 👉 刻意延遲 400 毫秒，確保「無」、「對」等極短音的尾音完整送出給 WebSocket 伺服器
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // 👉 停止錄音，但保留 WS 連線
    await speechService.stopRecordingAndSend({
        onStateChange: applyMicUiState
    });
}

function handleSubmitAnswer() {
    speechService.stopRecognition();
    applyMicUiState('idle');
    const val = userAnswerInput.value.trim();
    let std = "";
    let isCorrect = false;

    // --- 處理 H2 / I2 /J2 雙重路徑與舊單元單一路徑的動態判斷 ---
    if (currentQ.answers && Array.isArray(currentQ.answers[0])) {
        // 【二維陣列】多路徑模式
        if (subQIndex === 0) {
            let matched = false;
            for (let i = 0; i < currentQ.answers.length; i++) {
                const pathStd = currentQ.answers[i][0];
                const checkPass = currentConfig.isSequential ? (val === pathStd) : AnswerEvaluator.checkAnswer(val, pathStd);
                if (checkPass) {
                    isCorrect = true;
                    selectedPathIndex = i; // 鎖定路線
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
        // 【一維陣列】單一路徑
        std = currentQ.answers[subQIndex];
        if (currentConfig.isSequential) {
            isCorrect = (val === std);
        } else {
            isCorrect = AnswerEvaluator.checkAnswer(val, std);
        }
    }

    userSessionRecords.push({
        q: currentUnit === "E2" ? currentQ.statement : currentQ.questions[subQIndex],
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

        // 💡 修改 1：答對時，強制隱藏結算面板，不顯示回答細節
        reviewPanel.style.display = 'none';

        if (currentConfig.isSequential) {
            sequentialIndex++;
            if (sequentialIndex >= currentQuestionList.length) {
                speechService.speak("恭喜您成功通過本單元的所有練習", rateSelect.value, () => { stopPractice(); });
            } else {
                // 💡 TTS 唸完「太棒了，答對了」後，立刻直接觸發 startNewQuestion
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

        // 💡 修改 2：答錯時，顯示對照表，並加入手動確認按鈕，移除自動跳轉
        renderReviewRows();
        reviewPanel.style.display = 'block';

        // 建立手動點擊的確認按鈕
        const retryBtnHtml = `
            <div style="text-align: center; margin-top: 20px;">
                <button id="manualRetryBtn" style="background-color: #3498db; color: white; border: none; padding: 12px 24px; font-size: 18px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.2s;">
                    👀 我看懂了，重新挑戰本題
                </button>
            </div>
        `;

        if (incResult.justResetStreak) {
            reviewTitle.innerText = "⚠️ 本題嘗試超過 3 次，連續通過次數歸零！請仔細檢視錯誤：";
            reviewContent.innerHTML += retryBtnHtml;
            speechService.speak("嘗試超過三次，連續次數歸零，沒關係，請看畫面比對錯誤，再繼續挑戰唷！", rateSelect.value);
        } else {
            reviewTitle.innerText = "❌ 答錯了，請仔細比對您的回答與標準答案：";
            reviewContent.innerHTML += retryBtnHtml;
            speechService.speak("答錯了，沒關係，請看畫面比對錯誤，再來一次！", rateSelect.value);
        }

        // 綁定按鈕點擊事件，必須由練習者親自按下才會重新挑戰
        document.getElementById('manualRetryBtn').addEventListener('click', retryCurrentQuestion);
    }
}

function retryCurrentQuestion() {
    reviewPanel.style.display = 'none';
    subQIndex = 0;
    selectedPathIndex = -1; // 💡 重置路線
    userSessionRecords = [];
    updateStatusDisplay();
    askSubQuestion(true);
}