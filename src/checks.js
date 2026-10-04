const SUBGROUP_WORDS = ['someone', 'some', 'several', 'a few', 'many', 'most', 'team member', 'employee', 'individual', 'person', 'people', 'one of'];
const MEDICAL_WORDS = ['burnout', 'burned out', 'burnt out', 'depress', 'anxiety', 'mental health', 'diagnos'];
const ONE_TO_ONE = ['1:1', 'one-on-one', 'one on one'];
const SECTIONS = ['Overall mood:', 'What changed:', 'Suggested team action:'];
const MAX_WORDS = 150;
const OFF_LIMITS = ['distribut', 'check-in', 'stressor', 'specific'];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, w) => new RegExp(`\\b${escape(w)}`, 'i').test(text);

export function checkSummary(text, agg, rosterNames) {
    const problems = [];

    // 1. No names from the roster
    for (const name of rosterNames) {
        if (new RegExp(`\\b${escape(name)}\\b`, 'i').test(text)) problems.push(`name found: ${name}`);
    }

    // 2. No words pointing to part of the team
    for (const w of SUBGROUP_WORDS) if (hasWord(text, w)) problems.push(`subgroup word: "${w}"`);

    // 3. No medical words, no 1:1 suggestions
    for (const w of MEDICAL_WORDS) if (hasWord(text, w)) problems.push(`medical word: "${w}"`);
    for (const w of OFF_LIMITS) if (text.toLowerCase().includes(w)) problems.push(`off-limits wording: "${w}"`);
    for (const w of ONE_TO_ONE) if (text.toLowerCase().includes(w)) problems.push(`1:1 suggestion: "${w}"`);

    // 4. Every number must exist in the input
    const allowed = new Set(['1.0', '5.0']); // scale numbers
    for (const m of agg.metrics) {
        allowed.add(m.average.toFixed(1));
        allowed.add(m.previous.toFixed(1));
        allowed.add(Math.abs(m.change).toFixed(1));
    }
    for (const x of agg.response_range.match(/\d+/g) || []) allowed.add(Number(x).toFixed(1));
    for (const n of text.match(/\d+(\.\d+)?/g) || []) {
        if (!allowed.has(Number(n).toFixed(1))) problems.push(`number not in input: ${n}`);
    }

    // 5. Format and length
    if (!text.trim().startsWith('Overall mood:')) problems.push('extra text before "Overall mood:"');
    for (const s of SECTIONS) if (!text.includes(s)) problems.push(`missing section: ${s}`);
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words > MAX_WORDS) problems.push(`too long: ${words} words`);

    return { passed: problems.length === 0, problems };
}

// Safe fallback: built from numbers only, no AI text
export function templateSummary(agg) {
    const lines = agg.metrics.map(
        (m) => `- ${m.question}: ${m.average} (${m.change >= 0 ? '+' : ''}${m.change} vs last cycle)`
    );
    return `Overall mood:
This week's summary is shown from the team's numbers only.

What changed:
${lines.join('\n')}

Suggested team action:
Review these trends together in your next team meeting.`;
}