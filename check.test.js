import { test } from "node:test";
import assert from "node:assert/strict";
import { splitCsv, readTable, parseRequirements, readPackage, checkAll, checkRequirement, checkFigure, wordSpans } from "./check.js";
import { files, requirements, figures } from "./samples.js";

const result = checkAll(files, requirements, figures);
const req = (clause, name) => result.call.find((r) => r.clause === clause && (!name || r.name.includes(name)));
const fig = (id) => result.docs.find((d) => d.id === `f-${id}`);
const textAt = (r) => files[r.file].split("\n")[r.line - 1].slice(r.start, r.end);

test("csv cells keep their spans, and a column called line does not clash with the line number", () => {
  const c = splitCsv('2.1,Activities,"Stipends, monthly",1150 participants');
  assert.deepEqual(c.map((x) => x.text), ["2.1", "Activities", "Stipends, monthly", "1150 participants"]);
  const t = readTable("budget.csv", files["budget.csv"]);
  const row = t.rows.find((r) => r.line.text === "2.1");
  assert.equal(row.at, 4);
  assert.equal(row.units.text, "1150 participants");
});

test("the requirement list reads all 13 lines of the sample, each as its own kind", () => {
  const { items, skipped } = parseRequirements(requirements);
  assert.equal(items.length, 13);
  assert.deepEqual(skipped, []);
  assert.deepEqual([...new Set(items.map((i) => i.kind))].sort(), ["annex", "ceiling", "duration", "indicators", "indirect", "section"]);
  assert.deepEqual(items.find((i) => i.kind === "duration"), { ...items.find((i) => i.kind === "duration"), min: 24, max: 36 });
});

test("the headline: 9 of 13 met, 2 not found, 2 do not match; 2 of 5 figures differ", () => {
  assert.deepEqual(result.counts, { total: 13, met: 9, noMatch: 2, notFound: 2, docs: 5, agree: 3, differ: 2, docsNotFound: 0 });
});

test("every requirement's verdict", () => {
  assert.deepEqual(result.call.map((r) => [r.clause, r.name, r.word]), [
    ["2.1", "Budget ceiling", "Met"],
    ["2.2", "Indirect costs", "Does not match"],
    ["2.3", "Duration", "Met"],
    ["3.1", "Summary", "Met"],
    ["3.2", "Context and need", "Met"],
    ["3.3", "Theory of change", "Does not match"],
    ["3.4", "MEAL plan", "Met"],
    ["3.5", "Sustainability and exit", "Not found"],
    ["4.1", "Annex: Logframe", "Met"],
    ["4.1", "Outcome indicators", "Met"],
    ["4.2", "Annex: Budget", "Met"],
    ["4.3", "Annex: Safeguarding policy", "Met"],
    ["4.4", "Annex: Risk matrix", "Not found"],
  ]);
});

test("theory of change is 319 words against 300, and exactly the last 19 words are underlined", () => {
  const r = req("3.3");
  assert.match(r.reason, /^319 words, 19 over the limit/);
  const f = r.facts.find((x) => x.label.startsWith("Words under"));
  const over = f.refs.filter((x) => x.line !== 12);
  assert.equal(over.reduce((n, x) => n + wordSpans(textAt(x)).length, 0), 19);
  assert.match(textAt(over[over.length - 1]), /reviewed with the Foundation\.$/);
  assert.equal(textAt(f.refs[0]), "Theory of change");
});

test("indirect costs: 74,400 on 620,000 is 12%, so 12,400 over a 10% cap, and the stated 12% is underlined", () => {
  const r = req("2.2");
  assert.equal(r.tone, "fail");
  assert.match(r.reason, /74,400 on 620,000 of direct costs is 12%\. At 10% the line would be 62,000, so it is 12,400 over\./);
  const refs = r.facts.find((x) => x.label === "Indirect costs").refs;
  assert.deepEqual(refs.map(textAt), ["74400", "12%"]);
  assert.deepEqual(r.facts[0].refs.map(textAt), ["10%", "Indirect cost recovery"]);
});

test("a missing annex and a missing section say not found and guess nothing", () => {
  const risk = req("4.4");
  assert.equal(risk.word, "Not found");
  assert.match(risk.reason, /No line in package\.txt has the words "Risk matrix"/);
  const exit = req("3.5");
  assert.equal(exit.word, "Not found");
  assert.ok(!exit.facts.some((f) => /^Words under/.test(f.label)));
});

test("an annex matches when every word of its name is on one line: Safeguarding policy finds the PSEA policy", () => {
  const r = req("4.3");
  assert.equal(r.word, "Met");
  assert.deepEqual(r.facts[1].refs.map(textAt), ["Safeguarding", "policy"]);
});

