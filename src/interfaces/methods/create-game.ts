export interface CreateGamePayload {
    teamsCount: number,
    teams?: { players: string[] }[]
}