#!/usr/bin/env node
// 词典补全脚本（第二批：外交/书信/商务主题）
// 1. 修复反身动词条件式：逐人称从 future 词尾推导（原 genConditional 用 fut.yo 词干套所有人称，导致反身动词人称代词全错）
// 2. 新增 29 个词条（含 8 个动词完整变位）

const fs = require("fs")
const dictPath = "packages/database/src/dictionary.ts"
const src = fs.readFileSync(dictPath, "utf8")

const dictDeclStart = src.indexOf("const DICT")
const objOpen = src.indexOf("{", dictDeclStart)
const footerStart = src.indexOf("// 词形还原")
const objClose = src.lastIndexOf("}", footerStart)

const header = src.slice(0, objOpen + 1)
const bodySrc = src.slice(objOpen + 1, objClose)
const footer = src.slice(objClose)

const DICT = eval("({" + bodySrc + "})")

// ============================================================
// 1. 修复条件式：逐人称从 future 去词尾 + 条件词尾
//    future 词尾固定：-é / -ás / -á / -emos / -éis / -án
//    conditional = future 词干 + -ía/-ías/-ía/-íamos/-íais/-ían
//    对规则、不规则、反身动词全部通用
// ============================================================
const FUT_END = { yo: "é", tu: "ás", elEllaUsted: "á", nosotros: "emos", vosotros: "éis", ellosEllasUstedes: "án" }
const COND_END = { yo: "ía", tu: "ías", elEllaUsted: "ía", nosotros: "íamos", vosotros: "íais", ellosEllasUstedes: "ían" }

function fixConditional(fut) {
  const row = {}
  for (const p of Object.keys(FUT_END)) {
    const form = fut[p]
    if (!form) { row[p] = ""; continue }
    const stem = form.endsWith(FUT_END[p]) ? form.slice(0, -FUT_END[p].length) : form
    row[p] = stem + COND_END[p]
  }
  return row
}

let condFixed = 0
for (const entry of Object.values(DICT)) {
  if (entry.pos === "V" && entry.conjugation && entry.conjugation.future) {
    entry.conjugation.conditional = fixConditional(entry.conjugation.future)
    condFixed++
  }
}

// ============================================================
// 2. 新增词条
// ============================================================
const T = (yo, tu, el, nos, vos, ellos) => ({ yo, tu, elEllaUsted: el, nosotros: nos, vosotros: vos, ellosEllasUstedes: ellos })

// 规则 -ar 动词（envidiar/iniciar/mandar/anunciar）
function regAr(inf) {
  const stem = inf.slice(0, -2)
  const conj = {
    present: T(stem + "o", stem + "as", stem + "a", stem + "amos", stem + "áis", stem + "an"),
    preterite: T(stem + "é", stem + "aste", stem + "ó", stem + "amos", stem + "asteis", stem + "aron"),
    imperfect: T(stem + "aba", stem + "abas", stem + "aba", stem + "ábamos", stem + "abais", stem + "aban"),
    future: T(inf + "é", inf + "ás", inf + "á", inf + "emos", inf + "éis", inf + "án"),
    subjunctive: T(stem + "e", stem + "es", stem + "e", stem + "emos", stem + "éis", stem + "en"),
    imperative: T("", stem + "a", stem + "e", stem + "emos", stem + "ad", stem + "en"),
    isRegular: true,
  }
  conj.conditional = fixConditional(conj.future)
  return conj
}

function verb(conj) {
  conj.conditional = fixConditional(conj.future)
  return conj
}

const ex = (spanish, chinese) => ({ source: "dictionary", spanish, chinese })

