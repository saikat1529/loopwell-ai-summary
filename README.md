# Loopwell: Weekly AI Team Summary (first try)

This is my Part 3 for the Audacity Ventures take-home. I built ticket **LW-7 (Generate the weekly AI summary)** from my Jira list.

The idea is simple: a manager gets a short summary of how their team is doing, in plain English. But nothing in it should help the manager guess who said what.

## How it works

```
survey answers
  -> I calculate team numbers in code (averages, change from last week)
  -> if less than 5 people answered: stop here, no AI call
  -> AI (Claude Haiku 4.5) writes the summary using only these numbers
  -> my code checks the summary (names, risky words, wrong numbers, format)
  -> if the check fails: ask the AI again and tell it what was wrong
  -> if it fails again: show a simple summary made from numbers only
  -> manager sees the result
```

The AI never sees names, employee IDs, single answers or comments.

## Files

| File | What it does |
|---|---|
| `data/team-responses.json` | Fake survey data. One team of 8 people and one team of 3 |
| `prompts/v1-prompt.md` | My first prompt (simple) |
| `prompts/v2-system.md` | Second prompt with strict rules |
| `prompts/v3-system.md` | Final prompt |
| `src/aggregate.js` | Calculates team numbers and applies the small-team rule |
| `src/checks.js` | Checks the AI summary, and builds the numbers-only summary |
| `src/test-checks.js` | Tests the check with 4 bad summaries |
| `src/summarize.js` | The final version that runs everything |
| `outputs/` | The output of every version |
| `PROCESS-LOG.md` | My notes while I was working |

To run it: put your `ANTHROPIC_API_KEY` in `.env`, then run `npm install` and `node src/summarize.js`.

## I added traps in the test data

I wanted to see if the AI would fall into them:
- A comment with a person's name ("Since Rafiq joined...")
- A comment that shows someone's role ("As the only designer on this team...")
- One person who is much more negative than everyone else
- A small team with only 3 answers

## What happened in each version

### Version 1: I sent all the raw answers
I sent everything to the AI, with one rule: "no names, no flags on individuals".

At first it looked fine, because no name came out. But when I checked it carefully:
- **All 5 averages were wrong.** For example, it said workload was 2.4, but the real number was 2.25. It said it very confidently.
- It said recognition was the lowest score. That was wrong, workload was the lowest.
- **One person's** comment became "several team members feel overwhelmed".
- Some sentences were very close to the original comments. The person who wrote them could recognise their own words.
- I also sent employee IDs and raw comments to an outside AI company. That is a privacy problem by itself.

**What I changed:** I calculate the numbers in my own code, and I send the AI only team numbers. No comments, no IDs.

### Version 2: only numbers, with strict rules
This was much better. All numbers were correct, there were no words like "some" or "several", and it was 37% cheaper.

But it still made mistakes:
- It said two scores had the biggest drop, but it missed a third one with the same drop.
- It talked about "workload distribution", but my numbers say nothing about how work is shared inside the team.
- It did not follow my format.

**What I learned:** writing rules in the prompt is not enough. The AI does not follow them every time. So I needed a check in my code.

### Version 3: check, retry and a safe backup
First, I tested my check with 4 bad summaries (a name, "several team members", a wrong number, a 1:1 suggestion). It blocked all 4.

Then I ran the real thing, and some things went wrong. That's where I learned the most:
- **Everything was blocked**, and I did not know why. I was not saving the blocked text. So I added that.
- After that I could see the AI really broke the rules. It used its own headings, and it suggested "check-ins to understand specific stressors". I also found that my v3 prompt file was missing the format part, so I fixed it.
- **The second try gave the exact same answer** as the first one. I sent the same input with temperature 0, so of course I got the same result, and I paid twice. Now, on the second try, I tell the AI exactly what was wrong. After this change, the second try fixed the problem.
- **"redistribute work" passed my check.** My check only looked for words starting with "distribut", so "redistribute" got through. I fixed it, but this showed me that a word list only catches words I already thought of. It does not understand meaning.

**Final result for the Platform Team** (first try blocked, second try passed):

> Overall mood: The Platform Team is experiencing a significant decline across all areas. Workload has become the primary concern, with manageable workload dropping 0.8 points to 2.3.
>
> What changed: Workload feels manageable fell from 3.1 to 2.3. Energy level decreased from 3.6 to 2.9. Feeling recognised dropped from 3.3 to 2.6.
>
> Suggested team action: Conduct a workload review with the team to identify current priorities and assess capacity needs.

**Design Team (3 answers):** "Not enough responses this week to protect anonymity." The AI was not called at all.

## My reflection

### Where I trusted the AI
- **Writing.** When the numbers are already correct, it is good at turning them into easy sentences.
- **Fixing a problem when I tell it exactly what is wrong.** The second try with feedback worked well.

### Where I did not trust it
- **Math.** In v1 every average was wrong. So all numbers come from my code now.
- **Comparing scores.** It got this wrong in v1 and v2. My code finds the biggest drop now. The final summary still says "the primary concern". It is true this time, but my check does not verify it.
- **Following rules every time.** The same prompt gave different answers on different runs.
- **Privacy words.** It kept talking about how work is shared inside the team, even after I told it not to.

### Cost and speed (from my real runs)

| Version | Cost per team | Time |
|---|---|---|
| v1 | $0.0023 | 4.6 s |
| v2 | $0.0014 | 3.5 s |
| v3 (with one retry) | $0.0028 | 2.1 s + 1.3 s |

A company with 2,000 employees has around 200 teams. Even if every team needs a retry, it costs about **$0.56 per week**. So cost is not the real risk here. Trust is.

This job runs once a week and is not urgent. So it can use Anthropic's Batch API, which is 50% cheaper, and a few seconds per team is no problem.

My check sometimes blocks a safe sentence. For example, it blocked "the most pressing concern" because of the word "most". I'm OK with that. A false alarm costs one extra call (around $0.001). A missed leak can cost the employees' trust.

### When the AI makes things up
- **A made-up number** gets blocked, because every number must exist in the input.
- **Risky wording** gets blocked only if the word is in my list. This is the weak point.
- If the check fails twice, the manager sees the **numbers-only summary**. It is not as friendly, but it is always correct and always safe.

### What I would add before running this for real employees, without anyone watching
1. **A second AI that only checks meaning.** It answers simple yes/no questions, like "Does this point to some people in the team?". This covers what my word list misses.
2. **Loopwell staff read some summaries** in the first weeks for each customer. They only see the summary and the team numbers, never the raw answers.
3. **Monitoring:** how often summaries get blocked, how often the backup is used, cost, and time per customer. If the backup is used too often, the prompt or the check needs fixing.
4. **Privacy tests in CI** (ticket LW-12). Any change to the prompt or the model must pass them first.
5. **A clear agreement with the AI company:** they don't train on our data, and they tell us how long they keep it.
6. **A backup when the AI service is down:** show the numbers-only summary, so managers still get something correct.

### What this first try does not do yet
- It does not merge small teams into their department, or combine weeks. For now, small teams are just hidden.
- I only tested with one realistic team, and only in English.