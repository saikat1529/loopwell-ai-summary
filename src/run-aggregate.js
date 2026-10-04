import fs from 'node:fs';
import { aggregateTeam } from './aggregate.js';

const data = JSON.parse(fs.readFileSync('data/team-responses.json', 'utf8'));

for (const team of data.teams) {
  console.log(JSON.stringify(aggregateTeam(team, data.questions), null, 2));
}