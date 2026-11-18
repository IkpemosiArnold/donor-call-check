import { checkAll } from "./check.js?v=dcc-r2";
import { files, fileNames, requirements, figures } from "./samples.js?v=dcc-r2";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const icon = (name, cls) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  if (cls) svg.setAttribute("class", cls);
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
};
const glyph = { pass: "check", fail: "cross", none: "none" };
const wide = window.matchMedia("(min-width: 960px)");
const linesOf = (path) => String(files[path] ?? "").split(/\r?\n/);
let uid = 0;

let result = checkAll(files, requirements, figures);
let openId = null;

function status(tone, word) {
  const s = el("span", `status st-${tone}`);
  s.append(icon(glyph[tone]), word);
  return s;
}

/** A line of text with the referenced ranges underlined in place. */
function marked(text, ranges) {
  const frag = document.createDocumentFragment();
  let at = 0;
  for (const r of [...ranges].sort((a, b) => a.start - b.start)) {
    if (r.start < at || r.end <= r.start) continue;
    frag.append(text.slice(at, r.start), el("span", `u ${r.tone || ""}`.trim(), text.slice(r.start, r.end)));
    at = r.end;
  }
  frag.append(text.slice(at));
  return frag;
}

function rowsLabel(lines) {
  const n = lines.length;
  if (n === 1) return `line ${lines[0]}`;
  if (lines[n - 1] - lines[0] === n - 1) return `lines ${lines[0]} to ${lines[n - 1]}`;
  if (n === 2) return `lines ${lines[0]} and ${lines[1]}`;
  if (n === 3) return `lines ${lines[0]}, ${lines[1]} and ${lines[2]}`;
  return `${n} lines from ${lines[0]} to ${lines[n - 1]}`;
}

function grouped(refs) {
  const by = new Map();
  for (const r of refs) {
    if (!r) continue;
    if (!by.has(r.file)) by.set(r.file, new Map());
    const f = by.get(r.file);
    if (!f.has(r.line)) f.set(r.line, []);
    f.get(r.line).push(r);
  }
  return [...by].map(([file, m]) => ({ file, rows: [...m].sort((a, b) => a[0] - b[0]).map(([line, ranges]) => ({ line, ranges })) }));
}

function sourceLines(groups, late) {
  const box = el("div", "src-lines");
  for (const g of groups) {
    if (groups.length > 1) box.append(el("p", "src-file", g.file));
    const lines = linesOf(g.file);
    for (const row of g.rows) {
      const p = el("p", "src-line");
      p.append(el("span", "ln", String(row.line)));
      const t = el("span");
      t.append(marked(lines[row.line - 1] ?? "", row.ranges));
      p.append(t);
      box.append(p);
    }
  }
  if (late) box.querySelectorAll(".u").forEach((u) => u.classList.add("late"));
  return box;
}

/** Where a fact came from: file and lines, the parts it was added from, and the lines on request. */
function sourceOf(refs, { sum, fold } = {}) {
  const groups = grouped(refs);
  const count = groups.reduce((n, g) => n + g.rows.length, 0);
  if (!count) return null;
  const box = el("div", "src");
  box.append(el("p", "src-h", groups.map((g) => `${g.file}, ${rowsLabel(g.rows.map((r) => r.line))}`).join("; ")));
  if (sum && sum.length <= 10) {
    const p = el("p", "sum-line");
    sum.forEach((part, i) => {
      if (i) p.append(el("span", "op", " + "));
      p.append(el("span", "u", part.text));
    });
    box.append(p);
  }
  if (sum || fold || count > 4) {
    const id = `src-${++uid}`;
    const showLabel = count === 1 ? "Show the line" : `Show the ${count} lines`;
    const btn = el("button", "btn text small", showLabel);
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", id);
    let lines = null;
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      btn.textContent = open ? showLabel : count === 1 ? "Hide the line" : "Hide the lines";
      if (open) { lines.remove(); lines = null; return; }
      lines = sourceLines(groups, true);
      lines.id = id;
      btn.after(lines);
      requestAnimationFrame(() => requestAnimationFrame(() => lines && lines.querySelectorAll(".u.late").forEach((u) => u.classList.remove("late"))));
    });
    box.append(btn);
  } else {
    box.append(sourceLines(groups));
  }
  return box;
}

