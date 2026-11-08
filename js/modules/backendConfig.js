// 後端網址設定：在 localhost / 127.0.0.1 開啟網頁時自動連本機後端，其餘（如 GitHub Pages）一律連 Render
const RENDER_HOST = 'debate-practice-8h3m.onrender.com';
const LOCAL_HOST = 'localhost:3000';

function isLocalPage() {
    if (typeof location === 'undefined') {
        // Node 測試環境：可用環境變數 USE_LOCAL_BACKEND=1 改連本機
        return typeof process !== 'undefined' && process.env && process.env.USE_LOCAL_BACKEND === '1';
    }
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

const useLocal = isLocalPage();

export const WS_URL = useLocal ? `ws://${LOCAL_HOST}` : `wss://${RENDER_HOST}`;
export const HTTP_BASE = useLocal ? `http://${LOCAL_HOST}` : `https://${RENDER_HOST}`;
export const EVALUATE_URL = `${HTTP_BASE}/api/evaluate-debate`;
