const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http, {cors: {origin: '*'}});
const port = process.env.PORT || 3001;



app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });

  let gameData = []
  let gameCode;
  let hostID;
  let marketData = []


  
io.on("connection", (socket) => {

  // Player and host join the same room
  socket.on("join_room", (data) => {socket.join(data); gameCode = data});
  
  // When player join, then player data is sent to host, player nickname are displayed on host screen
  socket.on("player_joining", (data) => {
    socket.to(data.gameCode).emit("player_accepted", data);
    console.log("data", data)
    gameData.push({id: socket.id, playerName: data.nickname, cards: data.cards, gameCode: data.gameCode})
  });

  // When host press "Start Game" all players are directed to QuizView
  socket.on("ready_game", (data) => {
    hostID = socket.id
    let newGameData = gameData.filter(player => player.gameCode === gameCode);
    gameData = newGameData
    io.in(data).emit("start_game", newGameData); console.log("newGameData", newGameData); 
    io.in(data).emit("host_id", hostID); 
    console.log("newGameData", newGameData)
    console.log("GameData", gameData)
  });

  // playerData returns {player: string, points: int}
  socket.on("sending_player_cards", (playerData) => {
    // Updating all players' collected game data every time a player get a new card
    updateGameData(playerData)
    // Sending all players' collected game data to all players in the same room
    io.in(gameCode).emit("sending_server_gameData", gameData);
   // console.log("GAMEDATA AFTER CRAFTING POTION", gameData)
    
  });

  socket.on("potion_effect", (potionData) => {
    console.log("potion_effect", potionData.emitData)
    // Sends data to one, two, or three players depending on potion type on client side.
    if (potionData.emitData.length === 1) {io.to(potionData.emitData[0].id).emit("potion_curse_blessing", potionData.emitData[0])}
    if (potionData.emitData.length === 2) {io.to(potionData.emitData[0].id).emit("potion_curse_blessing", potionData.emitData[0]); io.to(potionData.emitData[1].id).emit("potion_curse_blessing", potionData.emitData[1])}
    if (potionData.emitData.length === 3) {io.to(potionData.emitData[0].id).emit("potion_curse_blessing", potionData.emitData[0]); io.to(potionData.emitData[1].id).emit("potion_curse_blessing", potionData.emitData[1]); io.to(potionData.emitData[2].id).emit("potion_curse_blessing", potionData.emitData[2])}
    
  })

  // Server receiving a melody "string" from player and server sends it to host
  socket.on("sending_jukebox_to_server", (melodyData) => {
    console.log("sending_jukebox_to_server", melodyData)
    io.to(melodyData.hostID).emit("sending_jukebox_to_host", melodyData)
  })


  socket.on("sending_player_sellorder", (sellData) => {
    console.log("sending_player_sellorder", sellData)
    marketData.push({playerID: sellData.playerID, playerName: sellData.playerName, ingredient: sellData.ingredient, price: sellData.price, sellID: sellData.sellID, gameCode: sellData.gameCode}) 
    io.to(sellData.gameCode).emit("sending_marketData_to_players", marketData)
  })

  socket.on("sending_player_buyorder", (buyData) => {
    let newMarketData = marketData.filter(function( obj ) {return obj.sellID !== buyData[0].sellID});
    marketData = newMarketData
    io.to(buyData[0].gameCode).emit("sending_marketData_to_players", marketData)
    console.log("marketData after buyOrder", marketData)
  })

  
});


// NEXT - IN sending_player_buyorder, PLAYER THAT SOLD THE INGREDIENT SHOULD GET GOLD FOR THE ITEM



// Updating all players' collected game data every time a player get a new card
function updateGameData(playerData) {
  gameData.map((player) => {if (player.playerName === playerData.playerName) {player.cards = playerData.cards, player.coins = playerData.coins} else {console.log(playerData.playerName, "no match")}})
  console.log("LOOK FOR COINS PLAYERDATA", playerData)
}



http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});