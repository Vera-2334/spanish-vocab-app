// ============================================================
// DeepSeek 词典生成 — 单词不在词典时，用 LLM 生成释义/变位/例句
// ============================================================
// 依赖环境变量 DEEPSEEK_API_KEY（Vercel 生产环境已配置）

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
const MODEL = "deepseek-chat"

const SYSTEM_PROMPT = `你是西班牙语词典编辑。给定一个西班牙语单词（可能带定冠词 el/la/los/las，也可能漏写重音），返回一个严格的 JSON 对象（不要 markdown 代码块、不要多余文字），字段如下：
{
  "word": "规范拼写的单词原形（补全正确重音，不带冠词；如输入 rapido 应返回 rápido）",
  "chinese": "中文释义，多个义项用；分隔",
  "definitionEs": "简洁的西班牙语释义（用西语解释该词）",
  "pos": "NM|NF|NC|V|ADJ|ADV|PREP|CONJ|OTHER 之一",
  "article": "名词的定冠词 el 或 la；非名词填空字符串 \"\"",
  "feminine": "双性形容词的阴性形式；其他词性省略该字段",
  "examples": [{"spanish":"一句包含该词的西语句子","chinese":"中文翻译"}]（2-3 条）,
  "conjugation": "动词时给出完整变位对象，包含 present/preterite/imperfect/future/subjunctive/imperative/conditional 七个时态，每个时态含 yo/tu/elEllaUsted/nosotros/vosotros/ellosEllasUstedes 六个人称，另有 isRegular 布尔值（规则动词 true）；非动词为 null"
}
只输出 JSON，不要任何解释。`

export interface AiEntry {
  word?: string
  chinese: string
  definitionEs: string
  pos: string
  article: string
  feminine?: string
  examples: Array<{ spanish: string; chinese: string }>
  conjugation?: any
}

// 清洗 LLM 返回，保证字段安全
function normalizeAiEntry(raw: any, word: string): AiEntry | null {
  if (!raw || typeof raw !== "object") return null
  if (!raw.chinese && !raw.definitionEs && !raw.examples) return null

  const pos = typeof raw.pos === "string" && ["NM", "NF", "NC", "V", "ADJ", "ADV", "PREP", "CONJ", "OTHER"].includes(raw.pos)
    ? raw.pos
    : "OTHER"

  const examples = Array.isArray(raw.examples)
    ? raw.examples
        .filter((e: any) => e && typeof e.spanish === "string" && typeof e.chinese === "string")
        .slice(0, 3)
        .map((e: any) => ({ spanish: e.spanish, chinese: e.chinese }))
    : []

  // 变位仅对动词保留，且必须带 present 才认为有效
  const conjugation =
    pos === "V" && raw.conjugation && typeof raw.conjugation === "object" && raw.conjugation.present
      ? raw.conjugation
      : undefined

  return {
    word: typeof raw.word === "string" ? raw.word : undefined,
    chinese: typeof raw.chinese === "string" ? raw.chinese : "",
    definitionEs: typeof raw.definitionEs === "string" ? raw.definitionEs : "",
    pos,
    article: typeof raw.article === "string" ? raw.article : "",
    feminine: typeof raw.feminine === "string" ? raw.feminine : undefined,
    examples,
    conjugation,
  }
}

export async function enrichWithAI(word: string): Promise<AiEntry | null> {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) return null

  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: word },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    })

    if (!resp.ok) return null
    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    return normalizeAiEntry(parsed, word)
  } catch {
    return null
  }
}
