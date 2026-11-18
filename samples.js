// Sample data. Everything here is made up: the foundation, its call, the applicant, the programme,
// the province, the two districts and every figure. No real organisation, place or person is named.
//
// A foundation's call for proposals, and one applicant's draft package for it: a cover sheet,
// a concept narrative, a logframe, a budget, and the list of files in the submission folder.

const call = `# Larkwell Foundation, 2027 call for proposals
Women's economic and social empowerment in conflict-affected areas. Sample data, made up.

1 Eligibility
1.1 Lead applicants must be non-profit organisations that have worked in the proposed area for at least three years.
1.2 Programmes must work directly with women aged 18 and over who are affected by conflict or displacement.

2 Funding
2.1 Grants of up to USD 750,000 for the whole project period.
2.2 Indirect cost recovery may not exceed 10% of total direct costs.
2.3 Projects must run for 24 to 36 months.

3 Concept narrative
3.1 Summary, no more than 150 words.
3.2 Context and need, no more than 250 words.
3.3 Theory of change, no more than 300 words.
3.4 MEAL plan, no more than 200 words, covering the baseline, the endline and how participants can give feedback.
3.5 Sustainability and exit, no more than 150 words.

4 Required annexes
4.1 Logframe, with a baseline, a target and a means of verification for every outcome indicator.
4.2 Detailed budget in USD.
4.3 Safeguarding policy, including prevention of sexual exploitation and abuse (PSEA).
4.4 Risk matrix, with likelihood, impact and mitigation for each risk.

5 Submission
5.1 Send one package by 15 January 2027. Late or incomplete packages will not be reviewed.
`;

const cover = `# Application cover sheet
Applicant organisation: Kintara Women's Network
Programme title: Loom and Ledger
Area: Kalvero and Sorvane districts, Vessa Province
Duration (months): 36
Proposed start: 1 April 2027
Women taking part: 1,200
Total request (USD): 694,400
Lead contact: Programme Director
`;

const narrative = `# Loom and Ledger: concept note
Kintara Women's Network, for the Larkwell Foundation 2027 call. Sample data, made up.

## 1. Summary
Loom and Ledger will work with 1,200 women affected by conflict in Kalvero and Sorvane districts of Vessa Province over 36 months. Each woman joins a cohort for twelve months of vocational and business skills training, a monthly stipend, a savings group and a women's discussion group on rights, health and household decisions. By the end of the programme we expect participants' average monthly income from their own work to rise from USD 18 to USD 40, and the share who have a say in how household money is spent to rise from 31% to 55%. We request USD 682,000 from the Larkwell Foundation.

## 2. Context and need
Vessa Province has seen armed clashes on and off since 2019. Our 2026 rapid assessment in 14 villages found that four in ten households in Kalvero and Sorvane are headed by women, most of them widowed or separated by displacement. Women in these households rarely own land or tools, and their markets were cut off for long periods while roads were closed. Most now rely on day labour on other people's farms.
The assessment also found that women seldom sit on village committees, and that few have ever held savings of their own. Lenders in the district towns ask for a husband's or a father's signature. Women told us that what they want first is a steady way to earn, and second, a group to save with and talk with.
Kintara Women's Network has worked in both districts since 2017, running literacy circles and referral support for survivors of violence. We know the village leaders, the women's associations and the district social welfare offices.

## 3. Theory of change
If women affected by conflict gain skills that local markets pay for, a small and regular income while they learn, a safe place to save, and a group in which to talk through their rights and their choices, then they will earn more from their own work and have a greater say at home and in their community. Over time this will give them more control over their income and their lives.
The programme works in three cohorts of 400 women, one starting every year. Each cohort spends twelve months in training. Trainers from the district vocational centre teach tailoring, food processing, poultry and small trading, chosen from our 2026 market assessment, together with bookkeeping, pricing and customer care. Each woman receives a monthly stipend while she trains, so that she does not have to choose between class and the day labour her family relies on.
Women form 64 savings groups of about 19 members, which meet every month, keep their own record books and decide their own rules for saving and lending. Members can take small loans to buy tools and stock without a husband's or a father's signature. A trained community volunteer visits each group in its first six months to help with record keeping.
At the same time, women meet in 48 discussion groups of 25. A trained facilitator leads twelve sessions on rights, health, household budgeting and decision-making. Two sessions are open to husbands and village leaders, because a woman's new income can cause tension at home if the people around her are not part of the conversation.
We assume that markets stay open and that roads stay passable for most of the year. We also assume that village leaders keep their support, which they gave in writing during the assessment. Where these assumptions fail, cohorts will pause and restart rather than continue under unsafe conditions, and the risk will be reviewed with the Foundation.

## 4. MEAL plan
An external team will survey every participant at baseline, before her cohort starts training, and again at endline, twelve months later. The survey measures income from the woman's own work and her say over household spending, the two outcome indicators in the logframe. Attendance registers, payment records, group record books and facilitator logs track the outputs every month.
A MEAL officer checks a sample of records each quarter and reports to the programme team. A midline review after the first cohort tests whether the training trades still match what markets pay for.
Participants can give feedback through a free phone line run by staff outside the programme team, a suggestion box at each training site, and a meeting with each cohort every quarter. Every complaint is logged, answered within ten working days and reported to the Foundation every six months.

## 5. Safeguarding
All staff, trainers and facilitators sign our code of conduct and complete safeguarding and PSEA training before they meet participants. A named safeguarding focal point in each district takes reports in person or by phone. Our safeguarding and PSEA policy is attached as Annex C.
`;

