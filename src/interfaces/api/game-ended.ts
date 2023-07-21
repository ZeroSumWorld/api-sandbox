export interface ITeamScore {
    players: string[],
    scores: number[]
}

export interface GameEndedEvent {
    matchId: string,
    tournamentId?: string,
    winners: {
        0: ITeamScore,
        1: ITeamScore,
        2?: ITeamScore,
    }
}