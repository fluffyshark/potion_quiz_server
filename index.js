const express = require('express');
const app = express();
const http = require('http').Server(app);

// -------FOR LOCALHOST-----------
const io = require('socket.io')(http, {cors: {origin: true, credentials:true, optionSuccessStatus:200}});
// -------------------------------------------------



//--------FOR PRODUCTION---------
/*
const io = require('socket.io')(http);

const cors = require('cors');
const whitelist = ['https://potionquiz.com/', 'http://potionquiz.com/', 'http://16.171.11.140/'];
const corsOptions = {
  methods: ['GET', 'PUT', 'DELETE', 'POST'],
  credentials: true, // This is important.
  origin: (origin, callback) => {
    if(whitelist.includes(origin))
      return callback(null, true)

      callback(new Error('Not allowed by CORS v2'));
  }
}

app.use(cors(corsOptions));
*/
//--------------------------------------------------------- 



const port = process.env.PORT || 3001;
const path = require("path");




const _dirname = path.dirname("");
const buildPath = path.join(_dirname  , "../potion_quiz_client/build");

app.use(express.static(buildPath));

app.get("/*", function(req, res){

    res.sendFile(
        path.join(__dirname, "../potion_quiz_client/build/index.html"),
        function (err) {
          if (err) {
            res.status(500).send(err);
          }
        }
      );

})



  // Declare array that will hold game data
  let gameDataObject = [ ]

  
// NEXT - RECONNECTED PLAYER JOIN ROOM, REMOVE PLAYER WITH OLD ID
// INSIGHT - SERVER DATA IS NOT SEPERATED BY ROOMS - HOSTBOARD SHOW PLAYER FROM OTHER ROOMS, MARKETPLACE DATA SHOW OTHER ROOMS MARKETPLACE, 
// PREVENT PLAYERS FROM ERLIER CREATED ROOMS FROM PLACEING SELL ORDERS. MIGHT NEED MAKE VARIABLES LIKE GAMEDATA, GAMECODE, HOSTID, AND MARKETDATA INTO OBJECT
// IDENTIFIED AND ACCESSED BY GAMECODE.


// When removing socket.id when ending game, dont forget to delete from gamedata array as well


