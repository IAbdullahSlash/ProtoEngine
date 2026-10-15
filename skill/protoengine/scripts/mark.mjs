#!/usr/bin/env node
// Turns the six criterion scores into ProtoEngine's mark and verdict, so the
// arithmetic is done in code, never by the model.
//
// Usage: node scripts/mark.mjs <real_problem> <worth_solving> <not_already_done>
//                              <something_new> <within_reach> <someone_wants_it>

const CRITERIA = [
  "Real problem",
  "Worth solving",
  "Not already done",
  "Something new",
  "Within reach",
  "Someone wants it",
];

const args = process.argv.slice(2);
if (args.length !== CRITERIA.length) {
  console.error(`Expected ${CRITERIA.length} scores (one per criterion, in order), got ${args.length}.`);
  console.error("Usage: node scripts/mark.mjs 8 6 4 7 7 9");
  process.exit(1);
}

const scores = args.map(Number);
const bad = scores.findIndex((s) => !Number.isInteger(s) || s < 0 || s > 10);
if (bad !== -1) {
  console.error(`"${args[bad]}" (${CRITERIA[bad]}) is not a whole number from 0 to 10.`);
  process.exit(1);
}

const sum = scores.reduce((a, b) => a + b, 0);
const mark = Math.round((sum / scores.length) * 10) / 10;
const verdict = mark >= 7.5 ? "Build" : mark >= 5.5 ? "Narrow it down" : mark >= 3.5 ? "Rethink" : "Drop";

CRITERIA.forEach((c, i) => console.log(`${c.padEnd(17)} ${scores[i]}`));
console.log(`Sum ${sum} / ${scores.length} = ${mark.toFixed(1)}`);
console.log(`Mark: ${mark.toFixed(1)}/10`);
console.log(`Verdict: ${verdict}`);