const NEW = {
  // ---- 名词 ----
  despedida: { article: "la", pos: "NF", chinese: "告别；送别", definitionEs: "Acción de decir adiós, o acto de despedir a alguien.", examples: [ex("La despedida fue muy emotiva.", "告别非常感人。"), ex("Dimos una fiesta de despedida.", "我们办了一场欢送会。")] },
  cargo: { article: "el", pos: "NM", chinese: "职位；职务；负责", definitionEs: "Puesto o empleo que ocupa una persona, o responsabilidad asignada.", examples: [ex("Ocupa un cargo importante en la empresa.", "他在公司担任重要职务。"), ex("Está a cargo de este proyecto.", "他负责这个项目。")] },
  embajada: { article: "la", pos: "NF", chinese: "大使馆", definitionEs: "Oficina o residencia de un embajador en otro país.", examples: [ex("Trabaja en la embajada española.", "他在西班牙大使馆工作。"), ex("Fui a la embajada para renovar el visado.", "我去大使馆续签签证。")] },
  costumbre: { article: "la", pos: "NF", chinese: "习惯；习俗", definitionEs: "Hábito o práctica que se repite con frecuencia.", examples: [ex("Tengo la costumbre de leer antes de dormir.", "我有睡前阅读的习惯。"), ex("Es una costumbre muy antigua.", "这是一个很古老的习俗。")] },
  suerte: { article: "la", pos: "NF", chinese: "运气；命运", definitionEs: "Circunstancia favorable o destino de una persona.", examples: [ex("¡Mucha suerte en el examen!", "祝你考试好运！"), ex("Tuvo la suerte de encontrar trabajo.", "他幸运地找到了工作。")] },
  carrera: { article: "la", pos: "NF", chinese: "职业；生涯；赛跑", definitionEs: "Profesión o estudios superiores; también una competición de velocidad.", examples: [ex("Estudia la carrera de medicina.", "他学医学专业。"), ex("Ganó la carrera de cien metros.", "他赢得了百米赛跑。")] },
  diplomacia: { article: "la", pos: "NF", chinese: "外交", definitionEs: "Actividad de las relaciones entre países, o habilidad para tratar con otros.", examples: [ex("La diplomacia evita muchos conflictos.", "外交避免了许多冲突。"), ex("Hay que hablar con diplomacia.", "说话要有技巧。")] },
  promesa: { article: "la", pos: "NF", chinese: "承诺；诺言", definitionEs: "Compromiso de hacer o dar algo.", examples: [ex("Cumplió su promesa.", "他履行了承诺。"), ex("Hizo una promesa de ayudarme.", "他答应帮我。")] },
  postal: { article: "la", pos: "NF", chinese: "明信片", definitionEs: "Tarjeta que se envía por correo, a menudo con una imagen.", examples: [ex("Te envié una postal desde París.", "我从巴黎给你寄了张明信片。"), ex("La postal tiene una foto de la playa.", "明信片上有一张海滩的照片。")] },
  altiplano: { article: "el", pos: "NM", chinese: "高原", definitionEs: "Llanura extensa situada a gran altitud, entre montañas.", examples: [ex("El altiplano andino está a mucha altura.", "安第斯高原海拔很高。"), ex("En el altiplano hace frío por la noche.", "高原上夜里很冷。")] },
  deuda: { article: "la", pos: "NF", chinese: "债务", definitionEs: "Dinero u obligación que se debe a alguien.", examples: [ex("Tengo una deuda con el banco.", "我欠银行一笔债。"), ex("Pagó todas sus deudas.", "他还清了所有债务。")] },
  deudor: { article: "el", pos: "NM", chinese: "债务人", definitionEs: "Persona que debe dinero o tiene una deuda.", examples: [ex("El deudor no pudo pagar a tiempo.", "债务人没能按时还款。"), ex("El banco busca al deudor.", "银行在找债务人。")] },
  retraso: { article: "el", pos: "NM", chinese: "延误；延迟", definitionEs: "Hecho de llegar tarde o de retrasarse algo.", examples: [ex("El tren llegó con retraso.", "火车晚点了。"), ex("Lamento el retraso en responder.", "抱歉回复晚了。")] },
  negocio: { article: "el", pos: "NM", chinese: "生意；事务", definitionEs: "Actividad comercial, o asunto del que hay que ocuparse.", examples: [ex("Abrió un negocio de ropa.", "他开了一家服装店。"), ex("El negocio va muy bien.", "生意很好。")] },
  asunto: { article: "el", pos: "NM", chinese: "事务；事情；主题", definitionEs: "Cuestión o tema del que se trata.", examples: [ex("Este es un asunto importante.", "这是一件重要的事情。"), ex("No quiero hablar de ese asunto.", "我不想谈那件事。")] },

  // ---- 形容词（阴阳性合并：主条目 -o，feminine 指 -a）----
  acreditado: { article: "el", pos: "ADJ", chinese: "公认的；委派的；可靠的", definitionEs: "Que tiene reconocimiento o autoridad oficial, o que goza de buena reputación.", examples: [ex("Es un médico acreditado.", "他是一位有资质的医生。"), ex("La universidad acreditada tiene buena reputación.", "这所公认的大学声誉很好。")], feminine: "acreditada" },
  penoso: { article: "el", pos: "ADJ", chinese: "痛苦的；艰难的；辛苦的", definitionEs: "Que causa pena, dolor o mucho esfuerzo.", examples: [ex("Fue un trabajo penoso.", "那是一项艰苦的工作。"), ex("Es penoso verlo sufrir.", "看到他受苦令人难受。")], feminine: "penosa" },
  raro: { article: "el", pos: "ADJ", chinese: "奇怪的；罕见的", definitionEs: "Poco común, extraño o difícil de encontrar.", examples: [ex("Es raro que no llame.", "他不打电话很奇怪。"), ex("Vi un animal raro en el bosque.", "我在森林里看到一只奇怪的动物。")], feminine: "rara" },
  desconocido: { article: "el", pos: "ADJ", chinese: "陌生的；未知的", definitionEs: "Que no se conoce o no es familiar.", examples: [ex("Un hombre desconocido llamó a la puerta.", "一个陌生男人敲了门。"), ex("El futuro es desconocido.", "未来是未知的。")], feminine: "desconocida" },

  // ---- 副词 / 连词 ----
  mientras: { article: "", pos: "CONJ", chinese: "当…时；而；同时", definitionEs: "Durante el tiempo en que, o en contraste con otra cosa.", examples: [ex("Escucho música mientras estudio.", "我学习的时候听音乐。"), ex("Mientras espero, leo un libro.", "我等待的时候看书。")] },
  "ojalá": { article: "", pos: "ADV", chinese: "但愿；希望", definitionEs: "Expresión de deseo de que algo suceda.", examples: [ex("Ojalá puedas venir mañana.", "但愿明天你能来。"), ex("Ojalá llueva pronto.", "但愿快点下雨。")] },

  // ---- 动词 ----
  envidiar: { article: "", pos: "V", chinese: "嫉妒；羡慕", definitionEs: "Desear lo que otra persona tiene y no poseerlo uno mismo.", examples: [ex("No hay que envidiar lo ajeno.", "不应该嫉妒别人的东西。"), ex("Te envidio por tu suerte.", "我羡慕你的运气。")], conjugation: regAr("envidiar") },
  iniciar: { article: "", pos: "V", chinese: "开始；启动", definitionEs: "Comenzar o dar principio a algo.", examples: [ex("Vamos a iniciar la reunión.", "我们开始会议吧。"), ex("Inició su carrera hace diez años.", "他十年前开始了他的职业生涯。")], conjugation: regAr("iniciar") },
  mandar: { article: "", pos: "V", chinese: "寄；命令；派遣", definitionEs: "Enviar algo a alguien, u ordenar hacer algo.", examples: [ex("Te mando una carta mañana.", "我明天给你寄一封信。"), ex("El jefe manda a sus empleados.", "老板命令他的员工。")], conjugation: regAr("mandar") },
  anunciar: { article: "", pos: "V", chinese: "宣布；通知", definitionEs: "Hacer saber algo públicamente.", examples: [ex("Anunciaron la boda en el periódico.", "他们在报纸上宣布了婚礼。"), ex("La empresa anunció un nuevo producto.", "公司发布了一款新产品。")], conjugation: regAr("anunciar") },
  divertirse: { article: "", pos: "V", chinese: "娱乐；玩得开心", definitionEs: "Pasarlo bien, entretenerse o disfrutar.", examples: [ex("Nos divertimos mucho en la fiesta.", "我们在聚会上玩得很开心。"), ex("Los niños se divierten en el parque.", "孩子们在公园里玩得很开心。")], conjugation: verb({
    present: T("me divierto", "te diviertes", "se divierte", "nos divertimos", "os divertís", "se divierten"),
    preterite: T("me divertí", "te divertiste", "se divirtió", "nos divertimos", "os divertisteis", "se divirtieron"),
    imperfect: T("me divertía", "te divertías", "se divertía", "nos divertíamos", "os divertíais", "se divertían"),
    future: T("me divertiré", "te divertirás", "se divertirá", "nos divertiremos", "os divertiréis", "se divertirán"),
    subjunctive: T("me divierta", "te diviertas", "se divierta", "nos divirtamos", "os divirtáis", "se diviertan"),
    imperative: T("", "diviértete", "diviértase", "divirtámonos", "divertíos", "diviértanse"),
    isRegular: false,
  }) },
  prolongarse: { article: "", pos: "V", chinese: "延长；持续", definitionEs: "Durar más tiempo de lo previsto, extenderse.", examples: [ex("La reunión se prolongó hasta la noche.", "会议一直开到晚上。"), ex("El invierno se prolonga demasiado.", "冬天持续太久了。")], conjugation: verb({
    present: T("me prolongo", "te prolongas", "se prolonga", "nos prolongamos", "os prolongáis", "se prolongan"),
    preterite: T("me prolongué", "te prolongaste", "se prolongó", "nos prolongamos", "os prolongasteis", "se prolongaron"),
    imperfect: T("me prolongaba", "te prolongabas", "se prolongaba", "nos prolongábamos", "os prolongabais", "se prolongaban"),
    future: T("me prolongaré", "te prolongarás", "se prolongará", "nos prolongaremos", "os prolongaréis", "se prolongarán"),
    subjunctive: T("me prolongue", "te prolongues", "se prolongue", "nos prolonguemos", "os prolonguéis", "se prolonguen"),
    imperative: T("", "prolóngate", "prolónguese", "prolonguémonos", "prolongaos", "prolónguense"),
    isRegular: false,
  }) },
  preocuparse: { article: "", pos: "V", chinese: "担心；忧虑", definitionEs: "Sentir inquietud o angustia por algo.", examples: [ex("No te preocupes, todo está bien.", "别担心，一切都好。"), ex("Se preocupa mucho por sus hijos.", "他很担心他的孩子们。")], conjugation: verb({
    present: T("me preocupo", "te preocupas", "se preocupa", "nos preocupamos", "os preocupáis", "se preocupan"),
    preterite: T("me preocupé", "te preocupaste", "se preocupó", "nos preocupamos", "os preocupasteis", "se preocuparon"),
    imperfect: T("me preocupaba", "te preocupabas", "se preocupaba", "nos preocupábamos", "os preocupabais", "se preocupaban"),
    future: T("me preocuparé", "te preocuparás", "se preocupará", "nos preocuparemos", "os preocuparéis", "se preocuparán"),
    subjunctive: T("me preocupe", "te preocupes", "se preocupe", "nos preocupemos", "os preocupéis", "se preocupen"),
    imperative: T("", "preocúpate", "preocúpese", "preocupémonos", "preocupaos", "preocúpense"),
    isRegular: false,
  }) },
  instalarse: { article: "", pos: "V", chinese: "安顿；安装自己", definitionEs: "Establecerse en un lugar, o colocar algo en su sitio.", examples: [ex("Se instaló en Madrid hace un año.", "他一年前在马德里安顿下来。"), ex("Nos instalamos en el nuevo apartamento.", "我们住进了新公寓。")], conjugation: verb({
    present: T("me instalo", "te instalas", "se instala", "nos instalamos", "os instaláis", "se instalan"),
    preterite: T("me instalé", "te instalaste", "se instaló", "nos instalamos", "os instalasteis", "se instalaron"),
    imperfect: T("me instalaba", "te instalabas", "se instalaba", "nos instalábamos", "os instalabais", "se instalaban"),
    future: T("me instalaré", "te instalarás", "se instalará", "nos instalaremos", "os instalaréis", "se instalarán"),
    subjunctive: T("me instale", "te instales", "se instale", "nos instalemos", "os instaléis", "se instalen"),
    imperative: T("", "instálate", "instálese", "instalémonos", "instalaos", "instálense"),
    isRegular: false,
  }) },
}

let added = 0
for (const [key, entry] of Object.entries(NEW)) {
  if (DICT[key]) {
    console.log("跳过（已存在）:", key)
    continue
  }
  DICT[key] = entry
  added++
}

// ============================================================
// 序列化（与原格式一致：键不带引号，紧凑单行）
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

console.log("修复条件式:", condFixed, "个动词")
console.log("新增词条:", added)
console.log("总词条数:", Object.keys(DICT).length)
