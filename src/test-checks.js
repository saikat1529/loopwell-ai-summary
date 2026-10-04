import fs from 'node:fs';
import { aggregateTeam } from './aggregate.js';
import { checkSummary } from './checks.js';

const data = JSON.parse(fs.readFileSync('data/team-responses.json', 'utf8'));
const agg = aggregateTeam(data.teams[0], data.questions);

const badExamples = {
  'leaks a name': 'Overall mood:\nMorale is low since Rafiq joined.\n\nWhat changed:\nWorkload fell to 2.3.\n\nSuggested team action:\nHold a team meeting.',
  'points to a subgroup': 'Overall mood:\nSeveral team members feel overwhelmed.\n\nWhat changed:\nWorkload fell to 2.3.\n\nSuggested team action:\nHold a team meeting.',
  'invents a number': 'Overall mood:\nThe team is tired.\n\nWhat changed:\nWorkload fell to 2.4.\n\nSuggested team action:\nHold a team meeting.',
  'suggests a 1:1': 'Overall mood:\nThe team is tired.\n\nWhat changed:\nWorkload fell to 2.3.\n\nSuggested team action:\nSchedule 1:1 check-ins.',
};

for (const [label, text] of Object.entries(badExamples)) {
  const result = checkSummary(text, agg, data.roster_names);
  console.log(`${result.passed ? '❌ NOT CAUGHT' : '✅ BLOCKED'}  ${label}  ->  ${result.problems.join('; ')}`);
}