# ZS API Sandbox
This project is created for testing connection and request processing from external games, 
it imitates ZeroSum backend. Use the requests below to launch a game or tournament.
- __*build package*__: npm run build
- __*start server*__: npm run start

## Connection
Connect your backend to <ws://127.0.0.1:8010> adding auth token 
with [payload](./src/interfaces/api/auth-token.ts) signed with provided syd phrase
### ZeroSum real urls are:
- <ws://dev.api.zerosum.world:8010> ~ development server
- <ws://test.api.zerosum.world:8010> ~ testnet server

## Methods
### Link User
- route: POST <http://127.0.0.1:3000/link-user>
- [interface](./src/interfaces/methods/link-user.ts)
- adds user to the platform provided a user token with [payload](./src/interfaces/api/link-token.ts)
### Create Quick Game
- route: POST <http://127.0.0.1:3000/create-quickgame>
- [interface](./src/interfaces/methods/create-game.ts)
- creates a single game with number of teams, 
if teams are specified than only included players will participate.
### Create Tournament
- route: POST <http://127.0.0.1:3000/create-tournament>
- [interface](./src/interfaces/methods/create-tournament.ts)
- creates a tournament with number of teams,
  if teams are specified than only included players will participate.

## Configuration
### .env
- __*APP_PORT*__ ~ where HTTP server starts
- __*SOCKET_PORT*__ ~ where websocket server starts
### config.json
- __*gameId*__ ~ an identifier of your game on ZS platform
- __*syd*__ ~ a syd phrase to sign authorization and user JWT tokens
- __*linkedPlayers*__ ~ an array of playerIds that are registered at the start
- __*playersInTeam*__ ~ how many players are in each team
- __*teamsInMatch*__ ~ how many teams participate in each match
- __*delayBeforeGames*__ ~ delay in seconds between start of each match
