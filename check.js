// Check a draft proposal package against a donor's call for proposals.
// Plain code, no model. Every result carries references to the file, line and characters it came from.

/* ---------- reading ---------- */

/** Split one CSV line into cells with their character spans. Handles double quotes. */
export function splitCsv(line) {
  const cells = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let j = i + 1;
      let text = "";
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') { text += '"'; j += 2; continue; }
        if (line[j] === '"') break;
        text += line[j++];
      }
      cells.push({ text, start: i + 1, end: j });
      i = j + 1;
      if (line[i] === ",") i++;
      else break;
    } else {
      let j = line.indexOf(",", i);
      if (j < 0) j = line.length;
      const raw = line.slice(i, j);
      const lead = raw.length - raw.trimStart().length;
      cells.push({ text: raw.trim(), start: i + lead, end: i + lead + raw.trim().length });
      i = j + 1;
      if (j === line.length) break;
    }
  }
  return cells;
}

const key = (s) => String(s ?? "").trim().toLowerCase().replace(/[\s_]+/g, "_");

/** A table: header names, and rows keyed by header, each cell with its span. row.at is the line number (1 = header). */
export function readTable(file, text) {
  const lines = String(text ?? "").split(/\r?\n/);
  if (!lines[0] || !lines[0].trim()) return { file, header: [], rows: [], problems: [] };
  const header = splitCsv(lines[0]).map((c) => key(c.text));
  const rows = [];
  const problems = [];
  for (let n = 1; n < lines.length; n++) {
    if (!lines[n].trim()) continue;
    const cells = splitCsv(lines[n]);
    if (cells.length !== header.length) { problems.push({ line: n + 1, why: `${cells.length} cells, the header has ${header.length}` }); continue; }
    const row = { at: n + 1 };
    header.forEach((h, k) => { row[h] = cells[k]; });
    rows.push(row);
  }
  return { file, header, rows, problems };
}

