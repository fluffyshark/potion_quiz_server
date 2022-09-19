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
  let hostID;
  
io.on("connection", (socket) => {

  // Player and host join the same room
  socket.on("join_room", (data) => {socket.join(data); gameCode = data});

  // When player join, then player data is sent to host, player nickname are displayed on host screen
  socket.on("player_joining", (data) => {
    socket.to(data.gameCode).emit("player_accepted", data);
    gameData.push({id: socket.id, playerName: data.nickname, cards: data.cards, gameCode: data.gameCode})
  });

  // When host press "Start Game" all players are directed to QuizView
  socket.on("ready_game", (data) => {
    hostID = socket.id
    io.in(data).emit("start_game", gameData); console.log(gameData); 
    io.in(data).emit("host_id", hostID); 
  });

  // playerData returns {player: string, points: int}
  socket.on("sending_player_cards", (playerData) => {
    // Updating all players' collected game data every time a player get a new card
    updateGameData(playerData)
    // Sending all players' collected game data to all players in the same room
    io.in(gameCode).emit("sending_server_gameData", gameData);
  });

  socket.on("potion_effect", (potionData) => {
    console.log("potion_effect", potionData.emitData)
    // Sends data to one, two, or three players depending on potion type on client side.
    if (potionData.emitData.length === 1) {io.to(potionData.emitData[0].id).emit("potion_curse_blessing", potionData.emitData[0])}
    if (potionData.emitData.length === 2) {io.to(potionData.emitData[0].id).emit("potion_curse_blessing", potionData.emitData[0]); io.to(potionData.emitData[1].id).emit("potion_curse_blessing", potionData.emitData[1])}
    if (potionData.emitData.length === 3) {io.to(potionData.emitData[0].id).emit("potion_curse_blessing", potionData.emitData[0]); io.to(potionData.emitData[1].id).emit("potion_curse_blessing", potionData.emitData[1]); io.to(potionData.emitData[2].id).emit("potion_curse_blessing", potionData.emitData[2])}
    
  })

  socket.on("sending_jukebox_to_server", (melodyData) => {
    console.log("sending_jukebox_to_server", melodyData)
    io.to(melodyData.hostID).emit("sending_jukebox_to_host", melodyData)
  })

});


// Updating all players' collected game data every time a player get a new card
function updateGameData(playerData) {
  gameData.map((player) => {if (player.playerName === playerData.playerName) {player.cards = playerData.cards, player.coins = playerData.coins}})
}




server.listen(3001, () => {
    console.log("server is running")
})

