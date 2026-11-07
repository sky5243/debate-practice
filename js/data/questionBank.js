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
import { unitG1 } from './unitG1.js';
import { unitG2 } from './unitG2.js';
import { unitH1 } from './unitH1.js';
import { unitH2 } from './unitH2.js';
import { unitI1 } from './unitI1.js';
import { unitI2 } from './unitI2.js';
import { unitJ1 } from './unitJ1.js';
import { unitJ2 } from './unitJ2.js';
import { unitK1 } from './unitK1.js';
import { unitK2 } from './unitK2.js';

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
        isSequential: false,
        showStatement: true
    },
    "D2": {
        name: "【單元 D2】錯誤推論分析",
        targetCount: 5,
        isSequential: false,
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
    "G1": {
        name: "【單元 G1】四種回答——複述",
        targetCount: 10,
        isSequential: false,
        showStatement: false 
    },
    "G2": {
        name: "【單元 G2】四種回答——立宗",
        targetCount: 10,
        isSequential: false,
        showStatement: false 
    },
    "H1": {
        name: "【單元 H1】綜合回答",
        targetCount: 10,
        isSequential: false,
        showStatement: false 
    },
    "H2": { 
        name: "【單元 H2】綜合回答", 
        targetCount: 10, 
        isSequential: false, 
        showStatement: false 
    },
    "I1": { 
        name: "【單元 I1】綜合回答——無效有法", 
        targetCount: 10, 
        isSequential: false, 
        showStatement: false 
    },
    "I2": { 
        name: "【單元 I2】綜合回答——無效有法（含因/周遍）", 
        targetCount: 10, 
        isSequential: false, 
        showStatement: false 
    },
    "J1": { 
        name: "【單元 J1】綜合回答——他聲", 
        targetCount: 10, 
        isSequential: false, 
        showStatement: false 
    },
    "J2": { 
        name: "【單元 J2】綜合回答——他聲（含因/周遍）", 
        targetCount: 10, 
        isSequential: false, 
        showStatement: false 
    },
    "K1": {
        name: "【單元 K1】不遍的例子（1、2）",
        targetCount: 10,
        isSequential: false,
        showStatement: false
    },
    "K2": {
        name: "【單元 K2】不遍的例子——含無效有法、他聲（1、2）",
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
    "G1": unitG1,
    "G2": unitG2,
    "H1": unitH1,
    "H2": unitH2,
    "I1": unitI1,
    "I2": unitI2,
    "J1": unitJ1,
    "J2": unitJ2,
    "K1": unitK1,
    "K2": unitK2
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