io.on("connection", (socket) => {

  
  socket.on("host_creating_room", (host_gameCode) => {
    socket.join(host_gameCode); 
    gameDataObject.push({
        gameCode: host_gameCode, 
        hostID: socket.id, 
        players: [ ], 
        marketData: [ ],
        prevAuctionSlot: 200, 
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
    gameDataObject[getIndexByGamecode(playerInfo.gameCode)].players.push({playerID: socket.id, playerName: playerInfo.nickname, cards: playerInfo.cards, coins: playerInfo.coins, prevAuctionSlot: 200})
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

  socket.on("host_end_game", (gameCode) => {
    io.in(gameCode).emit("host_to_player_to_end_game", gameCode); 
    console.log("getGameByGamecode", getIndexByGamecode(gameCode))
    gameDataObject.splice(getIndexByGamecode(gameCode), 1);
    console.log("gameDataObject", gameDataObject)
  // Ends connection to room
    socket.leave(gameCode);
    console.log("END GAME")
  });

  socket.on("player_end_game", (gameCode) => {
    console.log("END GAME")
  // Ends connection to socket room
    socket.leave(gameCode);
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
    console.log("potion_effect_lenght", potionData.emitData.length)
    let gameCode = potionData.emitData[0].gameCode
    console.log("gameDataObject.players", gameDataObject[getIndexByGamecode(gameCode)].players)
    // Sends data to one, two, or three players depending on potion type on client side.
    let firstSelectedPlayer = gameDataObject[getIndexByGamecode(gameCode)].players.filter(player => player.playerName === potionData.emitData[0].playerName);
    if (potionData.emitData.length === 1) {
      io.to(firstSelectedPlayer[0].playerID).emit("potion_curse_blessing", potionData.emitData[0])
    }
    if (potionData.emitData.length === 2) {
      let secondSelectedPlayer = gameDataObject[getIndexByGamecode(gameCode)].players.filter(player => player.playerName === potionData.emitData[1].playerName);
      io.to(firstSelectedPlayer[0].playerID).emit("potion_curse_blessing", potionData.emitData[0]); io.to(secondSelectedPlayer[0].playerID).emit("potion_curse_blessing", potionData.emitData[1])
    }
    if (potionData.emitData.length === 3) {
      let secondSelectedPlayer = gameDataObject[getIndexByGamecode(gameCode)].players.filter(player => player.playerName === potionData.emitData[1].playerName);
      let thirdSelectedPlayer = gameDataObject[getIndexByGamecode(gameCode)].players.filter(player => player.playerName === potionData.emitData[2].playerName);
      io.to(firstSelectedPlayer[0].playerID).emit("potion_curse_blessing", potionData.emitData[0]); io.to(secondSelectedPlayer[0].playerID).emit("potion_curse_blessing", potionData.emitData[1]); io.to(thirdSelectedPlayer[0].playerID).emit("potion_curse_blessing", potionData.emitData[2])
    }
  })

  // Server receiving a melody "string" from player and server sends it to host
  socket.on("sending_jukebox_to_server", (melodyData) => {
    console.log("sending_jukebox_to_server", melodyData)
    io.to(melodyData.hostID).emit("sending_jukebox_to_host", melodyData)
  })

   // buyData: [{playerID, playerName, ingredient, price, sellID, gameCode}]
  socket.on("sending_player_buyorder", (buyData) => {
    // Remove sellOrder from marketData array in room (gameCode), that has index of (sellID)
    let newMarketData = gameDataObject[getIndexByGamecode(buyData[0].gameCode)].marketData.filter(function( obj ) {return obj.sellID !== buyData[0].sellID;});
    // Replace marketData with newMarketData
    gameDataObject[getIndexByGamecode(buyData[0].gameCode)].marketData = newMarketData
    // Send market data to all players in room
    io.to(buyData[0].gameCode).emit("sending_marketData_to_players", gameDataObject[getIndexByGamecode(buyData[0].gameCode)].marketData)
    // Notify seller about the sale, will create a letter image, which give money(price) when click on
    io.to(buyData[0].playerID).emit("sending_successfull_sale", buyData[0].price)
  })

//  sellData: { playerID, playerName, ingredient, price, gameCode, sellID }
  socket.on("sending_player_sellorder", (sellData) => {
    console.log("sending_player_sellorder", sellData)
    // Adding sell order to marketData at gameDataObject
    gameDataObject[getIndexByGamecode(sellData.gameCode)].marketData.push({playerID: sellData.playerID, playerName: sellData.playerName, ingredient: sellData.ingredient, price: sellData.price, sellID: sellData.sellID, gameCode: sellData.gameCode})
    // Sending market data to all players in game
    io.to(sellData.gameCode).emit("sending_marketData_to_players", gameDataObject[getIndexByGamecode(sellData.gameCode)].marketData)
  })

  // auctionData: {auctionSlot, auctionInfo, gameCode}
  socket.on("auction_card_expired_or_bought", (auctionData) => {
    
    if (gameDataObject[getIndexByGamecode(auctionData.gameCode)].hasOwnProperty('prevAuctionSlot')) {
        // Prevent server from handle request for the same action cards from multiple clients
      if (auctionData.auctionSlot !== gameDataObject[getIndexByGamecode(auctionData.gameCode)].prevAuctionSlot) {
        // Generate a random card id (choosing which card to auction off)
        const newCardID = Math.floor(Math.random() * 20);
        // Send data to clients about new auction card id to which empty slot
        io.to(auctionData.gameCode).emit("new_auction_card_to_players", {auctionSlot: auctionData.auctionSlot, newAuctionCard: newCardID})
        // Set expired or bought card as the latest card handled
        gameDataObject[getIndexByGamecode(auctionData.gameCode)].prevAuctionSlot = auctionData.auctionSlot
      }
    }
  })

 
  
  
// Show all socket id at server
//  console.log("socket.id", socket.id)

// Show all games that was not removed
// console.log("gameDataObject", gameDataObject)

// Show all rooms at server
//  console.log("ROOMS", io.of("/").adapter.rooms)

// Leave room based on room id
// socket.leave("HxlyMXefwrIc17pWAAAD")

// Show all socket rooms in server
// console.log(socket.rooms)

// Clear server of all sockets
//  io.disconnectSockets();

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