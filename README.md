# Submission Check

The last job before a proposal goes to a donor is the quality review: does the package give the donor everything the call asks for, and does it say the same thing in every document? This page does that review in plain code. It sets a foundation's call for proposals against a draft package and shows, requirement by requirement, what is met, what does not match and what is not found. It then checks that the same figure reads the same in the cover sheet, the concept note, the logframe and the budget. Every result points at the line or cell it came from, with the words underlined.

There is no model in it. The foundation, the call, the applicant, the programme, the province, the districts and every figure are made up.

## What it does

The package is five files and a folder list, all sample data:

- `call.md`: the foundation's call for proposals, with numbered clauses: eligibility, funding (ceiling, indirect cost cap, duration), concept narrative sections with word limits, and required annexes.
- `cover.md`: the application cover sheet, as "Label: value" lines.
- `narrative.md`: the concept note, with numbered sections.
- `logframe.csv`: Annex A, impact, outcome and output rows with indicator, baseline, target and means of verification.
- `budget.csv`: Annex B, budget lines with units, unit cost and total, then total direct costs, indirect cost recovery and the total request.
- `package.txt`: the files in the submission folder.

**Against the call.** A requirement list, written from the call, one line per requirement. Each line is checked in the package:

| Rule | What the code reads |
| --- | --- |
| `3.3 Theory of change: max 300 words` | The words under that heading in the concept note, counted as a word processor counts them (anything between spaces). Over the limit, the words past it are underlined where they sit. |
| `4.4 Annex: Risk matrix` | One line of `package.txt` that has every word of the name. |
| `2.1 Budget ceiling: USD 750,000` | The budget row described as the total request. |
| `2.2 Indirect costs: max 10% of direct costs` | Indirect lines divided by total direct costs. |
| `2.3 Duration: 24 to 36 months` | The Duration field on the cover sheet. |
| `4.1 Outcome indicators: baseline, target, means of verification` | Blank cells in those logframe columns, for every row at that level. |

Each result also quotes the call's clause with the limit underlined. Clauses in the call that no line covers (here 1.1 and 1.2 on eligibility, and 5.1 on the deadline) are listed as left for a person.

**Across the documents.** Four figures are looked up wherever the package states them: a cover sheet field, a pattern inside a named narrative section, or a spreadsheet cell. If every document agrees, it agrees. If not, the figure most documents give is marked green and the odd one red, and the page says to decide which is right. It never picks the answer. The budget's own arithmetic is checked too.

The sample: **2 figures differ between documents. 9 of 13 call requirements met, 2 not found, 2 do not match.**

- **2.2 Indirect costs, does not match.** 74,400 on 620,000 of direct costs is 12%. At the 10% cap the line would be 62,000, so it is 12,400 over.
- **3.3 Theory of change, does not match.** 319 words against 300. The last 19 are underlined.
- **3.5 Sustainability and exit, not found.** The concept note has no section with that heading.
- **4.4 Risk matrix, not found.** The submission folder lists no file with those words.
- **Women taking part, differs.** The cover sheet, concept note and logframe (output 1.1, women enrolled) say 1,200. Budget line 2.1 costs 1,150 participants (line 2.2 uses the same figure).
- **Total request, differs.** The cover sheet and budget say USD 694,400. The concept note asks for USD 682,000, which is the direct costs plus 10%: a narrative written before the indirect line went up to 12%.
- **Duration** (36 months) and **savings groups** (64) agree in every document that states them. The budget lines multiply out and add up: 620,000 direct plus 74,400 indirect is 694,400, within the USD 750,000 ceiling.

## Try your own list

Under the result, the requirement list is editable. Change a limit, delete a line or paste the list from another call, then "Check again". The rows update. If a limit you typed is not what the call's clause says, the result says so and uses your list. Lines it cannot read are listed with the reason. "Put back the call's list" restores the sample.

## Sample data

Every name is made up and was web-searched on 18 Nov 2026 for an exact match:

- Larkwell Foundation: no match (near names only: Livewell Foundation, Lark Foundation, Larksview Foundation).
- Kintara Women's Network: no match (nearest: Kintore Women's Collaborative, an artists' group).
- Loom and Ledger (the programme): no match.
- Vessa Province: no match (nearest: Vaasa Province, Edessa Province).
- Kalvero (district): no match.
- Sorvane (district): no match (nearest: a musician called Sorvaine).

Two earlier picks were dropped: "Oram" is a place in India and "Telluk" is a near-spelling of Teluk, a common place name in Malaysia and Indonesia. No person is named; the cover sheet's contact is a job title.

Every figure adds up. Budget lines: 216 × 1,250 = 270,000; 36 × 1,600 = 57,600; 1,150 × 90 = 103,500; 1,150 × 60 = 69,000; 48 × 750 = 36,000; 64 × 200 = 12,800; 6 × 4,000 = 24,000; 7,500; 36 × 1,100 = 39,600. Direct total 620,000. Programme: three cohorts of 400 is 1,200 women enrolled, and the logframe plans 1,080 (90%) to complete all 12 months; 48 discussion groups of 25 is 1,200; 64 savings groups of about 19 is 1,200. The two mismatches above are deliberate and are the only ones.

## Limits

- The package format is fixed: the five files and the folder list above. A real package in Word, Excel and PDF would need a step that turns each into lines first.
- Word counts follow the "anything between spaces" rule. Some donors count differently, for example excluding headings, tables or references.
- An annex counts as present if the folder lists it. The code does not open the file or judge what is in it.
- The cross-document figures are set up for this package: where to look for each one is written in `samples.js`. A different package needs its own list of places. Each place is read once, so a second, different mention of the same figure in the same document is not compared.
- Eligibility, the deadline, and whether the narrative actually covers what a clause asks for (the MEAL plan's feedback routes, for example) are for a person. The page lists those clauses rather than pretend to check them.
- A figure that differs is flagged, not fixed. Which number is right is a decision for the proposal team.
- Nothing is sent, stored or written back.

## Run the tests

```
node --test
```

Needs Node 20 or later. No dependencies. 18 tests cover CSV cells and their spans, reading the requirement list, the headline counts, every requirement's verdict, the 19 words past the limit, the indirect rate with its underlines, the two not-found cases, annex name matching, both cross-document mismatches and both agreements, the budget re-added from its cells, every reference against the text it claims, an edited limit, a lower ceiling, a pasted list with unreadable lines, a blank logframe target, and a figure stated in only one document.

## Open the page locally

```
python3 -m http.server 8813
```

Then open http://localhost:8813. The page makes no network calls beyond its own files.

## Design

Result first: the figures that differ between documents, with the requirement count beside it, then a row per figure. The requirement group has its own count right above its rows. Rows are split by hairlines. Opening a row shows the question asked, the call's clause quoted with its limit underlined in grey, and the package's own line or cell with the matched words underlined green or red. Geist for the tool, Newsreader for anything quoted from the call or the package. One deep teal marks what can be pressed.

Fonts: Geist and Newsreader (SIL Open Font License), in `fonts/`.

## Provenance

Built on 18 Nov 2026 with AI coding agents, directed by Arnold Ikpemosi Adeyemi. The foundation, the call, the applicant, the programme, the places and every figure are made up. No organisation or person is named.

## Licence

MIT. See `LICENSE`.
