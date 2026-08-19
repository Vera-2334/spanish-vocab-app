#!/usr/bin/env node
// 词典批量升级脚本
// 用法：node scripts/upgrade-dict.cjs <单词列表文件>
// 每行一个单词，空格分隔。自动生成变位表、补冠词、替换旧词条。

const fs = require("fs")

// ============================================================
// 读取输入
// ============================================================

const inputFile = process.argv[2]
if (!inputFile) {
  console.log("用法: node scripts/upgrade-dict.cjs <单词列表>")
  console.log("每行格式: WORD 新中文释义")
  process.exit(1)
}

const input = fs.readFileSync(inputFile, "utf8").split("\n").filter(l => l.trim())
const upgrades = {}

for (const line of input) {
  const parts = line.trim().split(/\s+/)
  const word = parts[0]
  const chinese = parts.slice(1).join(" ") || ""
  upgrades[word] = chinese
}

console.log(`读取 ${Object.keys(upgrades).length} 个词`)

// ============================================================
// 工具函数
// ============================================================

function genArticle(word) {
  // 已知特殊词
  const specials = { problema: "el", agua: "el", mano: "la", mapa: "el", día: "el", foto: "la", moto: "la", radio: "la" }
  if (specials[word]) return specials[word]
  // 词尾推断
  if (/[oó]s?$|or$|aje$|ema$|ama$/.test(word)) return "el"
  if (/[aá]s?$|ción$|sión$|dad$|tad$|tud$|umbre$|ez$/i.test(word)) return "la"
  return "el"
}

function genPos(word) {
  if (/[aei]r$/.test(word)) return "V"
  if (/mente$/.test(word)) return "ADV"
  if (/^(a|ante|bajo|cabe|con|contra|de|desde|durante|en|entre|hacia|hasta|mediante|para|por|según|sin|so|sobre|tras|versus|vía)$/.test(word)) return "PREP"
  if (/^(y|e|ni|o|u|pero|sino|porque|pues|aunque|si|cuando|mientras|donde|como|cual|que)$/.test(word)) return "CONJ"
  return /[ao]s?$/.test(word) ? "ADJ" : "NM"
}

function genConjugation(word) {
  if (!/[aei]r$/.test(word)) return null
  const stem = word.slice(0, -2)
  if (word.endsWith("ar")) {
    return { present: { yo: stem + "o", tu: stem + "as", elEllaUsted: stem + "a", nosotros: stem + "amos", vosotros: stem + "áis", ellosEllasUstedes: stem + "an" }, preterite: { yo: stem + "é", tu: stem + "aste", elEllaUsted: stem + "ó", nosotros: stem + "amos", vosotros: stem + "asteis", ellosEllasUstedes: stem + "aron" }, imperfect: { yo: stem + "aba", tu: stem + "abas", elEllaUsted: stem + "aba", nosotros: stem + "ábamos", vosotros: stem + "abais", ellosEllasUstedes: stem + "aban" }, future: { yo: word + "é", tu: word + "ás", elEllaUsted: word + "á", nosotros: word + "emos", vosotros: word + "éis", ellosEllasUstedes: word + "án" }, subjunctive: { yo: stem + "e", tu: stem + "es", elEllaUsted: stem + "e", nosotros: stem + "emos", vosotros: stem + "éis", ellosEllasUstedes: stem + "en" }, imperative: { yo: "", tu: stem + "a", elEllaUsted: stem + "e", nosotros: stem + "emos", vosotros: stem + "ad", ellosEllasUstedes: stem + "en" }, isRegular: true }
  }
  if (word.endsWith("er")) {
    return { present: { yo: stem + "o", tu: stem + "es", elEllaUsted: stem + "e", nosotros: stem + "emos", vosotros: stem + "éis", ellosEllasUstedes: stem + "en" }, preterite: { yo: stem + "í", tu: stem + "iste", elEllaUsted: stem + "ió", nosotros: stem + "imos", vosotros: stem + "isteis", ellosEllasUstedes: stem + "ieron" }, imperfect: { yo: stem + "ía", tu: stem + "ías", elEllaUsted: stem + "ía", nosotros: stem + "íamos", vosotros: stem + "íais", ellosEllasUstedes: stem + "ían" }, future: { yo: word + "é", tu: word + "ás", elEllaUsted: word + "á", nosotros: word + "emos", vosotros: word + "éis", ellosEllasUstedes: word + "án" }, subjunctive: { yo: stem + "a", tu: stem + "as", elEllaUsted: stem + "a", nosotros: stem + "amos", vosotros: stem + "áis", ellosEllasUstedes: stem + "an" }, imperative: { yo: "", tu: stem + "e", elEllaUsted: stem + "a", nosotros: stem + "amos", vosotros: stem + "ed", ellosEllasUstedes: stem + "an" }, isRegular: true }
  }
  if (word.endsWith("ir")) {
    return { present: { yo: stem + "o", tu: stem + "es", elEllaUsted: stem + "e", nosotros: stem + "imos", vosotros: stem + "ís", ellosEllasUstedes: stem + "en" }, preterite: { yo: stem + "í", tu: stem + "iste", elEllaUsted: stem + "ió", nosotros: stem + "imos", vosotros: stem + "isteis", ellosEllasUstedes: stem + "ieron" }, imperfect: { yo: stem + "ía", tu: stem + "ías", elEllaUsted: stem + "ía", nosotros: stem + "íamos", vosotros: stem + "íais", ellosEllasUstedes: stem + "ían" }, future: { yo: word + "é", tu: word + "ás", elEllaUsted: word + "á", nosotros: word + "emos", vosotros: word + "éis", ellosEllasUstedes: word + "án" }, subjunctive: { yo: stem + "a", tu: stem + "as", elEllaUsted: stem + "a", nosotros: stem + "amos", vosotros: stem + "áis", ellosEllasUstedes: stem + "an" }, imperative: { yo: "", tu: stem + "e", elEllaUsted: stem + "a", nosotros: stem + "amos", vosotros: stem + "id", ellosEllasUstedes: stem + "an" }, isRegular: true }
  }
}

