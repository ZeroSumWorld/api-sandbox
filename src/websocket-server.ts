import {Server, Socket} from "socket.io";
import Logger from "./logger";
import {GameStartedEvent} from "./interfaces/api/game-started";
import {GameEndedEvent, ITeamScore} from "./interfaces/api/game-ended";
import {Config} from "./config";
import {delay} from "./utils";
import dotenv from "dotenv";
import {IGame, IMatch, ITournament} from "./interfaces/websocket.interfaces";
import {AuthTokenPayload} from "./interfaces/api/auth-token";
const keccak256 = require('keccak256')
dotenv.config();
const jwt = require("jsonwebtoken");

//@ts-ignore
export let websocketServerInstance: WebsocketServer = undefined;


export class WebsocketServer {
    players: Map<string, number> = new Map(); // backendId => playerId
    games: Map<string, IGame> = new Map();
    playersCount: number = 0;
    sockets: Map<string, Socket> = new Map(); // gameId=> socket

    constructor() {
        const config = Config();
        config.linkedPlayers.forEach((playerId) => {
            this.linkUser(playerId);
        });
        websocketServerInstance = this;
    }

    async start() {
        return new Promise((resolve, reject) => {
            const io = new Server();

            io.use((socket, next) => {
                const token = socket.handshake.auth.token;
                const decoded = this.verifyToken<AuthTokenPayload>(token);
                if(!decoded) {
                    Logger.error("Invalid authorization token signature, connection will be closed");
                    socket.disconnect(true);
                    const err = new Error("not authorized"); //@ts-ignore
                    err.data = { content: "Invalid authorization token signature" };
                    next(err);
                }
                if(decoded?.gameId !== Config().gameId) {
                    Logger.error("Invalid gameId in authorization token, connection will be closed");
                    socket.disconnect(true);
                    const err = new Error("not authorized"); //@ts-ignore
                    err.data = { content: "Invalid gameId in authorization token" };
                    next(err);
                }
                next();
            });

            io.on("connection", async (socket) => {
                const gameId: string = Config().gameId;
                this.games.set(gameId, {
                    id: gameId,
                    syd: Config().syd,
                    matches: new Map(),
                    tournaments: new Map()
                } as IGame)
                this.sockets.set(gameId, socket); //@ts-ignore
                socket["gameId"] = gameId;
                Logger.success("Game connected:", gameId);

                socket.on("disconnect", () => {
                    Logger.warn("Game disconnected:", gameId);
                    this.sockets.delete(gameId);
                });

                socket.on("gameStarted", (data: GameStartedEvent) => {
                    if(!this.checkMatchStart(data)) return;
                    Logger.debug("Match started:", data.matchId, "at", data.timestamp);
                });

                socket.on("gameEnded", (data: GameEndedEvent) => {
                    if(!this.checkMatchResult(data)) return;
                    Logger.debug("Match ended:", data.matchId, "winners:", ...data.winners['0'].players);
                    this.processMatchResult(data);
                });
            });
            Logger.debug("Socket server starts on PORT:", process.env.SOCKET_PORT)
            //@ts-ignore
            io.listen(process.env.SOCKET_PORT);
        });
    }

    linkUser(playerId: string): number { // -> backendId
        this.players.set(playerId, this.playersCount);
        this.playersCount += 1;
        Logger.success("Player:", playerId, "linked to user:", this.playersCount - 1);
        return this.playersCount - 1;
    }

    async createQuickgame(teamsCount: number, teams?: {players: string[]}[]) {
        const gameId: string = Config().gameId; //@ts-ignore
        const socket: Socket = this.sockets.get(gameId);
        if(!teams) {
            teams = [];
            const iter = this.players.keys();
            for(let i = 0; i < Config().teamsInMatch; i++) {
                let players: string[] = [];
                for(let j = 0; j < Config().playersInTeam; j++) {
                    players.push(iter.next().value);
                }
                teams.push({
                    players: players
                });
            }
        }
        const match: IMatch = {
            id: this.nextMatchId(),
            teams: teams
        } //@ts-ignore
        this.games.get(gameId).matches.set(match.id, match);
        await delay(Config().delayBeforeGames*1000);
        socket.emit("startGame", {
                games: [
                    {
                        matchId: match.id,
                        rivals: match.teams
                    }
                ]
            }
        );
        Logger.debug("startGame event sent with matchId:", match.id);
    }

    async sendTournamentStage(tournamentId: string) {
        const gameId: string = Config().gameId; //@ts-ignore
        const socket: Socket = this.sockets.get(gameId); //@ts-ignore
        const game: IGame = this.games.get(gameId) //@ts-ignore
        const tournament: ITournament = game.tournaments.get(tournamentId);
        let matches: IMatch[] = [];
        tournament.gamesInStageLeft = 0;
        if(tournament.nextStagePlayers.length == 1) {
            Logger.success("Tournament ended:", tournamentId, "with winners:", ...tournament.nextStagePlayers[0].players);
            return;
        }
        while(tournament.nextStagePlayers.length >= Config().teamsInMatch) {
            const match: IMatch = {
                id: this.nextMatchId(),
                tournamentId: tournamentId,
                teams: tournament.nextStagePlayers.slice(0, Config().teamsInMatch)
            }
            matches.push(match);
            tournament.nextStagePlayers = tournament.nextStagePlayers.slice(Config().teamsInMatch);
            tournament.gamesInStageLeft ++;
            game.matches.set(match.id, match);
        }
        if(tournament.nextStagePlayers.length > 1) {
            const match: IMatch = {
                id: this.nextMatchId(),
                tournamentId: tournamentId,
                teams: tournament.nextStagePlayers
            }
            matches.push(match);
            tournament.nextStagePlayers = [];
            tournament.gamesInStageLeft ++;
            game.matches.set(match.id, match);
        }
        await delay(Config().delayBeforeGames*1000);
        socket.emit("startGame", {
                games: matches.map((match) => {return {
                    tournamentId: tournamentId,
                    matchId: match.id,
                    rivals: match.teams
                }})
            }
        );
        Logger.debug("Started tournament stage with matchIds:", ...matches.map(match => match.id));
    }

