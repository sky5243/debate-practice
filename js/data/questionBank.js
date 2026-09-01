import { unitA } from './unitA.js';
import { unitB1 } from './unitB1.js';
import { unitB2 } from './unitB2.js';
import { unitC } from './unitC.js';
import { unitD1 } from './unitD1.js';
import { unitD2 } from './unitD2.js';
import { unitE1, unitE1Text } from './unitE1.js';
import { unitE2, unitE2TreeData } from './unitE2.js';
import { unitF1 } from './unitF1.js';
import { unitF2 } from './unitF2.js';
// 💡 1. 匯入單元 G1,G2
import { unitG1 } from './unitG1.js';
import { unitG2 } from './unitG2.js'; // 新增這一行

export const unitConfigs = {
    "A": {
        name: "【單元 A】模組、格式用語",
        targetCount: 10,
        isSequential: false,
        showStatement: false
    },
    "B1": {
        name: "【單元 B1】模組內容（去格式用語）",
        targetCount: 10,
        isSequential: false,
        showStatement: false
    },
    "B2": {
        name: "【單元 B2】模組內容（模組安立）",
        targetCount: 10,
        isSequential: false,
        showStatement: false
    },
    "C": {
        name: "【單元 C】論式的三段論述",
        targetCount: 10,
        isSequential: false,
        showStatement: false
    },
    "D1": {
        name: "【單元 D1】三段論述推導",
        targetCount: 5,
        isSequential: true,
        showStatement: true
    },
    "D2": {
        name: "【單元 D2】錯誤推論分析",
        targetCount: 5,
        isSequential: true,
        showStatement: true
    },
    "E1": {
        name: "【單元 E1】法相自宗背誦",
        mode: "recitation",
        targetTime: 20,
        targetRepeatCount: 300,
        text: unitE1Text
    },
    "E2": {
        name: "【單元 E2】所知樹狀圖",
        targetCount: 20,
        isSequential: false,
        showStatement: false,
        hideQuestionText: true,
        hasTreeDiagram: true
    },
    "F1": {
        name: "【單元 F1】三段論述——一般法相",
        targetCount: 5,
        isSequential: false,
        showStatement: false
    },
    "F2": {
        name: "【單元 F2】錯誤推論分析——一般法相",
        targetCount: 5,
        isSequential: false,
        showStatement: false
    },
    // 💡 2. 新增單元 G1 設定 (目標 10 題，隨機抽題，且依規則不在畫面上顯示論式)
    "G1": {
        name: "【單元 G1】四種回答——複述",
        targetCount: 10,
        isSequential: false,
        showStatement: false 
    },
    "G2": { // 新增這段 G2 的設定
        name: "【單元 G2】四種回答——立宗",
        targetCount: 10,
        isSequential: false,
        showStatement: false 
    }
};

export const questionBank = {
    "A": unitA,
    "B1": unitB1,
    "B2": unitB2,
    "C": unitC,
    "D1": unitD1,
    "D2": unitD2,
    "E1": unitE1,
    "E2": unitE2,
    "F1": unitF1,
    "F2": unitF2,
    // 💡 3. 將 G1 加入題庫對應表
    "G1": unitG1,
    "G2": unitG2 // 新增這一行
};

export function getQuestionList(unitKey) {
    return questionBank[unitKey] || [];
}

export function getUnitConfig(unitKey) {
    return unitConfigs[unitKey] || {
        name: `單元 ${unitKey}`,
        targetCount: 10,
        isSequential: false,
        showStatement: false
    };
}

export { unitE2TreeData };