function genDefEs(word, chinese) {
  const pos = genPos(word)
  if (pos === "V") return "Acción o efecto de " + chinese.split("；")[0] + "."
  if (pos === "NM") return "Sustantivo masculino que se refiere a " + chinese.split("；")[0] + "."
  if (pos === "NF") return "Sustantivo femenino que se refiere a " + chinese.split("；")[0] + "."
  if (pos === "ADJ") return "Que tiene la cualidad de " + chinese.split("；")[0] + "."
  return "Palabra que significa " + chinese.split("；")[0] + "."
}

function genExamples(word, chinese) {
  const meanings = chinese.split("；")
  const m1 = meanings[0] || chinese
  const examples = []
  if (/[aei]r$/.test(word)) {
    const yo = word.slice(0, -2) + (word.endsWith("ar") ? "o" : "o")
    examples.push({ spanish: `Todos los días ${yo} después de cenar.`, chinese: `我每天晚饭后${m1}。` })
    examples.push({ spanish: `¿Has ${word.slice(0, -2)}ado ya lo que te pedí?`, chinese: `我要你${m1}的事做了吗？` })
  } else if (/[ao]s?$/.test(word) && genPos(word) === "ADJ") {
    examples.push({ spanish: `Es una persona muy ${word}.`, chinese: `他是个很${m1}的人。` })
    examples.push({ spanish: `Este lugar me parece bastante ${word}.`, chinese: `我觉得这个地方挺${m1}的。` })
  } else {
    const art = genPos(word) === "NM" ? "El" : genPos(word) === "NF" ? "La" : ""
    if (art) {
      examples.push({ spanish: `${art} ${word} es importante para mí.`, chinese: `${m1}对我很重要。` })
      examples.push({ spanish: `No encuentro ${art.toLowerCase()} ${word} que busco.`, chinese: `我找不到我要找的${m1}。` })
    } else {
      examples.push({ spanish: `Es una palabra común: ${word}.`, chinese: `这是一个常用词：${m1}。` })
    }
  }
  return examples
}

function buildEntry(word, chinese) {
  const pos = genPos(word)
  const article = pos === "NM" ? genArticle(word) : pos === "NF" ? genArticle(word) : ""
  const defEs = genDefEs(word, chinese)
  const examples = genExamples(word, chinese)
  const conj = genConjugation(word)

  let entry = `{article:"${article}",pos:"${pos}",chinese:"${chinese}",definitionEs:"${defEs}",examples:${JSON.stringify(examples)}`
  if (conj) entry += `,conjugation:${JSON.stringify(conj)}`
  entry += "}"
  return { key: word, entry }
}

// ============================================================
// 替换到词典文件
// ============================================================

const dictPath = "packages/database/src/dictionary.ts"
let src = fs.readFileSync(dictPath, "utf8")
const lines = src.split("\n")

let replaced = 0
for (const [word, chinese] of Object.entries(upgrades)) {
  if (!chinese) continue

  let startLine = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp("^  " + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":"))) {
      startLine = i; break
    }
  }
  if (startLine === -1) { console.log(word + " not found"); continue }

  let endLine = startLine + 1
  while (endLine < lines.length) {
    const l = lines[endLine]
    if (l.match(/^  ([\wáéíóúñü]+|"[^"]+"):/) || l.match(/^};/) || l.match(/^\/\/ 词形还原/)) break
    endLine++
  }

  const { entry } = buildEntry(word, chinese)
  const needsComma = lines[endLine - 1].endsWith(",")
  lines.splice(startLine, endLine - startLine, "  " + word + ":" + entry + (needsComma ? "," : ""))
  replaced++
  console.log("✅ " + word)
}

fs.writeFileSync(dictPath, lines.join("\n"))
console.log(`\n替换 ${replaced} 条，运行 npx next build 验证...`)