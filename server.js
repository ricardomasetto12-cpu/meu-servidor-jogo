require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const WebSocket = require("ws");

const app = express();

app.use(express.json());
app.use(cors());

/* DATABASE */

mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("✅ MongoDB conectado"))
.catch(err => {
  console.error("❌ Erro MongoDB:", err);
  process.exit(1);
});

/* PLAYER MODEL */

const Player = mongoose.model("Player",{
  username:{type:String,required:true,unique:true},
  password:{type:String,required:true},
  score:{type:Number,default:0},
  upgrade:{type:Number,default:1}
});

/* CHAT MODEL */

const Chat = mongoose.model("Chat",{
  username:String,
  message:String,
  time:{type:Date,default:Date.now}
});

/* TEST ROUTE (IMPORTANTE PRO RAILWAY) */

app.get("/", (req,res)=>{
  res.send("🚀 CLICKER SERVER ONLINE");
});

/* AUTH */

app.post("/auth",async(req,res)=>{

  const {username,password}=req.body;

  if(!username || !password){
    return res.status(400).send("Usuário e senha obrigatórios");
  }

  let player=await Player.findOne({username});

  if(!player){

    const hash=await bcrypt.hash(password,10);

    player=await Player.create({
      username,
      password:hash,
      score:0,
      upgrade:1
    });

  }else{

    const ok=await bcrypt.compare(password,player.password);
    if(!ok) return res.status(401).send("Senha inválida");

  }

  // NÃO enviar senha para o frontend
  const {password:_, ...playerData} = player.toObject();

  res.json(playerData);

});

/* SAVE GAME */

app.post("/save",async(req,res)=>{

  const {id,score,upgrade}=req.body;

  if(!id) return res.status(400).send("ID inválido");

  await Player.updateOne(
    {_id:id},
    {$set:{score,upgrade}}
  );

  res.json({ok:true});

});

/* RANKING */

app.get("/ranking",async(req,res)=>{

  const ranking=await Player.find()
  .sort({score:-1})
  .limit(20)
  .select("-password");

  res.json(ranking);

});

/* HTTP SERVER */

const PORT=process.env.PORT||3000;

const server = app.listen(PORT,()=>{
  console.log("🔥 CLICKER SERVER ONLINE NA PORTA", PORT);
});

/* WEBSOCKET CHAT REALTIME */

const wss = new WebSocket.Server({ server });

let clients=[];

wss.on("connection",(ws)=>{

  clients.push(ws);

  ws.on("message",(msg)=>{

    clients.forEach(client=>{
      if(client.readyState===1){
        client.send(msg.toString());
      }
    });

  });

  ws.on("close",()=>{
    clients = clients.filter(c=>c!==ws);
  });

});
