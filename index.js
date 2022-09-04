const express = require("express")
const app = express()
const http = require("http")
const {Server} = require("socket.io")
const cors = require("cors")

app.use(cors())
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
    //    origin: "https://astounding-cobbler-6f7739.netlify.app/",
        origin: "http://localhost:3000",
        methods: ["POST", "GET"]
    }
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });

  let gameData = []
  let gameCode;
  
io.on("connection", (socket) => {

  // Player and host join the same room
  socket.on("join_room", (data) => {socket.join(data); gameCode = data});

  // When player join, then player data is sent to host, player nickname are displayed on host screen
  socket.on("player_joining", (data) => {
    socket.to(data.gameCode).emit("player_accepted", data);
    gameData.push({id: socket.id, playerName: data.nickname, cards: data.cards, gameCode: data.gameCode})
  });

  // When host press "Start Game" all players are directed to QuizView
  socket.on("ready_game", (data) => {io.in(data).emit("start_game", gameData); console.log(gameData)});

  // playerData returns {player: string, points: int}
  socket.on("sending_player_cards", (playerData) => {
    // Updating all players' collected game data every time a player get a new card
    updateGameData(playerData)
    // Sending all players' collected game data to all players in the same room
    io.in(gameCode).emit("sending_server_gameData", gameData);
  });



});


// Updating all players' collected game data every time a player get a new card
function updateGameData(playerData) {
  gameData.map((player) => {if (player.playerName === playerData.playerName) {player.cards = playerData.cards, player.coins = playerData.coins}})
}




server.listen(3001, () => {
    console.log("server is running")
})

