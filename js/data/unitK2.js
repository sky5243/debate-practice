export const unitK2 = [
    {
        id: "K2-01",
        statement: "是無常的話應當不遍是色法，因為兔子角是無的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "", 
            P: "是色法", 
            R: "是無常", 
            type: "accept_unpervasive",
            thesisTemplate: ["{E}不是色法", "{E}是無常"]
        },
        answers: ["承許", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K2-02",
        statement: "瓶子應當是無，因為兔子角是無的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "", 
            type: "dummy_example", 
            exampleRule: "any_valid", // 法相表內任何合法名詞皆可
            thesisTemplate: ["瓶子不是無", "兔子角是無"] 
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K2-03",
        statement: "瓶子有法，是色法的話應當遍是心識，因為是無的話遍是無我的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "瓶子", 
            type: "dummy_example", 
            exampleRule: "any_valid", 
            thesisTemplate: ["是色法的話不遍是心識", "是無的話遍是無我"] 
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K2-04",
        statement: "聲音有法，是無常的話應當遍是心不相應行法，因為是物質的話遍是覺知的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "聲音", 
            P: "是覺知", 
            R: "是物質", 
            type: "reason_unestablished",
            thesisTemplate: ["{E}不是覺知", "{E}是物質"]
        },
        answers: ["因不成立", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K2-05",
        statement: "所知有法，是常法的話應當遍是他，因為是他的話遍不是無的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "所知", 
            type: "accept_no_example" 
        }, // 本題無不遍例子，第2、3問照常提問，回答空白或「無法安立」通過
        answers: ["承許", "", ""]
    },
    {
        id: "K2-06",
        statement: "無常有法，是所知的話應當不遍是他，因為瓶子是他的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "無常", 
            P: "是無常", 
            R: "是所知", 
            type: "accept_unpervasive",
            thesisTemplate: ["{E}是所知", "{E}不是無常"]
        },
        answers: ["承許", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K2-07",
        statement: "聲音有法，他應當是常法，因為是常法的話遍是所知的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "聲音", 
            type: "hybrid_unpervasive",
            P: "是常法", 
            thesisTemplate: ["{E}不是常法", "是常法的話遍是所知"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K2-08",
        statement: "無有法，瓶子應當是他，因為是他的話遍是有的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "無", 
            P: "是有", 
            R: "是無", 
            type: "reason_unestablished",
            thesisTemplate: ["{E}是無", "{E}不是有"]
        },
        answers: ["因不成立", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K2-09",
        statement: "柱子有法，是無常的話應當遍是色法，因為他是無我的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "柱子", 
            type: "propositional_predicate",
            R: "是無我", 
            exampleRule: "only_R", // 例子只需符合因(無我)
            thesisTemplate: ["{E}是無我", "是無常的話不遍是色法"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    },
    {
        id: "K2-10",
        statement: "實事有法，是他的話應當遍不是無常，因為是所作的話不遍不是他的緣故。",
        questions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        speechQuestions: ["回答", "請舉不遍的例子", "例子代表的立宗"],
        logicParams: { 
            subject: "實事", 
            type: "complex_unpervasive",
            exampleRule: "overlap_with_impermanent", 
            thesisTemplate: ["是{E}的話不遍不是無常", "是所作的話不遍不是{E}"]
        },
        answers: ["不遍", { type: "ai_eval", evalGoal: "example" }, { type: "ai_eval", evalGoal: "thesis" }]
    }
];
