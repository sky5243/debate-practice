import { unitA } from './unitA.js';
import { unitB } from './unitB.js';
import { unitC } from './unitC.js';
import { unitD1 } from './unitD1.js';
import { unitD2 } from './unitD2.js';

export const unitConfigs = {
    "A": {
        name: "【單元 A】模組、格式用語",
        targetCount: 10,
        isSequential: false
    },
    "B": {
        name: "【單元 B】模組內容",
        targetCount: 10,
        isSequential: false
    },
    "C": {
        name: "【單元 C】論式的三段論述",
        targetCount: 10,
        isSequential: false
    },
    "D1": {
        name: "【單元 D1】三段論述推導",
        targetCount: 5,
        isSequential: true
    },
    "D2": {
        name: "【單元 D2】錯誤推論分析",
        targetCount: 5,
        isSequential: true
    }
};

export const questionBank = {
    "A": unitA,
    "B": unitB,
    "C": unitC,
    "D1": unitD1,
    "D2": unitD2
};

export function getQuestionList(unitKey) {
    return questionBank[unitKey] || [];
}

export function getUnitConfig(unitKey) {
    return unitConfigs[unitKey] || {
        name: `單元 ${unitKey}`,
        targetCount: 10,
        isSequential: false
    };
}