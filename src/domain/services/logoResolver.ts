export const resolveTeamLogo = (
  teamLogoUrl: string | null,
  tournamentLogoUrl: string,
  localDefaultLogoUrl: string,
): string => {
  if (teamLogoUrl) return teamLogoUrl
  if (tournamentLogoUrl) return tournamentLogoUrl
  return localDefaultLogoUrl
}
