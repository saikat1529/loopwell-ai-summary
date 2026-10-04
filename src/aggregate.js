export const MIN_RESPONSES = 5;

// Clear meaning for every question, so the AI doesn't have to guess
export const QUESTION_LABELS = {
  workload: 'Workload feels manageable',
  energy: 'Energy level',
  manager_support: 'Support from manager',
  clarity: 'Clarity of priorities',
  recognition: 'Feeling recognised',
};

const round1 = (x) => Math.round(x * 10) / 10;

// Show a range, not the exact count
function responseRange(n) {
  if (n < 10) return '5-9';
  if (n < 20) return '10-19';
  return '20+';
}

export function aggregateTeam(team, questions) {
  const n = team.responses.length;

  // Small-team rule: below the minimum, stop here. The AI is never called.
  if (n < MIN_RESPONSES) {
    return { team_name: team.team_name, allowed: false, reason: 'below_threshold' };
  }

  const metrics = questions.map((q) => {
    const sum = team.responses.reduce((acc, r) => acc + r[q], 0);
    const average = round1(sum / n);
    const previous = team.previous_cycle_averages[q];
    return {
      question: QUESTION_LABELS[q],
      average,
      previous,
      change: round1(average - previous),
    };
  });

    // Ranking is calculated in code, so the AI never has to compare numbers
  const minChange = Math.min(...metrics.map((m) => m.change));
  const largest_drops = metrics.filter((m) => m.change === minChange).map((m) => m.question);

  return {
    team_name: team.team_name,
    allowed: true,
    response_range: responseRange(n),
    scale: '1 = very negative, 5 = very positive (higher is better for every question)',
    metrics,
    largest_drops,
  };
}