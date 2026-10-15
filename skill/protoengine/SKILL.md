---
name: protoengine
description: Marks a project, hackathon, startup or side-project idea like an exam answer. Scores six criteria from 0 to 10 with reasons (real problem, worth solving, not already done, something new, within reach, someone wants it), checks GitHub and Hacker News for existing work, and gives a mark out of 10 with a verdict of Build, Narrow it down, Rethink or Drop. Use when someone asks whether an idea is good, worth building, original or already done, wants feedback or a score on an idea, or is choosing between ideas.
license: MIT
compatibility: Works in any agent. Uses the ProtoEngine MCP tools when connected; otherwise needs Node.js 18+ and internet access to run the bundled scripts.
metadata:
  author: IAbdullahSlash
  version: "0.1.0"
  homepage: https://github.com/IAbdullahSlash/ProtoEngine
---

# ProtoEngine: mark an idea like an exam answer

You are the examiner. Be strict but fair: 5 is an average idea, and most ideas
should land between 4 and 7. Every mark needs a specific reason. The overall
mark is calculated, never estimated.

## 1. Get the answer sheet

You need the **idea**: what it is and what problem it solves, in at least a
sentence or two. These four details change the marks, so ask for any that are
missing in a single short question, then continue with what you have:

- **Purpose**: hackathon, startup, coursework, side project
- **Users**: who it is for
- **Weeks available** to build it
- **Team skills**

If the user gives a photo or sketch of the idea, read the idea from it first.

## 2. If the ProtoEngine tools are available, use them

If you can call `start_evaluation` (the ProtoEngine MCP connector), call it
with `idea`, `purpose`, `users`, `weeks` and `skills`, and stop here. It
searches for evidence and marks the idea on Gemma 4, the same way as the
website. Show the mark, verdict, six reasons and closest matches **as
returned**, plus the link. Do not re-score or soften them.

- `research_market` gives only the "who is already doing it" part.
- `get_evaluation` fetches an earlier evaluation by its 10-character id.

Otherwise, mark the idea yourself with steps 3 to 6.

## 3. Collect evidence

"Not already done" and "Something new" must be marked against real projects,
not memory. Pick 3 or 4 search queries of two plain keywords each, pairing the
core object or action with one distinguishing feature, such as
`whatsapp inventory` or `voice bookkeeping`. Then run:

```bash
node scripts/evidence.mjs "whatsapp inventory" "voice bookkeeping" "stock tracker"
```

It searches GitHub repositories and Hacker News stories (no keys needed) and
prints numbered results with links. Set `GITHUB_TOKEN` if GitHub's rate limit
is hit. If you cannot run scripts but can browse the web, search GitHub and
Hacker News yourself. **Only cite links that a search actually returned.**
If you found no evidence at all, say so in the report.

## 4. Mark the six criteria

Read [the mark scheme](references/mark-scheme.md) for what each score means.
Give each criterion a whole number from 0 to 10 and a one- or two-sentence
reason that refers to this idea:

| Key | Criterion | Question |
| --- | --- | --- |
| `real_problem` | Real problem | Is this a problem people actually have, today? |
| `worth_solving` | Worth solving | Is the pain big or frequent enough that solving it matters? |
| `not_already_done` | Not already done | Is it free of an existing tool that already solves it well? |
| `something_new` | Something new | Does it bring a new angle, method or insight? |
| `within_reach` | Within reach | Can this team build a working version in the weeks they have, with their skills? |
| `someone_wants_it` | Someone wants it | Is there a specific group who would use or pay for it? |

For `not_already_done`, name the closest existing project from your evidence.
For `within_reach`, use the weeks and skills given; if they are unknown, say
what you assumed.

## 5. Calculate the mark in code

Do not do the arithmetic in your head. Pass the six scores, in the table's
order, to:

```bash
node scripts/mark.mjs 8 6 4 7 7 9
```

It prints the mark (the mean, to one decimal place) and the verdict:

| Mark | Verdict |
| --- | --- |
| 7.5 or more | Build |
| 5.5 to 7.4 | Narrow it down |
| 3.5 to 5.4 | Rethink |
| below 3.5 | Drop |

If you cannot run scripts, compute the mean with whatever calculation tool you
have, and state the sum and the division so the user can check them.

## 6. Write the report

Use this shape:

```markdown
## Mark: 6.8/10 · Narrow it down

| Criterion | Mark | Why |
| --- | --- | --- |
| Real problem | 8 | ... |
| ... | ... | ... |

**Who is already doing it:** 2 or 3 sentences, citing the closest matches by name with their links.

**Room left:** what this idea does that none of the results do, or plainly that one already covers it.

**To raise the mark:** the one or two changes that would lift the lowest criteria.
```

Keep the verdict honest. If "Not already done" is low because a mature tool
exists, say which one, and suggest a narrower angle rather than inflating the
score.

## Edge cases

- **Idea too vague to mark** (a single phrase like "an app for students"): ask
  what it does and for whom before marking.
- **Several ideas**: mark each one separately, then rank them by mark.
- **The user disagrees with a mark**: re-mark only if they give new
  information, such as users interviewed or a narrower scope, and say what
  changed.
