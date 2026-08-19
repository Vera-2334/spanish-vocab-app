#!/usr/bin/env node
// 词典修复脚本
// 1. 动词补 conditional（条件式）时态 —— 从 future 时态词干推导（规则/不规则均适用）
// 2. 形容词阴阳性合并 —— -o 结尾为主条目，加 feminine 字段，删除对应 -a 条目

const fs = require("fs")
const dictPath = "packages/database/src/dictionary.ts"
const src = fs.readFileSync(dictPath, "utf8")

// ============================================================
// 切分：header（含 const DICT = {） / body（词条） / footer（含 } 及之后）
// ============================================================
const dictDeclStart = src.indexOf("const DICT")
const objOpen = src.indexOf("{", dictDeclStart)
const footerStart = src.indexOf("// 词形还原")
const objClose = src.lastIndexOf("}", footerStart)

const header = src.slice(0, objOpen + 1)
const bodySrc = src.slice(objOpen + 1, objClose)
const footer = src.slice(objClose)

// ============================================================
// 解析 DICT
// ============================================================
const DICT = eval("({" + bodySrc + "})")

// ============================================================
// 1. 补 conditional（条件式 = future 词干 + 条件词尾）
// ============================================================
function genConditional(fut) {
  // 词干：从 future 的任一形式去掉末尾重音元音 é/á
  const anyForm = fut.yo || fut.elEllaUsted || ""
  const stem = anyForm.replace(/[éeá]$/, "")
  return {
    yo: fut.yo ? stem + "ía" : "",
    tu: fut.tu ? stem + "ías" : "",
    elEllaUsted: fut.elEllaUsted ? stem + "ía" : "",
    nosotros: fut.nosotros ? stem + "íamos" : "",
    vosotros: fut.vosotros ? stem + "íais" : "",
    ellosEllasUstedes: fut.ellosEllasUstedes ? stem + "ían" : "",
  }
}

let condAdded = 0
for (const entry of Object.values(DICT)) {
  if (entry.pos === "V" && entry.conjugation && entry.conjugation.future && !entry.conjugation.conditional) {
    entry.conjugation.conditional = genConditional(entry.conjugation.future)
    condAdded++
  }
}

// ============================================================
// 2. 形容词阴阳性合并
// ============================================================
let adjMerged = 0
const adjKeys = Object.keys(DICT).filter((k) => DICT[k].pos === "ADJ" && /o$/.test(k))
for (const key of adjKeys) {
  const entry = DICT[key]
  const fem = key.slice(0, -1) + "a"
  if (DICT[fem] && DICT[fem].pos === "ADJ") {
    delete DICT[fem]
    adjMerged++
  }
  entry.feminine = fem
}

// ============================================================
// 序列化（键不带引号，紧凑单行，与原格式一致）
// ============================================================
function jsonKey(key) {
  return /^[A-Za-zÁÉÍÓÚáéíóúñÑüÜ]+$/.test(key) ? key : JSON.stringify(key)
}
function ser(v) {
  if (typeof v === "string") return JSON.stringify(v)
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (v === null) return "null"
  if (Array.isArray(v)) return "[" + v.map(ser).join(",") + "]"
  if (typeof v === "object") {
    return "{" + Object.entries(v)
      .filter(([, val]) => val !== undefined)
      .map(([k, val]) => k + ":" + ser(val))
      .join(",") + "}"
  }
  return String(v)
}

const lines = []
for (const [key, entry] of Object.entries(DICT)) {
  lines.push("  " + jsonKey(key) + ":" + ser(entry) + ",")
}

const newBody = "\n" + lines.join("\n") + "\n"
fs.writeFileSync(dictPath, header + newBody + footer)

// ============================================================
// 统计
// ============================================================
const verbCount = Object.values(DICT).filter((e) => e.pos === "V").length
const withCond = Object.values(DICT).filter((e) => e.pos === "V" && e.conjugation && e.conjugation.conditional).length
const adjCount = Object.values(DICT).filter((e) => e.pos === "ADJ").length
const withFem = Object.values(DICT).filter((e) => e.pos === "ADJ" && e.feminine).length

console.log("补 conditional:", condAdded, "个动词")
console.log("合并形容词:", adjMerged, "对")
console.log("剩余词条数:", Object.keys(DICT).length)
console.log("动词:", verbCount, "| 含 conditional:", withCond)
console.log("形容词:", adjCount, "| 含 feminine:", withFem)
