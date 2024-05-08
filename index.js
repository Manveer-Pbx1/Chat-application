const express = require("express");
const app = express();
const {connectToMongoDB} = require("./connect");
const path = require("path"); // we need path to join paths to our HTML files.
const http = require("http"); // we want http for web sockets
const server = http.createServer(app); // we create a server using the express app as base
const randomColor = require('randomcolor');
app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));
const User = require("./models/user.model");
//connect to mongodb
connectToMongoDB("mongodb://127.0.0.1:27017/chat").then(()=>{
  console.log("Connected to mongodb");
})

app.get("/signup", (req,res) => {
  return res.render("signup");
})
app.get("/signin", (req,res) => {
  return res.render("signin");
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
  return res.redirect(`/index?name=${user.name}`);
})

app.get("/index", (req,res)=>{
  const {name}= req.query;
  return res.render("index", {name});
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
  
  //typing
  socket.on('typing', ()=>{
    socket.broadcast.emit('user typing', 'someone');
  })
  socket.on('stop typing', ()=>{
    socket.broadcast.emit('user stopped typing');
  })

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
      const {nickname} = users[socket.id];
      io.emit("user_left", { nickname:nickname});
      delete users[socket.id];
    }
  });
});
server.listen(8000, () => console.log("Server started on port 8000"));
//ASSIGNMENT:
//Go to socket.io/get-started/chat and follow the instructions to create a chat application using socket.io
