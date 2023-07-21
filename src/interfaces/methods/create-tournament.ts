export interface CreateTournamentPayload {
    teamsCount: number,
    teams?: { players: string[] }[]
}