// Spreadsheet exports carry plain numbers, no thousands separators.
const logframe = `level,code,result,indicator,baseline,target,means_of_verification
Impact,0,Women affected by conflict in Kalvero and Sorvane have more control over their income and their lives,% of participants who say they can meet their household's basic needs,24%,50%,Baseline and endline household survey
Outcome,1,Women earn a steadier income from their own work,Average monthly income from own enterprise (USD),18,40,Baseline and endline household survey
Outcome,2,Women have a greater say at home and in their community,% of participants who have a say in how household money is spent,31%,55%,Baseline and endline household survey
Output,1.1,Women complete vocational and business skills training,Women completing 12 months of training,0,1200,Attendance registers
Output,1.2,Women receive a monthly stipend while training,Women receiving all 12 stipend payments,0,1200,Payment records
Output,2.1,Savings groups are formed and keep meeting,Savings groups meeting at least monthly,0,64,Group record books
Output,2.2,Women's discussion groups complete the curriculum,Discussion groups completing all 12 sessions,0,48,Facilitator logs
`;

const budget = `line,category,description,units,unit_cost,total
1.1,Personnel,Programme staff (6 posts),216 person-months,1250,270000
1.2,Personnel,MEAL officer,36 months,1600,57600
2.1,Activities,Participant stipends,1150 participants,90,103500
2.2,Activities,Vocational and business skills training,1150 participants,60,69000
2.3,Activities,Women's discussion groups,48 groups,750,36000
2.4,Activities,Savings group start-up kits,64 groups,200,12800
3.1,MEAL,Baseline and endline household surveys (3 cohorts),6 survey rounds,4000,24000
3.2,MEAL,Midline review,1 review,7500,7500
4.1,Operations,Office and running costs,36 months,1100,39600
,Subtotal,Total direct costs,,,620000
5.1,Indirect,Indirect cost recovery (12% of direct costs),,,74400
,Total,Total request,,,694400
`;

const pack = `Submission folder: Loom and Ledger, Larkwell Foundation 2027 call
01 Cover sheet (cover.md)
02 Concept narrative (narrative.md)
03 Annex A, Logframe (logframe.csv)
04 Annex B, Detailed budget (budget.csv)
05 Annex C, Safeguarding and PSEA policy (safeguarding-psea-policy.pdf)
06 Annex D, Organisational chart (org-chart.pdf)
`;

export const files = {
  "call.md": call,
  "cover.md": cover,
  "narrative.md": narrative,
  "logframe.csv": logframe,
  "budget.csv": budget,
  "package.txt": pack,
};

export const fileNames = {
  "call.md": "call.md, the foundation's call",
  "cover.md": "cover.md, the cover sheet",
  "narrative.md": "narrative.md, the concept note",
  "logframe.csv": "logframe.csv, Annex A",
  "budget.csv": "budget.csv, Annex B",
  "package.txt": "package.txt, the submission folder",
};

// The requirement list, written from the call. One per line: clause, name, colon, rule.
export const requirements = `2.1 Budget ceiling: USD 750,000
2.2 Indirect costs: max 10% of direct costs
2.3 Duration: 24 to 36 months
3.1 Summary: max 150 words
3.2 Context and need: max 250 words
3.3 Theory of change: max 300 words
3.4 MEAL plan: max 200 words
3.5 Sustainability and exit: max 150 words
4.1 Annex: Logframe
4.1 Outcome indicators: baseline, target, means of verification
4.2 Annex: Budget
4.3 Annex: Safeguarding policy
4.4 Annex: Risk matrix
`;

// Figures that must read the same in every document that states them.
// Each place says where to look: a cover sheet field, a pattern inside a narrative section, or a spreadsheet cell.
export const figures = [
  {
    id: "women",
    name: "Women taking part",
    ask: "number of women taking part",
    unit: "women",
    places: [
      { file: "cover.md", field: "Women taking part" },
      { file: "narrative.md", section: "Summary", pattern: "([\\d,]+) women" },
      { file: "logframe.csv", key: ["code", "1.1"], col: "target" },
      { file: "budget.csv", key: ["line", "2.1"], col: "units" },
    ],
  },
  {
    id: "total",
    name: "Total request",
    ask: "total request",
    unit: "USD",
    places: [
      { file: "cover.md", field: "Total request" },
      { file: "narrative.md", section: "Summary", pattern: "request USD ([\\d,]+)" },
      { file: "budget.csv", key: ["description", "Total request"], col: "total" },
    ],
  },
  {
    id: "months",
    name: "Duration",
    ask: "duration",
    unit: "months",
    places: [
      { file: "cover.md", field: "Duration" },
      { file: "narrative.md", section: "Summary", pattern: "over (\\d+) months" },
      { file: "budget.csv", key: ["line", "4.1"], col: "units" },
    ],
  },
  {
    id: "groups",
    name: "Savings groups",
    ask: "number of savings groups",
    unit: "groups",
    places: [
      { file: "narrative.md", section: "Theory of change", pattern: "(\\d+) savings groups" },
      { file: "logframe.csv", key: ["code", "2.1"], col: "target" },
      { file: "budget.csv", key: ["line", "2.4"], col: "units" },
    ],
  },
];
