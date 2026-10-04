import 'dotenv/config';
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5-20251001';
const PROMPT_VERSION = 'v1';

// Set these from the current price on Anthropic's pricing page (USD per 1M tokens)
const PRICE_INPUT_PER_M = 1;   // $1 per 1M input tokens (Haiku 4.5)
const PRICE_OUTPUT_PER_M = 5;  // $5 per 1M output tokens (Haiku 4.5)

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from .env

const data = JSON.parse(fs.readFileSync('data/team-responses.json', 'utf8'));
const team = data.teams.find((t) => t.team_id === 'team-platform');

// v1 (naive): send the raw team data, including comments and employee IDs
const template = fs.readFileSync('prompts/v1-prompt.md', 'utf8');
const prompt = template.replace('{{TEAM_DATA}}', JSON.stringify(team, null, 2));

const start = Date.now();
const msg = await client.messages.create({
  model: MODEL,
  max_tokens: 600,
  messages: [{ role: 'user', content: prompt }],
});
const latencyMs = Date.now() - start;

const text = msg.content[0].text;
const { input_tokens, output_tokens } = msg.usage;
const cost =
  (input_tokens * PRICE_INPUT_PER_M + output_tokens * PRICE_OUTPUT_PER_M) / 1_000_000;

const report = `# Output ${PROMPT_VERSION}

- Model: ${MODEL}
- Team: ${team.team_name}
- Input tokens: ${input_tokens}
- Output tokens: ${output_tokens}
- Latency: ${latencyMs} ms
- Estimated cost: $${cost.toFixed(5)}

---

${text}
`;

fs.writeFileSync(`outputs/${PROMPT_VERSION}-output.md`, report);
console.log(report);