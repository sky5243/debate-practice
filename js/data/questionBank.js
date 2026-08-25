import { unitA } from './unitA.js';
import { unitB } from './unitB.js';
import { unitC } from './unitC.js';
import { unitD1 } from './unitD1.js';
import { unitD2 } from './unitD2.js';
import { unitE1, unitE1Text } from './unitE1.js';

export const unitConfigs = {
    "A": {
        name: "【單元 A】模組、格式用語",
        targetCount: 10,
        isSequential: false,
        showStatement: false
    },
    "B": {
        name: "【單元 B】模組內容",
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
    }
};

export const questionBank = {
    "A": unitA,
    "B": unitB,
    "C": unitC,
    "D1": unitD1,
    "D2": unitD2,
    "E1": unitE1
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