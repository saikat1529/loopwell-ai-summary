import 'dotenv/config';
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { aggregateTeam } from './aggregate.js';
import { checkSummary, templateSummary } from './checks.js';

const MODEL = 'claude-haiku-4-5-20251001';
const PROMPT_VERSION = 'v3';
const PRICE_INPUT_PER_M = 1;
const PRICE_OUTPUT_PER_M = 5;
const MAX_ATTEMPTS = 2; // first try + one retry

const client = new Anthropic();
const data = JSON.parse(fs.readFileSync('data/team-responses.json', 'utf8'));
const system = fs.readFileSync(`prompts/${PROMPT_VERSION}-system.md`, 'utf8');

let report = `# Output ${PROMPT_VERSION} (with automatic check)\n\n- Model: ${MODEL}\n`;

for (const team of data.teams) {
    const agg = aggregateTeam(team, data.questions);
    report += `\n---\n\n## ${team.team_name}\n\n`;

    if (!agg.allowed) {
        report += 'Not enough responses this week to protect anonymity. (AI not called)\n';
        continue;
    }

    let finalText = null;
    let totalCost = 0;
    const messages = [{ role: 'user', content: JSON.stringify(agg, null, 2) }];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const start = Date.now();
        const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 400,
            temperature: 0,
            system,
            messages,
        });
        const latencyMs = Date.now() - start;
        const text = msg.content[0].text;
        const { input_tokens, output_tokens } = msg.usage;
        totalCost += (input_tokens * PRICE_INPUT_PER_M + output_tokens * PRICE_OUTPUT_PER_M) / 1_000_000;

        const result = checkSummary(text, agg, data.roster_names);
        report += `- Attempt ${attempt}: ${result.passed ? 'PASSED' : 'BLOCKED (' + result.problems.join('; ') + ')'} (${latencyMs} ms)\n`;

        if (!result.passed) {
            report += `\n  Blocked text:\n\n\`\`\`\n${text}\n\`\`\`\n\n`;
            messages.push({ role: 'assistant', content: text });
            messages.push({
                role: 'user',
                content: `Your summary broke these rules: ${result.problems.join('; ')}. Rewrite it. Follow every rule and use exactly the three sections from the format, in plain text.`,
            });
        }

        if (result.passed) {
            finalText = text;
            break;
        }
    }

    if (!finalText) {
        finalText = templateSummary(agg);
        report += '- Both attempts failed: showing the numbers-only template\n';
    }

    report += `- Total cost: $${totalCost.toFixed(5)}\n\n**What the manager sees:**\n\n${finalText}\n`;
}

fs.writeFileSync(`outputs/${PROMPT_VERSION}-output.md`, report);
console.log(report);