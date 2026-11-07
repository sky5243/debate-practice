export const unitK1 = [
    {
        id: "K1-01",
        statement: "聲音有法，應當是常法，因為是所作的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "聲音", 
            P: "是常法", 
            R: "是所作", 
            type: "standard_unpervasive",
            thesisTemplate: ["{E}不是常法", "{E}是所作"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K1-02",
        statement: "瓶子有法，應當是常法，因為是色法的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "瓶子", 
            P: "是常法", 
            R: "是色法", 
            type: "standard_unpervasive",
            thesisTemplate: ["{E}不是常法", "{E}是色法"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K1-03",
        statement: "柱子有法，應當是心識，因為是無常的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "柱子", 
            P: "是心識", 
            R: "是無常", 
            type: "standard_unpervasive",
            thesisTemplate: ["{E}不是心識", "{E}是無常"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K1-04",
        statement: "分別心有法，應當是常法，因為不是色法的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "分別心", 
            P: "是常法", 
            R: "不是色法", 
            type: "standard_unpervasive",
            thesisTemplate: ["{E}不是常法", "{E}不是色法"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K1-05",
        statement: "是所知的話應當遍是常法",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "", 
            P: "是常法", 
            R: "是所知", 
            type: "why_unpervasive",
            thesisTemplate: ["{E}不是常法", "{E}是所知"]
        },
        answers: ["何以故", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K1-06",
        statement: "是所知的話應當遍是常法，因為是無常的話遍是色法的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "", 
            P: "是色法", 
            R: "是無常", 
            type: "reason_unestablished",
            thesisTemplate: ["{E}是無常", "{E}不是色法"]
        },
        answers: ["因不成立", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K1-07",
        statement: "是色法的話應當不遍不是無常",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "", 
            P: "不是無常", 
            R: "是色法", 
            type: "accept_unpervasive",
            thesisTemplate: ["{E}是色法", "{E}是無常"]
        },
        answers: ["承許", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K1-08",
        statement: "瓶子有法，應當不是所知，因為是無常的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "瓶子", 
            P: "不是所知", 
            R: "是無常", 
            type: "standard_unpervasive",
            thesisTemplate: ["{E}是無常", "{E}是所知"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K1-09",
        statement: "遍智有法，應當不是無我，因為不是心不相應行法的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "遍智", 
            P: "不是無我", 
            R: "不是心不相應行法", 
            type: "standard_unpervasive",
            thesisTemplate: ["{E}不是心不相應行法", "{E}是無我"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K1-10",
        statement: "虛空有法，應當不是法，因為不是心識的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "虛空", 
            P: "不是法", 
            R: "不是心識", 
            type: "standard_unpervasive",
            thesisTemplate: ["{E}是法", "{E}不是心識"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    }
];
