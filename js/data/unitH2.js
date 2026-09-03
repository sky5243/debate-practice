/**
 * 【單元 H2】綜合回答（1、2）
 * 包含 3 個子題流程：判斷回答（承許/因不成立/不遍）、複述、立宗
 * 備註：若答案有多種可能 (如: 承許/因不成立)，則採 2D 陣列宣告，由系統自動啟動路徑鎖定。
 */
const q = ["判斷回答為何（承許/因不成立/不遍）？", "該回答的複述為何？", "該回答的立宗為何？"];
const sq = ["判斷回答為何，承許、因不成立或不遍", "該回答的複述為何", "該回答的立宗為何"];

export const unitH2 = [
    {
        statement: "聲音有法，應當是常法，因為是所作的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["不遍", "是所作的話不遍是常法", "是所作的話不遍是常法；聲音不是常法；聲音是所作"]
    },
    {
        statement: "瓶子有法，應當不是無常，因為是物質的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["不遍", "是物質的話不遍不是無常", "是物質的話不遍不是無常；瓶子是無常；瓶子是物質"]
    },
    {
        statement: "兔子角應當是常法，因為瓶子不是常法的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["不遍", "瓶子不是常法的話不遍兔子角是常法", "瓶子不是常法的話不遍兔子角是常法；兔子角不是常法；瓶子不是常法"]
    },
    {
        statement: "是心識的話應當遍是常法，因為聲音是無的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "聲音是無因不成立", "聲音不是無"]
    },
    {
        statement: "柱子有法，應當是法，因為是心識的緣故。",
        questions: q, speechQuestions: sq,
        answers: [
            ["承許", "承許柱子是法", "柱子是法"],
            ["因不成立", "柱子是心識因不成立", "柱子不是心識"]
        ]
    },
    {
        statement: "補特伽羅有法，應當不是實事，因為是色法的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "補特伽羅是色法因不成立", "補特伽羅不是色法"]
    },
    {
        statement: "遍智有法，應當是無，因為不是有的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "遍智不是有因不成立", "遍智是有"]
    },
    {
        statement: "是覺知的話應當遍是法，因為是常法的話遍是所知的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["承許", "承許是覺知的話遍是法", "是覺知的話遍是法"]
    },
    {
        statement: "是所知的話應當不遍是無，因為瓶子是物質的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["承許", "承許是所知的話不遍是無", "是所知的話不遍是無"]
    },
    {
        statement: "補特伽羅有法，應當是所知，因為是無常的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["承許", "承許補特伽羅是所知", "補特伽羅是所知"]
    },
    {
        statement: "遍智有法，應當是法，因為不是所作的緣故。",
        questions: q, speechQuestions: sq,
        answers: [
            ["承許", "承許遍智是法", "遍智是法"],
            ["因不成立", "遍智不是所作因不成立", "遍智是所作"]
        ]
    },
    {
        statement: "柱子有法，應當是常法，因為是無的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "柱子是無因不成立", "柱子不是無"]
    },
    {
        statement: "兔子角有法，應當不是常法，因為是成實的緣故。",
        questions: q, speechQuestions: sq,
        answers: [
            ["承許", "承許兔子角不是常法", "兔子角不是常法"],
            ["因不成立", "兔子角是成實因不成立", "兔子角不是成實"]
        ]
    },
    {
        statement: "瓶子有法，應當不是常法，因為不是物質的緣故。",
        questions: q, speechQuestions: sq,
        answers: [
            ["承許", "承許瓶子不是常法", "瓶子不是常法"],
            ["因不成立", "瓶子不是物質因不成立", "瓶子是物質"]
        ]
    },
    {
        statement: "不是所作的話應當遍是無，因為兔子角是無的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["不遍", "兔子角是無的話不遍不是所作的話遍是無", "兔子角是無的話不遍不是所作的話遍是無；不是所作的話不遍是無；兔子角是無"]
    },
    {
        statement: "瓶子應當是實事，因為是無的話遍是所知的緣故。",
        questions: q, speechQuestions: sq,
        answers: [
            ["承許", "承許瓶子是實事", "瓶子是實事"],
            ["因不成立", "是無的話遍是所知因不成立", "是無的話不遍是所知"]
        ]
    },
    {
        statement: "聲音有法，應當不是無，因為不是有的緣故。",
        questions: q, speechQuestions: sq,
        answers: [
            ["承許", "承許聲音不是無", "聲音不是無"],
            ["因不成立", "聲音不是有因不成立", "聲音是有"]
        ]
    },
    {
        statement: "是無我的話應當遍不是所知，因為是無常的話遍不是常法的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["不遍", "是無常的話遍不是常法的話不遍是無我的話遍不是所知", "是無常的話遍不是常法的話不遍是無我的話遍不是所知；是無我的話不遍不是所知；是無常的話遍不是常法"]
    },
    {
        statement: "不是物質的話應當遍不是心識，因為是法的話遍是成實的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["不遍", "是法的話遍是成實的話不遍不是物質的話遍不是心識", "是法的話遍是成實的話不遍不是物質的話遍不是心識；不是物質的話不遍不是心識；是法的話遍是成實"]
    },
    {
        statement: "是法的話應當不遍是所知，因為不是心識的話遍不是明了的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["不遍", "不是心識的話遍不是明了的話不遍是法的話不遍是所知", "不是心識的話遍不是明了的話不遍是法的話不遍是所知；是法的話遍是所知；不是心識的話遍不是明了"]
    },
    {
        statement: "補特伽羅有法，應當不是心識，因為不是無我的緣故。",
        questions: q, speechQuestions: sq,
        answers: [
            ["承許", "承許補特伽羅不是心識", "補特伽羅不是心識"],
            ["因不成立", "補特伽羅不是無我因不成立", "補特伽羅是無我"]
        ]
    },
    {
        statement: "兔子角應當是法，因為是法的話遍是無的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "是法的話遍是無因不成立", "是法的話不遍是無"]
    },
    {
        statement: "聲音有法，應當是心不相應行法，因為不是色法的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "聲音不是色法因不成立", "聲音是色法"]
    },
    {
        statement: "是實事的話應當遍不是常法，因為瓶子不是常法的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["承許", "承許是實事的話遍不是常法", "是實事的話遍不是常法"]
    },
    {
        statement: "補特伽羅應當是常法，因為兔子角是心識的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "兔子角是心識因不成立", "兔子角不是心識"]
    },
    {
        statement: "是覺知的話應當不遍不是無，因為瓶子是無我的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["不遍", "瓶子是無我的話不遍是覺知的話不遍不是無", "瓶子是無我的話不遍是覺知的話不遍不是無；是覺知的話遍不是無；瓶子是無我"]
    },
    {
        statement: "柱子應當不是法，因為補特伽羅是無的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "補特伽羅是無因不成立", "補特伽羅不是無"]
    },
    {
        statement: "是法的話應當遍是心不相應行法，因為不是物質的話遍是無的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "不是物質的話遍是無因不成立", "不是物質的話不遍是無"]
    },
    {
        statement: "不是法的話應當不遍不是常法，因為兔子角是物質的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["因不成立", "兔子角是物質因不成立", "兔子角不是物質"]
    },
    {
        statement: "是無我的話應當遍是無，因為是無我的話不遍不是所知的緣故。",
        questions: q, speechQuestions: sq,
        answers: ["不遍", "是無我的話不遍不是所知的話不遍是無我的話遍是無", "是無我的話不遍不是所知的話不遍是無我的話遍是無；是無我的話不遍是無；是無我的話不遍不是所知"]
    }
];