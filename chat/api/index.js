const express = require("express");
const app = express();
const PORT = process.env.PORT || 8000;
const {connectToMongoDB} = require("./connect");
const path = require("path"); // we need path to join paths to our HTML files.
const http = require("http"); // we want http for web sockets
const server = http.createServer(app); // we create a server using the express app as base
const randomColor = require('randomcolor');
const rooms = {};

require('dotenv').config();
app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));
const User = require("./userModel");
//connect to mongodb
connectToMongoDB(process.env.MONGO_URL).then(()=>{
  console.log("Connected to mongodb");
})

app.get("/signup", (req,res) => {
  return res.render("signup");
})


app.get("/", (req, res) => {
  return res.render("signin");
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

app.get("/signin", (req,res)=>{
  return res.render("signin");
})


app.post("/signin", async(req,res)=>{
  const { email, password } = req.body;
  const user = await User.findOne({email, password});
  if (!user ) {
    return res.status(401).json({message: "Invalid credentials"});
  }
  return res.redirect(`/home?name=${user.name}`);
})


app.get("/home", (req,res)=>{
  const {name} = req.query;
  return res.render("home", {name});
})

app.get("/global", async(req,res)=>{
  const {name}= req.query;
  return res.render('index', {name});
})

app.get("/private", async(req,res)=>{
  const {name}= req.query;
  return res.render('private_home', {name});
})


app.post("/create-private-room", (req,res)=>{
  const room = req.body.create_room;
  
  rooms[room] = true;
  res.redirect(`/private/${room}`)
  
})
app.post("/join-private-room", (req,res)=>{
  const room = req.query.join_room;
  if(rooms[room]){
    return res.render("private", {roomId: room, name: req.query.name});
  }
  else{
  res.sendStatus("404");
  }
})
app.get("/private/:roomId", (req,res)=>{
  const {roomId} = req.params;
  const {name} = req.query;
    if(rooms[roomId]){
    return res.render("private", {roomId,name});
    }
    else
    return res.sendStatus("404");
})

//SOCKET CODE STARTS HERE
//socket io imports
const { Server } = require("socket.io");
const { name } = require("ejs");
const io = new Server(server);
const users = {};

const userColor = "rgb(135, 235, 168)";
//handling socket.io
io.on("connection", (socket) => {
  //socket is the client that is connected to the server
  
  // console.log("A user connected", socket.id);
  users[socket.id] = socket;
  
  //typing
  socket.on('typing', ()=>{
    socket.broadcast.emit('user typing', 'someone');
  })
  socket.on('stop typing', ()=>{
    socket.broadcast.emit('user stopped typing');
  })
  //no of online users:
    io.emit('online_users', Object.keys(users).length);
  

  //nickname handling
  socket.on("new_user", ({nickname, color}) => {
    io.emit("user_joined", {nickname});
  });

  socket.on("message", (message) => {
    // 'message' is derived from the client  side emit event
    // console.log("A new message: ", message);
    const { text, nickname} = message;
    io.emit("message", { text, nickname, userColor});
  });

  //diconnect
  socket.on("disconnect", () => {
    if(users[socket.id]){
      io.emit("user_left", { nickname: users[socket.id].nickname});
      delete users[socket.id];
      io.emit('online_users', Object.keys(users).length);
    }
  });
});
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
//ASSIGNMENT:
//Go to socket.io/get-started/chat and follow the instructions to create a chat application using socket.io
