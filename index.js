const express = require("express");
const app = express();
const {connectToMongoDB} = require("./connect");
const path = require("path"); // we need path to join paths to our HTML files.
const http = require("http"); // we want http for web sockets
const server = http.createServer(app); // we create a server using the express app as base
app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));
const User = require("./models/user.model");
//connect to mongodb
connectToMongoDB("mongodb://127.0.0.1:27017/chat").then(()=>{
  console.log("Connected to mongodb");
})
//socket io imports
const { Server } = require("socket.io");
const { name } = require("ejs");
const io = new Server(server);

app.get("/signup", (req,res) => {
  return res.render("signup");
})
app.get("/signin", (req,res) => {
  return res.render("signin");
})

app.get("/index", (req,res)=>{
  const username = req.body;
  return res.render("index", {name: username});
})
app.get("/", (req, res) => {
  return res.render("home");
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/signup", async(req,res)=>{
  const { name, email, password } = req.body;
  await User.create({
    name,
    email,
    password,
  });
  return res.redirect("/signin");
});

app.post("/signin", async(req,res)=>{
  const { email, password } = req.body;
  const user = await User.findOne({email, password});
  
  if (!user ) {
    return res.status(401).json({message: "Invalid credentials"});
  }
  return res.redirect("/index");
})

// app.post('/signup', async(req,res)=>{
//   const {username, email, password} = req.body;
//   const existing = await db.collection('users').findOne({username});
//   if(existing){
//     return res.status(400).json({message: "User already exists"});
//   }
//   await db.collection('users').insertOne({username, password});
//   res.status(201).json({message: 'User created successfully!'})
// })

const users = {};
//handling socket.io
io.on("connection", (socket) => {
  //socket is the client that is connected to the server
  // console.log("new user connected.", socket.id); //socket.id is the unique id of the client
  //nickname handling
  socket.on("nickname", (nickname) => {
    const colors = [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#ff00ff",
      "#ffff00",
      "#00ffff",
    ];
    const colorIndex = Object.keys(users).length % colors.length;
    const userColor = colors[colorIndex];
    const otherColor = colors[(colorIndex + 1) % colors.length];
    users[socket.id] = { nickname: nickname, color: userColor };
    socket.broadcast.emit("message", {
      text: `${nickname} has joined the chat`,
      color: "green",
    });
    socket.emit("nickname", { userColor, otherColor });
    socket.emit(
      "online_users",
      Object.values(users).map((user) => user.nickname)
    );
    //typing
    socket.on("typing", () => {
      const nickname = users[socket.id].nickname;
      socket.broadcast.emit("message", {
        text: `${nickname} is typing...`,
        color: "grey",
      });
    });
    io.emit("user_connected", nickname);
  });
  socket.on("message", (message) => {
    // 'message' is derived from the client side emit event
    // console.log("A new message: ", message);
    const { text, nickname, color } = message;
    io.emit("message", { text, nickname, color });
  });

  //diconnect
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      io.emit("message", {
        text: `${users[socket.id]} has left the chat`,
        color: "red",
      });
      io.emit("user_disconnected", users[socket.id].nickname);
      delete users[socket.id];
    }
  });
});
server.listen(8000, () => console.log("Server started on port 8000"));
//ASSIGNMENT:
//Go to socket.io/get-started/chat and follow the instructions to create a chat application using socket.io
