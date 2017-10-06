import github from './minihub';

function parseTeamSpecifier(teamSpec) {
  const [org, team] = teamSpec.split('/');
  return { org, team };
}

async function getTeamId(teamSpec) {
  const { org, team } = parseTeamSpecifier(teamSpec);

  const teams = await github.getTeams({ org });
  return teams.find(t => t.name === team || t.slug === team);
}

async function getTeamMembership(teamSpec) {
  const teamId = await getTeamId(teamSpec);
  if (teamId) {
    const members = await github.getTeamMembers({ teamId });
    return members.map(member => member.login);
  }

  return [];
}

export { getTeamMembership as default, getTeamId, parseTeamSpecifier };
