import 'dotenv/config';
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { aggregateTeam } from './aggregate.js';

const MODEL = 'claude-haiku-4-5-20251001';
const PROMPT_VERSION = 'v2';
const PRICE_INPUT_PER_M = 1;
const PRICE_OUTPUT_PER_M = 5;

const client = new Anthropic();
const data = JSON.parse(fs.readFileSync('data/team-responses.json', 'utf8'));
const system = fs.readFileSync('prompts/v2-system.md', 'utf8');

let report = `# Output ${PROMPT_VERSION}\n\n- Model: ${MODEL}\n`;

for (const team of data.teams) {
  const agg = aggregateTeam(team, data.questions);

  // Small-team rule: no AI call at all
  if (!agg.allowed) {
    report += `\n---\n\n## ${team.team_name}\n\nNot enough responses this week to protect anonymity. (AI not called)\n`;
    continue;
  }

  const start = Date.now();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    temperature: 0, // more consistent output between runs
    system,
    messages: [{ role: 'user', content: JSON.stringify(agg, null, 2) }],
  });
  const latencyMs = Date.now() - start;

  const text = msg.content[0].text;
  const { input_tokens, output_tokens } = msg.usage;
  const cost = (input_tokens * PRICE_INPUT_PER_M + output_tokens * PRICE_OUTPUT_PER_M) / 1_000_000;

  report += `\n---\n\n## ${team.team_name}\n\n- Input sent to AI: team-level numbers only\n- Input tokens: ${input_tokens}\n- Output tokens: ${output_tokens}\n- Latency: ${latencyMs} ms\n- Estimated cost: $${cost.toFixed(5)}\n\n${text}\n`;
}

fs.writeFileSync(`outputs/${PROMPT_VERSION}-output.md`, report);
console.log(report);