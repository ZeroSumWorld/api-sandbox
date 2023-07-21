import fs from "fs";
import path from "path";
import Logger from "./logger";


export interface IConfig {
    gameId: string,
    syd: string,
    linkedPlayers: string[],
    playersInTeam: number,
    teamsInMatch: number,
    delayBeforeGames: number
}


//@ts-ignore
let config: IConfig = undefined;

export function Config(): IConfig {
    if(config) return config;
    const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "config.json")).toString()) as IConfig;
    if(!data) Logger.error("Failed to load config");
    config = data;
    return data;
}
