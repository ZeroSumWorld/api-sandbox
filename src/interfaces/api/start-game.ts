export interface ITeam {
    players: string[]
}

export interface StartGamePayload {
    matchId: string,
    tournamentId?: string,
    backUrl: string,
    rivals: ITeam[],
}

export interface StartGameEvent{
    games: StartGamePayload[]
}