function factEl(f) {
  const box = el("div", "fact");
  if (f.wide || String(f.value).length > 18) box.classList.add("wide");
  const top = el("div", "fact-top");
  const toneCls = f.value === "Not found" ? " none" : f.bad ? " bad" : f.good ? " good" : "";
  top.append(el("p", "fact-l", f.label), el("p", `fact-v${toneCls}`, f.value));
  box.append(top);
  if (f.note) box.append(el("p", "fact-note", f.note));
  if (f.refs && f.refs.some(Boolean)) {
    const src = sourceOf(f.refs, { sum: f.sum, fold: f.fold });
    if (src) box.append(src);
  }
  return box;
}

function draw(node) {
  requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add("drawn")));
}

function evidenceFor(t) {
  const box = el("div", "evidence enter");
  if (t.question) box.append(el("p", "asked", t.question));
  const reason = el("p", "reason");
  reason.append(icon(glyph[t.tone], `st-${t.tone}`), el("span", null, t.reason));
  box.append(reason);
  if (t.facts && t.facts.length) {
    const facts = el("div", "facts");
    t.facts.forEach((f) => facts.append(factEl(f)));
    box.append(facts);
  }
  draw(box);
  return box;
}

/* ---------- the reading ---------- */

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function renderSummary() {
  const c = result.counts;
  const side = [[c.notFound, "not found", "not found"], [c.noMatch, "does not match", "do not match"]].filter(([n]) => n).map(([n, a, b]) => plural(n, a, b));
  // The hero describes the rows directly under it: the figures across the documents.
  const s = $("summary");
  s.textContent = "";
  s.append(el("span", "sum-main", c.differ ? `${plural(c.differ, "figure differs", "figures differ")} between documents` : "The documents agree"));
  const docsSide = c.docsNotFound ? `${c.docsNotFound} not found. ` : "";
  s.append(el("span", "sum-side", `${docsSide}${c.met} of ${c.total} call requirements met${side.length ? `, ${side.join(", ")}` : ""}`));
  // The requirement group carries its own count, right above its rows.
  const d = $("summary-call");
  d.textContent = "";
  const main = el("span", "sum-main");
  main.append(icon(c.met === c.total ? "check" : "cross", c.met === c.total ? "st-pass" : "st-fail"), `${c.met} of ${c.total} met`);
  d.append(main);
  if (side.length) d.append(el("span", "sum-side", side.join(", ")));
}

function rowButton(t, open, controls, onClick) {
  const btn = el("button", "row");
  btn.type = "button";
  btn.setAttribute("aria-expanded", String(open));
  btn.setAttribute("aria-controls", controls);
  const body = el("span", "body");
  const who = el("span", "who");
  if (t.clause) who.append(el("span", "code", t.clause));
  who.append(t.name);
  body.append(status(t.tone, t.word), who, el("span", "meta", t.meta));
  btn.append(body, icon("chev", "chev"));
  btn.addEventListener("click", onClick);
  return btn;
}

const allItems = () => [...result.call, ...result.docs];

function renderSide() {
  const side = $("side");
  side.textContent = "";
  const t = allItems().find((x) => x.id === openId);
  if (!t) return;
  const where = t.group === "call" ? (t.clause ? `Against the call, clause ${t.clause}` : "Against the call") : "Across the documents";
  side.append(el("p", "side-h", where), el("p", "side-title", t.name), evidenceFor(t));
  side.scrollTop = 0;
}

function renderRows(hostId, items, fresh) {
  const host = $(hostId);
  host.textContent = "";
  const rows = el("div", `rows${fresh ? " fresh" : ""}`);
  for (const t of items) {
    const item = el("div", "row-item");
    const evId = `ev-${t.id}`;
    item.append(rowButton(t, openId === t.id, wide.matches ? "side" : evId, () => {
      if (wide.matches) { if (openId !== t.id) { openId = t.id; renderAll(); } return; }
      openId = openId === t.id ? null : t.id;
      renderAll();
    }));
    if (openId === t.id && !wide.matches) {
      const ev = evidenceFor(t);
      ev.id = evId;
      item.append(ev);
    }
    rows.append(item);
  }
  host.append(rows);
}