test("women taking part: cover, concept note and logframe say 1,200; the budget says 1,150", () => {
  const f = fig("women");
  assert.equal(f.word, "Differs");
  assert.deepEqual(f.facts.map((x) => [x.label, x.value, x.refs[0].tone, textAt(x.refs[0])]), [
    ["Cover sheet, Women taking part", "1,200", "pass", "1,200"],
    ["Concept note, Summary", "1,200", "pass", "1,200 women"],
    ["Logframe, 1.1 target", "1,200", "pass", "1200"],
    ["Budget, line 2.1 units", "1,150", "fail", "1150 participants"],
  ]);
  // Taking part is enrolment (output 1.1), not completion (output 1.3, 1,080).
  const lf = f.facts.find((x) => x.label.startsWith("Logframe")).refs[0];
  assert.match(files["logframe.csv"].split("\n")[lf.line - 1], /Women enrolled in a 12-month cohort/);
  assert.match(files["logframe.csv"], /Women completing all 12 months,0,1080,/);
});

test("total request: cover and budget say USD 694,400; the concept note says USD 682,000", () => {
  const f = fig("total");
  assert.equal(f.word, "Differs");
  assert.match(f.reason, /The cover sheet and budget say USD 694,400\. The concept note says USD 682,000\./);
  const bad = f.facts.find((x) => x.bad);
  assert.equal(textAt(bad.refs[0]), "request USD 682,000");
});

test("duration and savings groups agree in every document that states them", () => {
  assert.equal(fig("months").reason, "The cover sheet, concept note and budget all say 36 months.");
  assert.equal(fig("groups").reason, "The concept note, logframe and budget all say 64 groups.");
});

test("the budget adds up, re-added here by hand from the cells", () => {
  const t = readTable("budget.csv", files["budget.csv"]);
  const lines = t.rows.filter((r) => r.line.text && r.category.text !== "Indirect");
  for (const r of lines) assert.equal(parseInt(r.units.text, 10) * Number(r.unit_cost.text), Number(r.total.text), `line ${r.line.text}`);
  const direct = lines.reduce((a, r) => a + Number(r.total.text), 0);
  assert.equal(direct, 620000);
  assert.equal(direct + 74400, 694400);
  assert.equal(fig("sums").word, "Agrees");
});

test("every reference points inside its line, and every coloured underline covers real text", () => {
  for (const item of [...result.call, ...result.docs]) {
    for (const f of item.facts) {
      for (const r of f.refs || []) {
        if (!r) continue;
        const line = files[r.file].split("\n")[r.line - 1];
        assert.ok(line != null, `${item.name}: ${r.file} line ${r.line}`);
        assert.ok(r.end <= line.length && r.start >= 0, `${item.name}: span inside line`);
        if (r.tone === "pass" || r.tone === "fail") assert.ok(textAt(r).trim().length > 0, `${item.name}: empty underline`);
      }
    }
  }
});

test("editing a limit changes the verdict, and the page says the call does not say that", () => {
  const edited = requirements.replace("Theory of change: max 300 words", "Theory of change: max 350 words");
  const r = checkAll(files, edited, figures);
  assert.equal(r.counts.met, 10);
  const toc = r.call.find((x) => x.clause === "3.3");
  assert.equal(toc.word, "Met");
  assert.match(toc.facts[0].note, /does not say 350 words/);
});

test("a lower ceiling fails by the exact amount", () => {
  const r = checkRequirement(parseRequirements("2.1 Budget ceiling: USD 690,000").items[0], readPackage(files));
  assert.equal(r.word, "Does not match");
  assert.equal(r.reason, "USD 694,400 is 4,400 over the ceiling.");
});

test("a pasted list: unknown rules are listed as not read, a clause the call lacks is said, and uncovered clauses are left for a person", () => {
  const r = checkAll(files, "9.9 Annex: Logframe\nGender analysis: required\nno colon here\n3.1 Summary: max 150 words", figures);
  assert.equal(r.call.length, 2);
  assert.deepEqual(r.skipped.map((s) => [s.line, s.why]), [[2, "rule not recognised"], [3, "no colon between the name and the rule"]]);
  assert.match(r.call[0].facts[0].note, /no clause with that number/);
  assert.deepEqual(result.left.map((x) => x.clause), ["1.1", "1.2", "5.1"]);
});

test("a blank target in the logframe fails the indicator rule and names the gap", () => {
  const lf = files["logframe.csv"].replace("Average monthly income from own enterprise (USD),18,40,", "Average monthly income from own enterprise (USD),18,,");
  const r = checkAll({ ...files, "logframe.csv": lf }, "4.1 Outcome indicators: baseline, target, means of verification", figures);
  assert.equal(r.call[0].word, "Does not match");
  assert.equal(r.call[0].facts.find((f) => f.bad).value, "No target");
});

test("a figure stated in only one document is not found, not compared", () => {
  const f = checkFigure({ id: "x", name: "Villages", unit: "villages", places: [
    { file: "narrative.md", section: "Context and need", pattern: "in (\\d+) villages" },
    { file: "logframe.csv", key: ["code", "9.9"], col: "target" },
  ] }, readPackage(files));
  assert.equal(f.word, "Not found");
  assert.equal(f.facts[1].value, "Not found");
});
