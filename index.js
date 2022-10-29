const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http, {cors: {origin: '*'}});
const port = process.env.PORT || 3001;



app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });


  let gameDataObject = [ ]

  
// NEXT - RECONNECTED PLAYER JOIN ROOM, REMOVE PLAYER WITH OLD ID
// INSIGHT - SERVER DATA IS NOT SEPERATED BY ROOMS - HOSTBOARD SHOW PLAYER FROM OTHER ROOMS, MARKETPLACE DATA SHOW OTHER ROOMS MARKETPLACE, 
// PREVENT PLAYERS FROM ERLIER CREATED ROOMS FROM PLACEING SELL ORDERS. MIGHT NEED MAKE VARIABLES LIKE GAMEDATA, GAMECODE, HOSTID, AND MARKETDATA INTO OBJECT
// IDENTIFIED AND ACCESSED BY GAMECODE.

// NEXT - CREATE A GAMEDATA OBJECT
// Correct game need to be search for by if it contians gameCOde
// When removing socket.id when ending game, dont forget to delete from gamedata array as well
// NEXT - POTION DOUBLE POINTS NOT DISAPEARING WHEN USE, USENAVIGATE DON'T WORK EITHER

io.on("connection", (socket) => {

  
  socket.on("host_creating_room", (host_gameCode) => {
    socket.join(host_gameCode); 
    gameDataObject.push({
        gameCode: host_gameCode, 
        hostID: socket.id, 
        players: [ ], 
        marketData: [ ], 
      })
  });

  
  // Player and host join the same room
  socket.on("join_room", (gameCode) => {
    socket.join(gameCode); 
  });

  // When player join, then player data is sent to host, player nickname are displayed on host screen
  // player: { nickname, cards, gameCode, coins } 
  socket.on("player_joining", (playerInfo) => { 
    // Sending joined player data to host, to be used to display player name on screen
    socket.to(playerInfo.gameCode).emit("player_accepted", playerInfo);
    // Sending player their socket id
    io.to(socket.id).emit("sending_playerID", socket.id);
    // Adding joined player to game data
    gameDataObject[getIndexByGamecode(playerInfo.gameCode)].players.push({playerID: socket.id, playerName: playerInfo.nickname, cards: playerInfo.cards, coins: playerInfo.coins})
  });

  // When host press "Start Game" all players are directed to QuizView
  socket.on("ready_game", (gameCode) => {
    // Declaring the id of host
    let hostID = gameDataObject[getIndexByGamecode(gameCode)].hostID
    // Declaring list of players
    let newPlayerData = gameDataObject[getIndexByGamecode(gameCode)].players
    // Emiting to all players to start game, sending list of all player stats
    io.in(gameCode).emit("start_game", newPlayerData); 
    // Sending host id to players to for jukebox potion power
    io.in(gameCode).emit("host_id", hostID); 
  });

  socket.on("end_game", (gameCode) => {
    console.log("END GAME")
  //  io.disconnectSockets();
    console.log("getGameByGamecode", getIndexByGamecode(gameCode))
    gameDataObject.splice(getIndexByGamecode(gameCode), 1);
    console.log("gameDataObject", gameDataObject)
    io.socketsLeave(gameCode);
    socket.leave(gameCode);
    console.log(socket)
  });

  // playerData: {playerName, cards, coins, gameCode}
  socket.on("sending_player_cards", (playerData) => {
    // Updating all players' collected game data every time a player get a new card
    updateGameData(playerData)
    // Sending all players' collected game data to all players in the same room
    io.in(playerData.gameCode).emit("sending_server_gameData", gameDataObject[getIndexByGamecode(playerData.gameCode)].players);
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

//  sellData: { playerID, playerName, ingredient, price, gameCode, sellID }
  socket.on("sending_player_sellorder", (sellData) => {
    console.log("sending_player_sellorder", sellData)
    // Adding sell order to marketData at gameDataObject
    gameDataObject[getIndexByGamecode(sellData.gameCode)].marketData.push({playerID: sellData.playerID, playerName: sellData.playerName, ingredient: sellData.ingredient, price: sellData.price, sellID: sellData.sellID, gameCode: sellData.gameCode})
    // Sending market data to all players in game
    io.to(sellData.gameCode).emit("sending_marketData_to_players", gameDataObject[getIndexByGamecode(sellData.gameCode)].marketData)
  })

  // buyData: [{playerID, playerName, ingredient, price, sellID, gameCode}]
  socket.on("sending_player_buyorder", (buyData) => {
    // Remove sellOrder from marketData array in room (gameCode), that has index of (sellID)
    gameDataObject[getIndexByGamecode(buyData[0].gameCode)].marketData.splice(getIndexByGamecode(buyData[0].sellID), 1);
    // Send market data to all players in room
    io.to(buyData[0].gameCode).emit("sending_marketData_to_players", gameDataObject[getIndexByGamecode(buyData[0].gameCode)].marketData)
    // Notify seller about the sale, will create a letter image, which give money(price) when click on
    io.to(buyData[0].playerID).emit("sending_successfull_sale", buyData[0].price)
  })
  
  
//  console.log("socket.id", socket.id)
//  console.log("ROOMS", io.of("/").adapter.rooms)
  //socket.leave("HxlyMXefwrIc17pWAAAD");
 // console.log(socket.rooms)

// console.log("gameDataObject", gameDataObject)
 
});




// Updating all players' collected game data every time a player get a new card
function updateGameData(playerData) {
  gameDataObject[getIndexByGamecode(playerData.gameCode)].players.map((player) => {if (player.playerName === playerData.playerName) {player.cards = playerData.cards, player.coins = playerData.coins} else {console.log(playerData.playerName, "no match")}})
}

function getIndexByGamecode(playCode) {
  const index = gameDataObject.findIndex(object => {
    return object.gameCode === playCode;
  });

  return index
}



http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});