/** Narrative sections: every "## " heading starts one. Numbering such as "3." is not part of the name. */
export function readNarrative(file, text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const sections = [];
  let cur = null;
  lines.forEach((l, i) => {
    const h = /^(#{2,3})\s+(.*)$/.exec(l);
    if (h) {
      const full = h[2];
      const num = /^\d+(\.\d+)*\.?\s+/.exec(full);
      const name = num ? full.slice(num[0].length) : full;
      const start = h[1].length + 1 + (num ? num[0].length : 0);
      cur = { name: name.trim(), line: i + 1, start, end: start + name.trim().length, body: [] };
      sections.push(cur);
      return;
    }
    if (/^#\s/.test(l)) { cur = null; return; }
    if (cur && l.trim()) cur.body.push({ line: i + 1, text: l });
  });
  for (const s of sections) s.words = s.body.reduce((n, b) => n + wordSpans(b.text).length, 0);
  return { file, sections };
}

/** "Label: value" lines, as on a cover sheet or application form. */
export function readFields(file, text) {
  const out = [];
  String(text ?? "").split(/\r?\n/).forEach((l, i) => {
    const m = /^([^:#][^:]*):\s*(.*)$/.exec(l);
    if (m) out.push({ label: m[1].trim(), value: m[2].trim(), line: i + 1, start: l.length - m[2].length, end: l.length });
  });
  return { file, fields: out };
}

/** Words as a word processor counts them: anything between spaces. */
export function wordSpans(text) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

/** The first number in a piece of text, with its span. "1,150 participants" reads as 1150. */
export function firstNumber(text) {
  const m = /\d[\d,]*(\.\d+)?/.exec(String(text ?? ""));
  if (!m) return null;
  return { value: Number(m[0].replace(/,/g, "")), start: m.index, end: m.index + m[0].length, text: m[0] };
}

const cellNum = (cell) => {
  const t = String(cell?.text ?? "").replace(/,/g, "").trim();
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};
export const fmt = (n) => (n == null ? "Not found" : Number(n).toLocaleString("en-GB", { maximumFractionDigits: 1 }));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cellRef = (table, row, col, tone) => (row && row[col] ? { file: table.file, line: row.at, start: row[col].start, end: row[col].end, tone } : null);
const plain = (file, line) => ({ file, line, start: 0, end: 0 });

/** Read every file of a package once. */
export function readPackage(files) {
  return {
    files,
    call: String(files["call.md"] ?? "").split(/\r?\n/),
    narrative: readNarrative("narrative.md", files["narrative.md"]),
    cover: readFields("cover.md", files["cover.md"]),
    logframe: readTable("logframe.csv", files["logframe.csv"]),
    budget: readTable("budget.csv", files["budget.csv"]),
    pack: String(files["package.txt"] ?? "").split(/\r?\n/),
  };
}

/* ---------- the requirement list ---------- */

/**
 * One requirement per line: an optional clause number, a name, a colon, a rule.
 *   3.3 Theory of change: max 300 words
 *   4.4 Annex: Risk matrix
 *   2.1 Budget ceiling: USD 750,000
 *   2.2 Indirect costs: max 10% of direct costs
 *   2.3 Duration: 24 to 36 months
 *   4.1 Outcome indicators: baseline, target, means of verification
 */
export function parseRequirements(text) {
  const items = [];
  const skipped = [];
  String(text ?? "").split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;
    const m = /^\s*(\d+(?:\.\d+)*)?\s*([^:]+?)\s*:\s*(.+?)\s*$/.exec(raw);
    if (!m) { skipped.push({ line, raw, why: "no colon between the name and the rule" }); return; }
    const clause = m[1] || "";
    const label = m[2].trim();
    const rule = m[3].trim();
    const base = { line, raw, clause, label, rule };
    let r;
    if (/^annex$/i.test(label)) items.push({ ...base, kind: "annex", name: rule });
    else if (/ceiling|maximum grant|grant size/i.test(label)) {
      const n = firstNumber(rule);
      if (!n) skipped.push({ line, raw, why: "no amount in the ceiling" });
      else items.push({ ...base, kind: "ceiling", amount: n.value, currency: (/\b[A-Z]{3}\b/.exec(rule) || [""])[0] });
    } else if (/indirect/i.test(label)) {
      r = /(\d+(?:\.\d+)?)\s*%/.exec(rule);
      if (!r) skipped.push({ line, raw, why: "no percentage in the indirect cost rule" });
      else items.push({ ...base, kind: "indirect", max: Number(r[1]) });
    } else if (/^duration$/i.test(label)) {
      r = /(\d+)\s*(?:to|-)\s*(\d+)\s*months?/i.exec(rule) || /(?:max(?:imum)?|up to)\s*()(\d+)\s*months?/i.exec(rule);
      if (!r) skipped.push({ line, raw, why: "write the duration as 24 to 36 months" });
      else items.push({ ...base, kind: "duration", min: r[1] ? Number(r[1]) : 0, max: Number(r[2]) });
    } else if (/\bindicators?$/i.test(label)) {
      const level = label.replace(/\s*indicators?$/i, "").trim();
      const cols = rule.split(/\s*,\s*|\s+and\s+/).map((c) => c.trim()).filter(Boolean);
      if (!level || !cols.length) skipped.push({ line, raw, why: "write it as Outcome indicators: baseline, target" });
      else items.push({ ...base, kind: "indicators", level, cols });
    } else if ((r = /^(?:max(?:imum)?|no more than|up to)\s+([\d,]+)\s+words?$/i.exec(rule))) {
      items.push({ ...base, kind: "section", name: label, max: Number(r[1].replace(/,/g, "")) });
    } else skipped.push({ line, raw, why: "rule not recognised" });
  });
  return { items, skipped };
}

/* ---------- one requirement ---------- */

const words = (s) => s.toLowerCase().split(/\s+/).filter(Boolean);

/** Find the call's clause line and underline the words that say what the rule says. */
function clauseFact(pkg, req, tokens) {
  if (!req.clause) return { label: "The call", value: "No clause given", wide: true, note: "This line of the list names no clause, so it is checked as written." };
  const i = pkg.call.findIndex((l) => l.startsWith(`${req.clause} `));
  if (i < 0) return { label: `The call, clause ${req.clause}`, value: "Not found", note: "The call has no clause with that number. The check used the list as written." };
  const text = pkg.call[i];
  const refs = [];
  const missed = [];
  for (const tok of tokens) {
    const t = typeof tok === "string" ? { alts: [tok] } : tok;
    let hit = null;
    for (const a of t.alts) {
      const re = new RegExp(`(^|[^\\w])(${a.split(/\s+/).map(esc).join("\\s+")})(?![\\w])`, "i");
      const m = re.exec(text);
      if (m) { hit = { start: m.index + m[1].length, end: m.index + m[1].length + m[2].length }; break; }
    }
    if (hit) refs.push({ file: "call.md", line: i + 1, ...hit, tone: "" });
    else if (t.limit) missed.push(t.alts[0]);
  }
  const fact = { label: `The call, clause ${req.clause}`, value: "", wide: true, refs: refs.length ? refs : [plain("call.md", i + 1)] };
  if (missed.length) fact.note = `The clause does not say ${missed.join(" or ")}. The check used your list.`;
  return fact;
}
const lim = (...alts) => ({ alts: [...new Set(alts)], limit: true });

function result(req, tone, extra) {
  const word = { pass: "Met", fail: "Does not match", none: "Not found" }[tone];
  return { id: `r${req.line}`, group: "call", clause: req.clause, name: req.label === "Annex" || /^annex$/i.test(req.label) ? `Annex: ${req.name}` : req.label, tone, word, ...extra };
}

function checkSection(req, pkg) {
  const want = req.name.toLowerCase();
  const s = pkg.narrative.sections.find((x) => x.name.toLowerCase() === want) || pkg.narrative.sections.find((x) => x.name.toLowerCase().includes(want));
  const call = clauseFact(pkg, req, [req.name, lim(`${fmt(req.max)} words`, `${req.max} words`)]);
  const question = `The call allows ${fmt(req.max)} words for ${req.name.toLowerCase() === "summary" ? "the summary" : `"${req.name}"`}. How long is it?`;
  if (!s) {
    return result(req, "none", {
      meta: `No section with this heading in the concept note`,
      question,
      reason: `No heading in narrative.md names "${req.name}". Nothing is counted and nothing is guessed.`,
      facts: [call, {
        label: "Headings in the concept note", value: String(pkg.narrative.sections.length),
        refs: pkg.narrative.sections.map((x) => ({ file: "narrative.md", line: x.line, start: x.start, end: x.end, tone: "" })),
      }],
    });
  }
  const heading = { file: "narrative.md", line: s.line, start: s.start, end: s.end };
  if (s.words <= req.max) {
    return result(req, "pass", {
      meta: `${fmt(s.words)} of ${fmt(req.max)} words`,
      question,
      reason: `${fmt(s.words)} words, ${fmt(req.max - s.words)} under the limit.`,
      facts: [call, { label: `Words under "${s.name}"`, value: fmt(s.words), good: true, refs: [{ ...heading, tone: "pass" }] }],
    });
  }
  // The words past the limit, underlined where they sit.
  const over = [];
  let n = 0;
  for (const b of s.body) {
    const spans = wordSpans(b.text);
    const past = spans.filter((_, k) => n + k >= req.max);
    if (past.length) over.push({ file: "narrative.md", line: b.line, start: past[0].start, end: past[past.length - 1].end, tone: "fail" });
    n += spans.length;
  }
  return result(req, "fail", {
    meta: `${fmt(s.words)} words, limit ${fmt(req.max)}`,
    question,
    reason: `${fmt(s.words)} words, ${fmt(s.words - req.max)} over the limit. The words past ${fmt(req.max)} are underlined.`,
    facts: [call, { label: `Words under "${s.name}"`, value: fmt(s.words), bad: true, refs: [{ ...heading, tone: "fail" }, ...over] }],
  });
}

function checkAnnex(req, pkg) {
  const want = words(req.name);
  const call = clauseFact(pkg, req, [req.name]);
  const question = `The call asks for ${req.name.toLowerCase()} as an annex. Is it in the submission folder?`;
  for (let i = 0; i < pkg.pack.length; i++) {
    const text = pkg.pack[i];
    const refs = [];
    for (const w of want) {
      const m = new RegExp(`(^|[^\\w])(${esc(w)})(?![\\w])`, "i").exec(text);
      if (!m) { refs.length = 0; break; }
      refs.push({ file: "package.txt", line: i + 1, start: m.index + m[1].length, end: m.index + m[1].length + m[2].length, tone: "pass" });
    }
    if (refs.length === want.length && want.length) {
      return result(req, "pass", {
        meta: text.replace(/^\d+\s+/, ""),
        question,
        reason: `Listed in the submission folder, line ${i + 1}.`,
        facts: [call, { label: "In package.txt", value: "Listed", good: true, refs }],
      });
    }
  }
  const listed = pkg.pack.map((l, i) => (l.trim() ? plain("package.txt", i + 1) : null)).filter(Boolean);
  return result(req, "none", {
    meta: "No file in the submission folder is named for it",
    question,
    reason: `No line in package.txt has the words "${req.name}". It may exist somewhere else, but it is not in the package.`,
    facts: [call, { label: "Files in the submission folder", value: String(Math.max(0, listed.length - 1)), refs: listed, fold: true }],
  });
}

function budgetRow(pkg, test) {
  return pkg.budget.rows.find((r) => test(r));
}
const isTotal = (r) => /total request/i.test(r.description?.text ?? "");
const isDirect = (r) => /total direct/i.test(r.description?.text ?? "");
const isIndirect = (r) => /indirect/i.test(r.category?.text ?? "");

function checkCeiling(req, pkg) {
  const cur = req.currency ? `${req.currency} ` : "";
  const call = clauseFact(pkg, req, [lim(`${cur}${fmt(req.amount)}`, fmt(req.amount), String(req.amount))]);
  const question = `The call caps a grant at ${cur}${fmt(req.amount)}. What does the budget ask for?`;
  const row = budgetRow(pkg, isTotal);
  const total = cellNum(row?.total);
  if (total == null) {
    return result(req, "none", { meta: "No total request row in the budget", question, reason: "budget.csv has no row described as the total request, so the total is not added up here or guessed.", facts: [call] });
  }
  const ok = total <= req.amount;
  return result(req, ok ? "pass" : "fail", {
    meta: `${cur}${fmt(total)} requested, ceiling ${cur}${fmt(req.amount)}`,
    question,
    reason: ok ? `${cur}${fmt(total)} is within the ceiling, with ${fmt(req.amount - total)} to spare.` : `${cur}${fmt(total)} is ${fmt(total - req.amount)} over the ceiling.`,
    facts: [call, { label: `Total request, budget.csv line ${row.at}`, value: `${cur}${fmt(total)}`, good: ok, bad: !ok, refs: [cellRef(pkg.budget, row, "total", ok ? "pass" : "fail")] }],
  });
}

function checkIndirect(req, pkg) {
  const call = clauseFact(pkg, req, [lim(`${req.max}%`), "indirect cost recovery"]);
  const question = `Indirect cost recovery may be at most ${req.max}% of direct costs. What rate does the budget use?`;
  const direct = budgetRow(pkg, isDirect);
  const ind = pkg.budget.rows.filter(isIndirect);
  const d = cellNum(direct?.total);
  const iv = ind.reduce((a, r) => (a == null || cellNum(r.total) == null ? null : a + cellNum(r.total)), ind.length ? 0 : null);
  if (d == null || iv == null || d === 0) {
    return result(req, "none", {
      meta: "Indirect or direct total not found in the budget",
      question,
      reason: `budget.csv needs a "Total direct costs" row and an Indirect line to work out the rate. ${d == null ? "The direct total is" : "The indirect line is"} not found, so no rate is guessed.`,
      facts: [call],
    });
  }
  const rate = Math.round((iv / d) * 1000) / 10;
  const ok = iv <= d * (req.max / 100) + 1e-9;
  const cap = Math.round(d * req.max) / 100;
  const stated = [];
  for (const r of ind) {
    const m = /\d+(?:\.\d+)?\s*%/.exec(r.description.text);
    if (m) stated.push({ file: "budget.csv", line: r.at, start: r.description.start + m.index, end: r.description.start + m.index + m[0].length, tone: ok ? "pass" : "fail" });
  }
  return result(req, ok ? "pass" : "fail", {
    meta: `${fmt(rate)}% of direct costs, cap ${req.max}%`,
    question,
    reason: ok ? `${fmt(iv)} on ${fmt(d)} of direct costs is ${fmt(rate)}%, within the cap.` : `${fmt(iv)} on ${fmt(d)} of direct costs is ${fmt(rate)}%. At ${req.max}% the line would be ${fmt(cap)}, so it is ${fmt(iv - cap)} over.`,
    facts: [
      call,
      { label: "Indirect costs", value: fmt(iv), refs: [...ind.map((r) => cellRef(pkg.budget, r, "total", ok ? "pass" : "fail")), ...stated] },
      { label: "Total direct costs", value: fmt(d), refs: [cellRef(pkg.budget, direct, "total", "pass")] },
      { label: "Rate", value: `${fmt(rate)}%`, good: ok, bad: !ok, note: `${fmt(iv)} ÷ ${fmt(d)}` },
    ],
  });
}

function checkDuration(req, pkg) {
  const span = req.min ? `${req.min} to ${req.max} months` : `${req.max} months`;
  const call = clauseFact(pkg, req, [lim(span)]);
  const question = `The call funds projects of ${span}. How long is this one?`;
  const f = pkg.cover.fields.find((x) => /duration/i.test(x.label));
  const n = f && firstNumber(f.value);
  if (!n) return result(req, "none", { meta: "No duration on the cover sheet", question, reason: "cover.md has no Duration field with a number in it. Nothing is guessed.", facts: [call] });
  const ok = n.value >= req.min && n.value <= req.max;
  return result(req, ok ? "pass" : "fail", {
    meta: `${n.value} months on the cover sheet`,
    question,
    reason: ok ? `${n.value} months, inside ${span}.` : `${n.value} months is outside ${span}.`,
    facts: [call, { label: `Cover sheet, ${f.label}`, value: `${n.value} months`, good: ok, bad: !ok, refs: [{ file: "cover.md", line: f.line, start: f.start + n.start, end: f.start + n.end, tone: ok ? "pass" : "fail" }] }],
  });
}

function checkIndicators(req, pkg) {
  const call = clauseFact(pkg, req, [...req.cols, `${req.level} indicator`]);
  const question = `Does every ${req.level.toLowerCase()} indicator in the logframe have a ${req.cols.join(", ")}?`;
  const t = pkg.logframe;
  const cols = req.cols.map((c) => ({ shown: c, col: key(c) }));
  const absent = cols.filter((c) => !t.header.includes(c.col));
  if (!t.header.includes("level") || absent.length) {
    return result(req, "none", {
      meta: "Column not found in the logframe",
      question,
      reason: `logframe.csv has no ${!t.header.includes("level") ? "level" : absent.map((c) => c.shown).join(" or ")} column, so this cannot be checked.`,
      facts: [call],
    });
  }
  const rows = t.rows.filter((r) => r.level.text.toLowerCase() === req.level.toLowerCase());
  if (!rows.length) return result(req, "none", { meta: `No ${req.level.toLowerCase()} rows in the logframe`, question, reason: `logframe.csv has no row at the ${req.level.toLowerCase()} level.`, facts: [call] });
  const facts = [call];
  let gaps = 0;
  for (const r of rows) {
    const missing = cols.filter((c) => !r[c.col].text);
    gaps += missing.length;
    facts.push({
      label: `${r.code ? r.code.text + " " : ""}${r.indicator ? r.indicator.text : r.level.text}`,
      value: missing.length ? `No ${missing.map((c) => c.shown).join(", no ")}` : "All there",
      good: !missing.length, bad: !!missing.length, wide: true,
      refs: [r.indicator ? cellRef(t, r, "indicator", missing.length ? "fail" : "") : null, ...cols.filter((c) => r[c.col].text).map((c) => cellRef(t, r, c.col, "pass"))],
    });
  }
  return result(req, gaps ? "fail" : "pass", {
    meta: `${rows.length} ${req.level.toLowerCase()} ${rows.length === 1 ? "indicator" : "indicators"}${gaps ? `, ${gaps} ${gaps === 1 ? "gap" : "gaps"}` : ", nothing blank"}`,
    question,
    reason: gaps ? `${gaps} blank ${gaps === 1 ? "cell" : "cells"} where the call asks for a value.` : `Every ${req.level.toLowerCase()} indicator has all ${cols.length}.`,
    facts,
  });
}

export function checkRequirement(req, pkg) {
  const fn = { section: checkSection, annex: checkAnnex, ceiling: checkCeiling, indirect: checkIndirect, duration: checkDuration, indicators: checkIndicators }[req.kind];
  return fn(req, pkg);
}

/** Clauses in the call that no line of the list covers. Those are left for a person. */
export function uncovered(pkg, items) {
  const have = new Set(items.map((r) => r.clause).filter(Boolean));
  return pkg.call.map((l, i) => ({ m: /^(\d+\.\d+)\s/.exec(l), line: i + 1 })).filter((x) => x.m && !have.has(x.m[1])).map((x) => ({ clause: x.m[1], line: x.line }));
}

/* ---------- figures across the documents ---------- */

const docName = { "cover.md": "Cover sheet", "narrative.md": "Concept note", "logframe.csv": "Logframe", "budget.csv": "Budget" };

/** Where one document states a figure: its value, its label and the characters to underline. */
export function locate(place, pkg) {
  const doc = docName[place.file] || place.file;
  if (place.field) {
    const f = pkg.cover.fields.find((x) => x.label.toLowerCase().startsWith(place.field.toLowerCase()));
    const n = f && firstNumber(f.value);
    if (!n) return { doc, where: `${doc}, ${place.field}`, value: null, why: `No "${place.field}" field with a number in ${place.file}.` };
    return { doc, where: `${doc}, ${f.label}`, value: n.value, ref: { file: place.file, line: f.line, start: f.start + n.start, end: f.start + n.end } };
  }
  if (place.section) {
    const s = pkg.narrative.sections.find((x) => x.name.toLowerCase().includes(place.section.toLowerCase()));
    if (!s) return { doc, where: `${doc}, ${place.section}`, value: null, why: `No "${place.section}" section in ${place.file}.` };
    const re = new RegExp(place.pattern, "i");
    for (const b of s.body) {
      const m = re.exec(b.text);
      if (m) {
        const at = m.index + m[0].indexOf(m[1]);
        return { doc, where: `${doc}, ${s.name}`, value: Number(m[1].replace(/,/g, "")), ref: { file: place.file, line: b.line, start: m.index, end: m.index + m[0].length }, at };
      }
    }
    return { doc, where: `${doc}, ${s.name}`, value: null, why: `The "${s.name}" section does not state it.` };
  }
  const t = place.file === "logframe.csv" ? pkg.logframe : pkg.budget;
  const [k, v] = place.key;
  const row = t.rows.find((r) => r[k] && r[k].text.toLowerCase() === v.toLowerCase());
  const label = place.file === "logframe.csv" ? `${doc}, ${v} ${place.col}` : /^\d/.test(v) ? `${doc}, line ${v} ${place.col}` : `${doc}, ${v}`;
  const cell = row && row[key(place.col)];
  const n = cell && firstNumber(cell.text);
  if (!n) return { doc, where: label, value: null, why: `${place.file} has no ${v} row with a number under ${place.col}.` };
  return { doc, where: label, value: n.value, ref: { file: place.file, line: row.at, start: cell.start, end: cell.end } };
}

const list = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);

export function checkFigure(fig, pkg) {
  const money = /^[A-Z]{3}$/.test(fig.unit);
  const amt = (v) => (money ? `${fig.unit} ${fmt(v)}` : fmt(v));
  const withUnit = (v) => (money ? amt(v) : `${fmt(v)} ${fig.unit}`);
  const docs = (fs) => { const a = fs.map((f) => f.doc.toLowerCase()); return `The ${list(a)}`; };
  const found = fig.places.map((p) => locate(p, pkg));
  const have = found.filter((f) => f.value != null);
  const question = `Do the documents give the same ${fig.ask || fig.name.toLowerCase()}?`;
  const base = { id: `f-${fig.id}`, group: "docs", name: fig.name };
  const missing = found.filter((f) => f.value == null);
  const factOf = (f, tone) => ({
    label: f.where, value: f.value == null ? "Not found" : amt(f.value), good: tone === "pass", bad: tone === "fail",
    note: f.value == null ? f.why : undefined,
    refs: f.ref ? [{ ...f.ref, tone }] : [],
  });
  if (have.length < 2) {
    return { ...base, tone: "none", word: "Not found", meta: `Stated in ${have.length} of ${found.length} documents`, question, reason: "It needs at least two documents stating it to compare, and nothing is guessed.", facts: found.map((f) => factOf(f, "")) };
  }
  const tally = new Map();
  for (const f of have) tally.set(f.value, (tally.get(f.value) || 0) + 1);
  const ranked = [...tally].sort((a, b) => b[1] - a[1]);
  const gone = missing.length ? ` ${list(missing.map((f) => f.doc))} ${missing.length === 1 ? "does" : "do"} not state it.` : "";
  if (ranked.length === 1) {
    return {
      ...base, tone: "pass", word: "Agrees",
      meta: `${withUnit(ranked[0][0])} in ${have.length === 2 ? "both" : `all ${have.length}`} documents`,
      question,
      reason: `${docs(have)} all say ${withUnit(ranked[0][0])}.${gone}`,
      facts: found.map((f) => factOf(f, "pass")),
    };
  }
  const lead = ranked[0][1] > ranked[1][1] ? ranked[0][0] : null;
  const odd = have.filter((f) => f.value !== lead);
  const reason = lead == null
    ? `The documents give ${ranked.length} different figures: ${list(have.map((f) => `${f.doc.toLowerCase()} ${amt(f.value)}`))}. Decide which is right before it goes.`
    : `${docs(have.filter((f) => f.value === lead))} ${have.filter((f) => f.value === lead).length === 1 ? "says" : "say"} ${amt(lead)}. ${list(odd.map((f) => `The ${f.doc.toLowerCase()} says ${amt(f.value)}`))}. Decide which is right, then change the ${odd.length === 1 ? "other" : "others"}.${gone}`;
  return {
    ...base, tone: "fail", word: "Differs",
    meta: lead == null ? list(have.map((f) => amt(f.value))) : `${withUnit(lead)}, except the ${list(odd.map((f) => `${f.doc.toLowerCase()}: ${amt(f.value)}`))}`,
    question,
    reason,
    facts: found.map((f) => factOf(f, f.value == null ? "" : f.value === lead ? "pass" : "fail")),
  };
}

/** Does the budget add up: units times unit cost, the direct lines to their subtotal, and the subtotal plus indirect to the request. */
export function checkBudgetSums(pkg) {
  const t = pkg.budget;
  const base = { id: "f-sums", group: "docs", name: "Budget arithmetic", question: "Do the budget lines multiply out, and do they add up to the totals?" };
  const lines = t.rows.filter((r) => r.line?.text && !isIndirect(r));
  const direct = budgetRow(pkg, isDirect);
  const total = budgetRow(pkg, isTotal);
  const ind = t.rows.filter(isIndirect);
  if (!lines.length || !direct || !total) {
    return { ...base, tone: "none", word: "Not found", meta: "Budget lines or totals not found", reason: "budget.csv needs numbered lines, a Total direct costs row and a Total request row.", facts: [] };
  }
  const bad = [];
  const facts = [];
  for (const r of lines) {
    const u = firstNumber(r.units?.text);
    const c = cellNum(r.unit_cost);
    const v = cellNum(r.total);
    if (u && c != null && v != null && Math.abs(u.value * c - v) > 0.5) bad.push({ r, want: u.value * c });
  }
  const sumLines = lines.reduce((a, r) => a + (cellNum(r.total) ?? 0), 0);
  const d = cellNum(direct.total);
  const iv = ind.reduce((a, r) => a + (cellNum(r.total) ?? 0), 0);
  const tv = cellNum(total.total);
  facts.push({
    label: "Lines where units × unit cost = total", value: `${lines.length - bad.length} of ${lines.length}`, good: !bad.length, bad: !!bad.length,
    note: bad.length ? bad.map((b) => `Line ${b.r.line.text}: ${fmt(b.want)} expected, ${b.r.total.text} given.`).join(" ") : undefined,
    refs: lines.map((r) => cellRef(t, r, "total", bad.some((b) => b.r === r) ? "fail" : "pass")), fold: true,
  });
  facts.push({
    label: "Direct lines, added up", value: fmt(sumLines), good: sumLines === d, bad: sumLines !== d,
    note: sumLines === d ? `Matches Total direct costs, ${fmt(d)}.` : `Total direct costs says ${fmt(d)}.`,
    sum: lines.map((r) => ({ text: fmt(cellNum(r.total)) })), refs: [...lines.map((r) => cellRef(t, r, "total", "")), cellRef(t, direct, "total", sumLines === d ? "pass" : "fail")], fold: true,
  });
  facts.push({
    label: "Direct plus indirect", value: fmt(d + iv), good: d + iv === tv, bad: d + iv !== tv,
    note: d + iv === tv ? `${fmt(d)} + ${fmt(iv)} matches Total request, ${fmt(tv)}.` : `${fmt(d)} + ${fmt(iv)}, but Total request says ${fmt(tv)}.`,
    refs: [cellRef(t, direct, "total", ""), ...ind.map((r) => cellRef(t, r, "total", "")), cellRef(t, total, "total", d + iv === tv ? "pass" : "fail")],
  });
  const ok = !bad.length && sumLines === d && d + iv === tv;
  return {
    ...base, tone: ok ? "pass" : "fail", word: ok ? "Agrees" : "Differs",
    meta: ok ? `${lines.length} lines multiply out, totals add up to ${fmt(tv)}` : "A line or a total does not add up",
    reason: ok ? "Every line multiplies out, the lines add up to the direct total, and direct plus indirect is the request." : "Something in the budget does not add up. The rows below show where.",
    facts,
  };
}

/* ---------- the whole package ---------- */

export function checkAll(files, requirementText, figures) {
  const pkg = readPackage(files);
  const { items, skipped } = parseRequirements(requirementText);
  const call = items.map((r) => checkRequirement(r, pkg));
  const docs = [...figures.map((f) => checkFigure(f, pkg)), checkBudgetSums(pkg)];
  const n = (arr, tone) => arr.filter((x) => x.tone === tone).length;
  return {
    call, docs, skipped,
    left: uncovered(pkg, items),
    counts: {
      total: call.length, met: n(call, "pass"), noMatch: n(call, "fail"), notFound: n(call, "none"),
      docs: docs.length, agree: n(docs, "pass"), differ: n(docs, "fail"), docsNotFound: n(docs, "none"),
    },
  };
}
