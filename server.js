const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "TROQUE_POR_UMA_CHAVE_BEM_FORTE";

// Banco simples em memória (depois podemos colocar banco real)
let players = {};

// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  if (!players[username]) {
    players[username] = {
      password,
      money: 0,
      level: 1,
      xp: 0,
    };
  }

  if (players[username].password !== password) {
    return res.status(401).json({ error: "Senha incorreta" });
  }

  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "7d" });

  res.json({ token });
});

// ================= MIDDLEWARE =================
function autenticar(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(403).json({ error: "Sem token" });

  const token = authHeader.split(" ")[1];

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

// ================= CLICK =================
app.post("/click", autenticar, (req, res) => {
  const username = req.user.username;
  const player = players[username];

  // Cálculo protegido no servidor
  player.money += 10;
  player.xp += 5;

  if (player.xp >= 100) {
    player.level++;
    player.xp = 0;
  }

  res.json({
    money: player.money,
    level: player.level,
  });
});

// ================= RANKING =================
app.get("/ranking", (req, res) => {
  const ranking = Object.keys(players)
    .map((username) => ({
      username,
      money: players[username].money,
    }))
    .sort((a, b) => b.money - a.money)
    .slice(0, 10);

  res.json(ranking);
});

// ================= PORTA RENDER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
