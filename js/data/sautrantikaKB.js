/**
 * 佛教經部宗與賽倉攝類學法相邊界知識庫 (Sautrantika Knowledge Base)
 * 依據法相表：
 * - 無我（補特伽羅無我）涵蓋全部
 * - 有（量所緣 / 所知、法、境、成實）vs 無（兔子角、龜毛、虛空花、石女兒）
 * - 有分為：常法（無實事/非所作）vs 無常（實事/所作/自相/有為/勝義諦）
 * - 無常分為：色法（物質）、心識（覺知/明了）、心不相應行法
 */

// 1. 法相表基本名詞分類
export const KB_ENTITIES = {
    // 【無】（非存在、無事、非所知、非法）
    nonExistent: [
        "兔子角", "兔角", "兔子的角", "龜毛", "虛空花", "石女兒"
    ],

    // 【常法】（無實事、非所作、共相、無為法、世俗諦）
    permanent: [
        // 事例
        "無為的虛空", "虛空",
        // 抽象法相與共相（經部宗特殊常法）
        "有", "所知", "法", "境", "成實", 
        "無實事", "非實事", "非所作", "共相", "無為法", "世俗諦", "常法", 
        "補特伽羅無我", "法無我", "無我"
    ],

    // 【無常 - 色法】（堪能為色、物質）
    form: [
        "顏色", "聲音", "瓶子", "金瓶", "柱子", "木柱", "栴檀的氣味", "香", "味", "觸",
        "眼根", "耳根", "鼻根", "舌根", "身根",
        "白色", "紅色", "黃色", "藍色", "金", "木", "水", "火", "土", "金子"
    ],

    // 【無常 - 心識】（清晰且明了、覺知）
    consciousness: [
        "現量", "比量", "分別心", "無分別心", "遍智", "眼識", "耳識", "鼻識", "舌識", "身識", "意識",
        "貪心", "瞋心", "信心", "覺知", "明了", "心識"
    ],

    // 【無常 - 心不相應行法】
    nonAssociated: [
        "補特伽羅", "時間", "佛聖者", "人", "有情", "士夫", "眾生",
        "生", "住", "異", "滅", "得", "命根"
    ]
};

/**
 * 查詢名詞的法相屬性
 * @param {string} rawNoun 
 * @returns {object|null} 屬性物件
 */
export function getNounClassification(rawNoun) {
    if (!rawNoun) return null;
    const name = rawNoun.trim();

    // 規則 1：任何法的「反體」、「非反」、「是反」都是常法
    if (name.endsWith("的反體") || name.endsWith("反體") || 
        name.endsWith("的非反") || name.endsWith("非反") || 
        name.endsWith("的是反") || name.endsWith("是反")) {
        return {
            name,
            isExistent: true,
            isNone: false,
            isPermanent: true,
            isImpermanent: false,
            isForm: false,
            isConsciousness: false,
            isNonAssociated: false,
            category: "常法",
            subCategory: "反體/共相"
        };
    }

    // 規則 2：查表 比對
    if (KB_ENTITIES.nonExistent.includes(name)) {
        return {
            name,
            isExistent: false,
            isNone: true,
            isPermanent: false,
            isImpermanent: false,
            isForm: false,
            isConsciousness: false,
            isNonAssociated: false,
            category: "無",
            subCategory: "非所知"
        };
    }

    if (KB_ENTITIES.permanent.includes(name)) {
        return {
            name,
            isExistent: true,
            isNone: false,
            isPermanent: true,
            isImpermanent: false,
            isForm: false,
            isConsciousness: false,
            isNonAssociated: false,
            category: "常法",
            subCategory: "無為法/共相"
        };
    }

    if (KB_ENTITIES.form.includes(name)) {
        return {
            name,
            isExistent: true,
            isNone: false,
            isPermanent: false,
            isImpermanent: true,
            isForm: true,
            isConsciousness: false,
            isNonAssociated: false,
            category: "無常",
            subCategory: "色法"
        };
    }

    if (KB_ENTITIES.consciousness.includes(name)) {
        return {
            name,
            isExistent: true,
            isNone: false,
            isPermanent: false,
            isImpermanent: true,
            isForm: false,
            isConsciousness: true,
            isNonAssociated: false,
            category: "無常",
            subCategory: "心識"
        };
    }

    if (KB_ENTITIES.nonAssociated.includes(name)) {
        return {
            name,
            isExistent: true,
            isNone: false,
            isPermanent: false,
            isImpermanent: true,
            isForm: false,
            isConsciousness: false,
            isNonAssociated: true,
            category: "無常",
            subCategory: "心不相應行法"
        };
    }

    // 表外詞彙
    return null;
}

