import { unitA } from './unitA.js';
import { unitB } from './unitB.js';
import { unitC } from './unitC.js';

export const questionBank = {
    "A": unitA,
    "B": unitB,
    "C": unitC
};

export function getQuestionList(unitKey) {
    return questionBank[unitKey] || [];
}
