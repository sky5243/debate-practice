# 專案升級目標：佛教攝類學語音辯論（基於 Proxy 架構的多模態重構）

## ⚠️ 專案現有架構與最高開發原則
1. **穩定舊版保護**：`index.html`, `main.js`, `speechService.js`（請絕對不要修改這三個檔案，必須保持舊系統原貌運作）。
2. **待重構的 Live 版（本次修改目標）**：`index_live.html`, `mainLive.js`, `speechServiceLive.js`。這是本次的重構沙盒，請直接覆寫這三個檔案，清除裡面殘留的錯誤 WebSocket 或舊版 Web Speech API 邏輯。
3. **後端 Proxy 伺服器**：針對 `gemini-stt-proxy` 資料夾進行修改，用於隱藏 Google API Key 並處理音訊轉發。

## 🎯 本次重構具體任務

### 1. 前端重構 (`index_live.html`, `mainLive.js`, `speechServiceLive.js`)
* **移除舊邏輯**：徹底清除這三個檔案中所有的 Web Speech API、WebSocket 以及針對同音字手動替換（`replace`）的硬編碼字典程式碼。
* **改為錄音直傳**：實作 `MediaRecorder` 錄音功能。當使用者按住錄音、放開結束後（即使語音極短，只有一個「無」或「有」字），將音訊包裝為 `Blob`（如 `.webm` 或 `.wav`），透過 `fetch` POST 傳送到本機的 `gemini-stt-proxy` 後端 API。
* **介面更新**：確保 `index_live.html` 有對應的錄音按鈕狀態（錄音中、AI 思考中）與完整的錯誤訊息顯示區塊。

### 2. 後端重構 (`gemini-stt-proxy` 內的 Node.js 程式)
* **音訊接收與處理**：請設定路由（如 `/api/chat`），並使用 `multer` 等套件來接收前端傳來的音訊檔，然後將音訊檔與 Prompt 一同發送給 Gemini 進行多模態解析。
* **強制升級官方 SDK**：請確保 `package.json` 使用最新版的 Google 官方 Node.js 支援套件（如官方推薦的最新 SDK），**絕對禁止使用已被廢棄的 `google-generativeai` 舊版函式庫**。
* **模型選型與環境變數（高免費額度優先）**：
  請勿在程式碼中硬編碼模型名稱。請建立 `.env` 檔案來管理模型版本與 API Key。
  由於本網頁會公開給多人使用，必須確保 API 呼叫額度充足。請在 `.env` 預設填入 Google 官方目前提供「最高免費額度」且支援多模態的 Flash 家族模型（例如 `GEMINI_MODEL_VERSION=gemini-1.5-flash` 或 `gemini-2.0-flash`）。**絕對不要預設使用 Pro 家族模型**（免費額度極低）。
* **防護機制（Quota Exceeded 處理）**：
  在呼叫 Gemini API 時，請務必攔截 `429 Too Many Requests` 的錯誤。當發生額度耗盡或頻率過高時，請回傳友善的錯誤訊息給前端（例如：「目前使用人數較多，API 額度暫時達上限，請稍後再試。」），避免伺服器崩潰。

### 3. 設定精準的 System Prompt（領域知識注入）
請在後端呼叫 Gemini 的程式碼中，強制寫入以下 System Prompt 作為 Context：
> 「你是一位嚴謹的佛教攝類學辯論導師。請直接聆聽傳入的音訊內容。使用者可能會回答極短的單字（如『無』、『有』、『是』、『非』），或使用專業術語（如：承許、不許、應成、反體、成物、所知、遍充、常與無常等）。請直接依據攝類學的語意脈絡，精準判斷使用者的真實意圖（即使發音帶有腔調或類似同音字，請自動在理解時糾正），並根據理路給出下一輪的辯駁與指導文字。」

### 4. 自動環境配置與除錯
* 請檢查 `gemini-stt-proxy` 內的 `package.json`，若缺少處理上傳檔案 (`multer`)、處理跨域 (`cors`) 或讀取環境變數 (`dotenv`) 等必要套件，請自動修改並在 Terminal 執行 `npm install`。