import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import {websocketServerInstance} from "./websocket-server"
import {LinkTokenPayload} from "./interfaces/api/link-token";
import Logger from "./logger";
import {Config} from "./config";
import {LinkUserPayload} from "./interfaces/methods/link-user";
import {CreateGamePayload} from "./interfaces/methods/create-game";
import {CreateTournamentPayload} from "./interfaces/methods/create-tournament";

export const app = express();
dotenv.config();
app.use(express.json())
app.use(cors());


app.post('/link-user', (req, res) => {
    try {
        const data: LinkUserPayload = req.body;
        const decoded: LinkTokenPayload | undefined = websocketServerInstance.verifyToken<LinkTokenPayload>(data.token);
        if(decoded) {
            if(decoded.gameId != Config().gameId) {
                Logger.error("Invalid gameId in Link Token");
                throw "";
            }
            if(websocketServerInstance.playerExists(decoded.playerId)) {
                Logger.warn("User already exits");
                throw "";
            }
            websocketServerInstance.linkUser(decoded.playerId);
        }
        else {
            Logger.error("Invalid Link Token");
            throw "";
        }
    }
    catch (_e) {}
    return res.status(200).json({msg: Logger.lastMessage});
});


app.post('/create-quickgame', (req, res) => {
    try {
        const data: CreateGamePayload = req.body as CreateGamePayload;
        if(data.teamsCount !== Config().teamsInMatch) {
            Logger.error("Invalid number of teams for a single match");
            throw "";
        }
        if(websocketServerInstance.playersCount < Config().teamsInMatch*Config().playersInTeam) {
            Logger.error("Insufficient number of players for a match");
            throw "";
        }
        if(data.teams) {
            if(data.teamsCount !== data.teams.length) {
                Logger.error("Invalid number of provided teams");
                throw "";
            }
            let index = 0;
            let players: Set<string> = new Set();
            data.teams.forEach((team) => {
                if(team.players.length != Config().playersInTeam) {
                    Logger.error("Invalid number of player in team:", index);
                    throw "";
                }
                team.players.forEach((player) => {
                    if(!websocketServerInstance.playerExists(player)) {
                        Logger.error("Player not exists:", player);
                        throw "";
                    }
                    if(players.has(player)) {
                        Logger.error("Player was used twice:", player);
                        throw "";
                    }
                    players.add(player);
                });
                index++;
            });
        }
        websocketServerInstance.createQuickgame(data.teamsCount, data.teams);
        Logger.success("Successfully created Quikcgame");
    }
    catch (_e) {}
    return res.status(200).json({msg: Logger.lastMessage});
});


app.post('/create-tournament', (req, res) => {
    try {
        const data: CreateTournamentPayload = req.body as CreateTournamentPayload;
        if(data.teamsCount < Config().teamsInMatch) {
            Logger.error("Invalid number of teams for a tournament");
            throw "";
        }
        if(websocketServerInstance.playersCount < Config().teamsInMatch*Config().playersInTeam) {
            Logger.error("Insufficient number of players for a tournament");
            throw "";
        }
        if(data.teams) {
            if(data.teamsCount !== data.teams.length) {
                Logger.error("Invalid number of provided teams");
                throw "";
            }
            let index = 0;
            let players: Set<string> = new Set();
            data.teams.forEach((team) => {
                if(team.players.length != Config().playersInTeam) {
                    Logger.error("Invalid number of player in team:", index);
                    throw "";
                }
                team.players.forEach((player) => {
                    if(!websocketServerInstance.playerExists(player)) {
                        Logger.error("Player not exists:", player);
                        throw "";
                    }
                    if(players.has(player)) {
                        Logger.error("Player was used twice:", player);
                        throw "";
                    }
                    players.add(player);
                });
                index++;
            });
        }
        websocketServerInstance.createTournament(data.teamsCount, data.teams);
        Logger.success("Successfully created Tournament");
    }
    catch (_e) {}
    return res.status(200).json({msg: Logger.lastMessage});
});


export default app;