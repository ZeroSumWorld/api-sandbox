export interface ITeam {
    players: string[],
    score?: number[]
}

export interface IMatch {
    id: string,
    tournamentId?: string,
    teams: ITeam[],
    timestamp?: number;
}

export interface ITournament {
    id: string,
    teams: ITeam[],
    gamesInStageLeft: number,
    nextStagePlayers: ITeam[]
}

export interface IGame {
    id: string,
    syd: string,
    matches: Map<string, IMatch>,
    tournaments: Map<string, ITournament>,
}