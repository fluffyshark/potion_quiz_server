const express = require("express")
const app = express()
const http = require("http")
const {Server} = require("socket.io")
const cors = require("cors")

app.use(cors())
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
     //   origin: "https://astounding-cobbler-6f7739.netlify.app/",
        origin: "http://localhost:3000",
        methods: ["POST", "GET"]
    }
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });

  
io.on("connection", (socket) => {

    socket.on("join_room", (data) => {
        socket.join(data);
        console.log("Join", data)
      });

      socket.on("send_message", (data) => {
        socket.to(data.gameCode).emit("receive_message", data);
        console.log("receive_message", data)
    });
});

server.listen(3001, () => {
    console.log("server is running")
})