# Process Log

My notes while building the AI summary (ticket LW-7), in the order things happened.

## Setup
- Created a Node.js project with the Anthropic SDK. Model: Claude Haiku 4.5 (cheap and fast, good enough for a short summary).
- Made fake survey data with traps on purpose: a name in a comment ("Rafiq"), a role in a comment ("only designer"), one very negative person, and a small team of 3.

## v1: raw answers + "no names, no individual flags"
- Sent the whole team data (employee IDs, scores, comments) to the AI.
- No name leaked. But all 5 averages were wrong (workload 2.4 instead of 2.25). It said recognition was the lowest score (workload was). It turned one person's comment into "several team members feel overwhelmed". It paraphrased comments very closely.
- Also: IDs and raw comments went to an outside AI company.
- **Decision:** calculate numbers in code. Send only team-level numbers. No comments, no IDs.

## Small-team rule + team numbers (in code)
- Wrote `aggregate.js`. Less than 5 answers = stop, no AI call.
- Checked the averages by hand: 2.3 / 2.9 / 3.5 / 2.8 / 2.6. They matched.
- Design Team (3 answers) was blocked. ✅

## v2: numbers only + strict rules
- All numbers correct, no subgroup words, no comments. Cost went down 37% ($0.0023 → $0.0014).
- Still wrong: it said two scores had the biggest drop but missed a tie, it invented "workload distribution", and it ignored my format (added a title, 5 lines instead of 2–3).
- **Decision:** rules in a prompt are not a guarantee. Calculate rankings in code too, make the prompt stricter, and add a check in code with a retry and a safe backup.

## v3: check, retry, backup
- Tested the check with 4 bad summaries (name, "several team members", wrong number, 1:1 suggestion). All 4 blocked. ✅
- **First real run:** both tries blocked, the backup summary was shown. I was not saving the blocked text, so I could not tell if the AI broke the rules or my check was too strict. Added logging.
- **Second run, with logging:** the AI really broke the rules: its own headings, markdown, "workload distribution" again, "check-ins to understand specific stressors".
  - The format part was missing from my v3 prompt file. Fixed it.
  - Both tries gave the exact same text, because the input was the same at temperature 0. The retry was useless and cost money twice. Changed the retry to tell the AI what was wrong.
  - The check blocked it only because of the format. "workload distribution" and "specific stressors" would have passed. Added these words to the check.
- **Third run:** first try blocked for "most" ("the most pressing concern"). That was a false alarm, but I'm OK with it: it costs one extra call (~$0.001). The second try fixed it and passed. But "redistribute work" passed, because my check only matched words starting with "distribut".
- **Final run:** fixed the check to match anywhere in the text. First try blocked ("most" + "distribut"), second try passed with correct numbers and format. Design Team still blocked.

## Things I want to remember
- The AI is good at writing sentences, not at math or comparing numbers.
- A retry must change something, otherwise it gives the same answer.
- When a check blocks something, save what it blocked, or you can't debug it.
- A word list only catches words I already thought of. It doesn't understand meaning.