    async createTournament(teamsCount: number, teams?: {players: string[]}[]) {
        if(!teams) {
            teams = [];
            const iter = this.players.keys();
            for(let i = 0; i < teamsCount; i++) {
                let players: string[] = [];
                for(let j = 0; j < Config().playersInTeam; j++) {
                    players.push(iter.next().value);
                }
                teams.push({
                    players: players
                });
            }
        }
        const tournament = {
            id: this.nextTournamentId(),
            gamesInStageLeft: 0,
            nextStagePlayers: teams,
        } as ITournament; //@ts-ignore
        this.games.get(Config().gameId).tournaments.set(tournament.id, tournament);
        this.sendTournamentStage(tournament.id);
    }

    playerExists(playerId: string): boolean {
        return this.players.has(playerId);
    }

    checkMatchStart(data: GameStartedEvent): boolean {
        if(!data) {
            Logger.debug("Invalid start match event payload");
            return false;
        } //@ts-ignore
        if(!this.games.get(Config().gameId).matches.has(data.matchId)) {
            Logger.debug("Invalid matchId on GameStarted Event");
            return false;
        } //@ts-ignore
        this.games.get(Config().gameId).matches.get(data.matchId).timestamp = data.timestamp
        return true;
    }

    checkMatchResult(data: GameEndedEvent): boolean {
        try {
            const gameId = Config().gameId; //@ts-ignore
            const game: IGame = this.games.get(gameId);
            if(!game.matches.has(data.matchId)) {
                Logger.error("Match not exists, matchId", data.matchId);
                return false;
            } //@ts-ignore
            const match: IMatch = game.matches.get(data.matchId);
            if(match.tournamentId !== data.tournamentId) {
                Logger.error("Tournament Id's not matches:", data.tournamentId, "~", match.tournamentId, "for match:", data.matchId);
                return false;
            }
            if(!match.timestamp) {
                Logger.error("Match finishes before being started:", data.matchId);
                return false;
            }
            if(Object.keys(data.winners).length != match.teams.length) {
                Logger.error("Winners length not matches initial rivals length for match: ", data.matchId);
                return false;
            }
            const usedPlayers: Set<string> = new Set();
            const unUsedTeams: Set<Set<string>> = new Set();
            match.teams.forEach((team) => {
                const set: Set<string> = new Set();
                team.players.forEach((playerId) => {
                   set.add(playerId);
                });
                unUsedTeams.add(set);
            });
            for(let i = 0; i < match.teams.length; i++) { //@ts-ignore
                const team: ITeamScore = data.winners[i.toString()];
                if(team.players.length !== team.scores.length) {
                    Logger.error("Players array and their score array not match in length for team:", i, "in match:", data.matchId);
                    return false;
                }
                const firstPlayer = team.players[0];
                let foundTeam: Set<string> | undefined = undefined;
                unUsedTeams.forEach((unPlayer) => {
                    if(foundTeam) return;
                    if(unPlayer.has(firstPlayer)) {
                        foundTeam = unPlayer;
                    }
                });
                if(!foundTeam) {
                    Logger.error("Failed to match teams for winner:", i, "in match:", match.id);
                    return false;
                }
                team.players.forEach((player) => {
                    if(usedPlayers.has(player)) {
                        Logger.error("Player in the wrong team:", player, "in match:", match.id);
                        return false;
                    }
                    usedPlayers.add(player); //@ts-ignore
                    if(!foundTeam.has(player)) {
                        Logger.error("Player mit in team:", player, "in match:", match.id);
                        return false;
                    }
                });
                unUsedTeams.delete(foundTeam);
            }
            return true;
        }
        catch (e) {
            Logger.error("Failed to check match result with error:", e);
            return false;
        }
    }


    verifyToken<T>(token: string): T | undefined {
        try {
            return jwt.verify(token, Config().syd) as T;
        }
        catch (e) {
            Logger.error("Invalid signature")
            return undefined;
        }
    }

    lastMatchId: number = 0;

    nextMatchId(): string {
        this.lastMatchId = Math.round(Math.random() * 1000) + Math.round(Math.random() * 1000)%1000000000000000000;
        return this.lastMatchId.toString();
    }

    lastTournamentId: string = "0";
    nextTournamentId(): string {
        this.lastTournamentId = keccak256(this.lastTournamentId).toString('hex');
        return this.lastTournamentId
    }

    processMatchResult(data: GameEndedEvent): void {
        if(data.tournamentId) { //@ts-ignore
            const tournament: ITournament = this.games.get(Config().gameId).tournaments.get(data.tournamentId);
            tournament.gamesInStageLeft --;
            tournament.nextStagePlayers.push(data.winners['0']);
            Logger.success("Ended match:", data.matchId, "with winners:", ...data.winners['0'].players)
            if(tournament.gamesInStageLeft <= 0) {
                Logger.success("Tournament stage ended for:", data.tournamentId);
                this.sendTournamentStage(data.tournamentId);
            }
        }
        else {
            Logger.success("Ended match:", data.matchId, "with winners:", ...data.winners['0'].players)
        }
    }
}

new WebsocketServer();