/**
 * 本地邊界檢驗：判斷舉出的事例是否符合題目要求
 * @param {string} noun 純事例名詞 (例如 "瓶子")
 * @param {object} logicParams 題目的邏輯條件
 * @param {string} subject 所諍事 (避免舉出與所諍事完全相同的事例)
 * @returns {object} { matched: boolean, isCorrect: boolean, feedback: string }
 */
export function evaluateExampleWithKB(noun, logicParams, subject = "") {
    const classification = getNounClassification(noun);
    if (!classification) {
        // 未在法相表中，交由 AI 二次判定
        return { matched: false };
    }

    // 提醒：盡量不要舉和所諍事一樣的例子
    if (subject && (noun === subject || noun.includes(subject))) {
        return {
            matched: true,
            isCorrect: false,
            feedback: `請盡量不要舉和原論式所諍事（${subject}）一樣的例子，請嘗試舉其他事例！`
        };
    }

    const rule = logicParams.exampleRule;
    const type = logicParams.type;

    // 1. 任何合法事例皆可 (無效有法，如 K2-02, K2-03)
    if (rule === "any_valid") {
        return {
            matched: true,
            isCorrect: true,
            feedback: "正確！舉出了法相表內的合法事例。"
        };
    }

    // 2. 只需符合因 R (如 K2-09: R 是無我)
    if (rule === "only_R") {
        if (logicParams.R === "是無我") {
            // 一切法與無法皆是無我
            return { matched: true, isCorrect: true, feedback: "正確！符合無我的事例。" };
        }
    }

    // 3. 有無常的範圍 (如 K2-10: 色法、心識、心不相應行法)
    if (rule === "overlap_with_impermanent") {
        if (classification.isImpermanent || ["色法", "心識", "心不相應行法"].includes(noun)) {
            return { matched: true, isCorrect: true, feedback: "正確！符合無常範疇的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子未涵蓋無常的範疇。" };
    }

    // 4. K1-06 / K2-04 / K2-08: 因不成立的不遍例
    if (type === "reason_unestablished") {
        // K1-06: 因是「是無常的話遍是色法」-> 反例必須是「是無常，但不是色法」(心識或心不相應行法)
        if (logicParams.R === "是無常" && logicParams.P === "是色法") {
            if (classification.isImpermanent && !classification.isForm) {
                return { matched: true, isCorrect: true, feedback: "正確！符合無常但不是色法（心識/心不相應行法）的事例。" };
            }
            return { matched: true, isCorrect: false, feedback: "所舉例子並非「是無常但不是色法」的事例。" };
        }
        // K2-04: 因是「是物質的話遍是覺知」-> 反例必須是「是物質(色法)，但不是覺知(心識)」
        if (logicParams.R === "是物質" && logicParams.P === "是覺知") {
            if (classification.isForm) {
                return { matched: true, isCorrect: true, feedback: "正確！符合是物質（色法）但不是覺知的事例。" };
            }
            return { matched: true, isCorrect: false, feedback: "所舉例子並非物質（色法）的事例。" };
        }
        // K2-08: 因是「是他的話遍是有的緣故」，有法是「無」，瓶子是「他」-> 反例是「是無但不是有」(無的事例，如兔子角)
        if (logicParams.R === "是無" && logicParams.P === "是有") {
            if (classification.isNone) {
                return { matched: true, isCorrect: true, feedback: "正確！符合「無」的事例。" };
            }
            return { matched: true, isCorrect: false, feedback: "所舉例子必須是「無」（如兔子角）的事例。" };
        }
    }

    // 5. 承許但有不遍例 (如 K1-07, K2-01, K2-06)
    if (type === "accept_unpervasive") {
        // K1-07:「是色法的話應當不遍不是無常」-> 例子是色法 (是色法且是無常)
        if (logicParams.R === "是色法") {
            if (classification.isForm) {
                return { matched: true, isCorrect: true, feedback: "正確！符合色法的事例。" };
            }
            return { matched: true, isCorrect: false, feedback: "所舉例子必須是色法。" };
        }
        // K2-01:「是無常的話應當不遍是色法」-> 例子是無常但不是色法 (心識/心不相應行法)
        if (logicParams.R === "是無常" && logicParams.P === "是色法") {
            if (classification.isImpermanent && !classification.isForm) {
                return { matched: true, isCorrect: true, feedback: "正確！符合無常且非色法的事例。" };
            }
            return { matched: true, isCorrect: false, feedback: "所舉例子必須是無常且非色法（如遍智、補特伽羅）。" };
        }
        // K2-06:「是所知的話應當不遍是他（無常）」-> 例子是所知且非常法(即常法)
        if (logicParams.R === "是所知" && logicParams.P === "是無常") {
            if (classification.isPermanent) {
                return { matched: true, isCorrect: true, feedback: "正確！符合常法的事例。" };
            }
            return { matched: true, isCorrect: false, feedback: "所舉例子必須是常法（如虛空）。" };
        }
    }

    // 6. K1-05: 何以故（周遍為「是所知的話應當遍是常法」）
    if (type === "why_unpervasive") {
        // 反例：是所知但不是常法 -> 即無常（色法、心識、心不相應行法）
        if (classification.isImpermanent) {
            return { matched: true, isCorrect: true, feedback: "正確！符合是所知但非常法（無常）的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子必須是所知中的無常事例（如瓶子、聲音、遍智）。" };
    }

    // 7. 標準不遍 (standard_unpervasive) 或 hybrid_unpervasive
    // 必須符合「是因 R」且「不是宗法 P」
    // K1-01: R 是所作(無常), P 是常法 -> 必須是無常且非常法 (無常皆可)
    if (logicParams.R === "是所作" && logicParams.P === "是常法") {
        if (classification.isImpermanent) {
            return { matched: true, isCorrect: true, feedback: "正確！符合是所作（無常）的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子必須是所作（無常）的事例。" };
    }
    // K1-02: R 是色法, P 是常法 -> 必須是色法 (色法皆可)
    if (logicParams.R === "是色法" && logicParams.P === "是常法") {
        if (classification.isForm) {
            return { matched: true, isCorrect: true, feedback: "正確！符合色法的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子必須是色法的事例。" };
    }
    // K1-03: R 是無常, P 是心識 -> 必須是無常且非心識 (色法或心不相應行法)
    if (logicParams.R === "是無常" && logicParams.P === "是心識") {
        if (classification.isImpermanent && !classification.isConsciousness) {
            return { matched: true, isCorrect: true, feedback: "正確！符合無常且非心識（色法或心不相應行法）的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子必須是無常且非心識（如瓶子、補特伽羅）。" };
    }
    // K1-04: R 不是色法, P 是常法 -> 必須非色法且非常法 (心識、心不相應行法、無)
    if (logicParams.R === "不是色法" && logicParams.P === "是常法") {
        if ((classification.isImpermanent && !classification.isForm) || classification.isNone) {
            return { matched: true, isCorrect: true, feedback: "正確！符合非色法且非常法（心識、心不相應行法或無）的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子必須是非色法且非常法（如遍智、補特伽羅或兔子角）。" };
    }
    // K1-08: R 是無常, P 不是所知 -> 必須是無常且是所知 (無常皆可)
    if (logicParams.R === "是無常" && logicParams.P === "不是所知") {
        if (classification.isImpermanent) {
            return { matched: true, isCorrect: true, feedback: "正確！符合無常且是所知的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子必須是無常的事例。" };
    }
    // K1-09: R 不是心不相應行法, P 不是無我 -> 必須非心不相應行法且是無我 (色法、心識、常法、無)
    if (logicParams.R === "不是心不相應行法" && logicParams.P === "不是無我") {
        if (!classification.isNonAssociated) {
            return { matched: true, isCorrect: true, feedback: "正確！符合非心不相應行法且是無我的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子不可為心不相應行法。" };
    }
    // K1-10: R 不是心識, P 不是法 -> 必須非心識且是法 (色法、心不相應行法、常法)
    if (logicParams.R === "不是心識" && logicParams.P === "不是法") {
        if (classification.isExistent && !classification.isConsciousness) {
            return { matched: true, isCorrect: true, feedback: "正確！符合非心識且是法的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子必須是法且非心識（如瓶子、柱子、虛空）。" };
    }
    // K2-07: 他應當是常法，因為是常法的話遍是所知的緣故 -> 必須非常法 (無常或無)
    if (logicParams.type === "hybrid_unpervasive" && logicParams.P === "是常法") {
        if (classification.isImpermanent || classification.isNone) {
            return { matched: true, isCorrect: true, feedback: "正確！符合非常法（無常或無）的事例。" };
        }
        return { matched: true, isCorrect: false, feedback: "所舉例子必須是非常法（如瓶子、兔子角）。" };
    }

    // 預設 fallback
    return { matched: false };
}