function renderLeft() {
  const n = $("left-note");
  n.textContent = "";
  const left = result.left;
  if (!left.length) { n.hidden = true; return; }
  n.hidden = false;
  const list = left.map((x) => x.clause);
  const names = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  n.append(`Left for a person: clause${list.length === 1 ? "" : "s"} ${names}, which no line of the list covers. `);
  const refs = left.map((x) => ({ file: "call.md", line: x.line, start: 0, end: 0 }));
  const src = sourceOf(refs, { fold: true });
  if (src) {
    src.querySelector(".src-h").remove();
    src.classList.add("bare");
    n.append(src);
  }
}

function renderAll(fresh = false) {
  renderSummary();
  renderRows("call-rows", result.call, fresh);
  renderLeft();
  renderRows("docs-rows", result.docs, false);
  renderSide();
}

const firstCatch = () => (result.docs.find((x) => x.tone === "fail") || result.call.find((x) => x.tone === "fail") || allItems()[0])?.id ?? null;

/* ---------- the requirement list ---------- */

function setupList() {
  const ta = $("req-list");
  const out = $("list-out");
  ta.value = requirements;
  const run = () => {
    result = checkAll(files, ta.value, figures);
    if (!allItems().some((x) => x.id === openId)) openId = wide.matches ? firstCatch() : null;
    renderAll(true);
    const c = result.counts;
    out.hidden = false;
    out.textContent = "";
    out.append(c.total ? `Now ${c.met} of ${c.total} requirements met. The rows above are updated.` : "No requirement was read from the list.");
    const up = el("button", "btn text small", "See them");
    up.type = "button";
    up.addEventListener("click", () => { $("call-h").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); });
    if (c.total) out.append(" ", up);
    if (result.skipped.length) {
      out.append(el("span", "skip", `Not read: ${result.skipped.slice(0, 4).map((s) => `line ${s.line} (${s.why})`).join(", ")}.`));
    }
  };
  $("list-check").addEventListener("click", run);
  $("list-reset").addEventListener("click", () => { ta.value = requirements; run(); });
  const rb = $("rules-btn");
  rb.addEventListener("click", () => {
    const open = rb.getAttribute("aria-expanded") === "true";
    rb.setAttribute("aria-expanded", String(!open));
    $("rules").hidden = open;
  });
}

/* ---------- the documents ---------- */

function renderFile(path) {
  const out = $("src-out");
  out.textContent = "";
  const lines = linesOf(path).filter((l, i, a) => !(i === a.length - 1 && l === ""));
  const doc = el("div", "doc docs");
  const body = el("div", "doc-body");
  const add = (from, to) => {
    for (let i = from; i < to; i++) {
      const p = el("p", "src-line");
      p.append(el("span", "ln", String(i + 1)), el("span", null, lines[i]));
      body.append(p);
    }
  };
  const first = Math.min(lines.length, 10);
  add(0, first);
  doc.append(body);
  if (lines.length > first) {
    const more = el("button", "btn text small doc-more", `Show all ${lines.length} lines`);
    more.type = "button";
    more.addEventListener("click", () => { add(first, lines.length); more.remove(); });
    doc.append(more);
  }
  out.append(doc);
}

function setupFiles() {
  const pick = $("src-pick");
  for (const f of Object.keys(files)) {
    const o = el("option", null, fileNames[f] || f);
    o.value = f;
    pick.append(o);
  }
  pick.addEventListener("change", () => renderFile(pick.value));
  renderFile(pick.value);
}

/* ---------- start ---------- */

if (wide.matches) openId = firstCatch();
renderAll();
setupList();
setupFiles();
wide.addEventListener("change", () => {
  if (wide.matches && !openId) openId = firstCatch();
  renderAll();
});
