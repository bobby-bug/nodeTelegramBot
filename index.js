const path = require("path");
const express = require("express");
const hbs = require("hbs");
const app = express();
const port = 3000
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {Telegraf} = require('telegraf')


const staticPath = path.join(__dirname, "./public");
console.log(staticPath)
console.log(path.join(__dirname))

const templatePath = path.join(__dirname, "./templates/views");
app.use(express.static(staticPath));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'hbs');
app.set("views", templatePath);
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', (req, res) => {
  res.send("Helloooooo")
})

app.get('/form', (req, res) => {
  res.render("form")
})

app.post("/form", async (request, response) => {
  var insert = await insertNewsData(request);
  response.send("success");

});
var serviceAccount = require("./software.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://software-hiring-bot-default-rtdb.firebaseio.com/",
});

async function insertNewsData(request) {
  const writeResult = await admin
    .firestore()
    .collection("userdata")
    .doc(request.body.id)
    .set({
      id: request.body.id,
      name: request.body.name,
      email: request.body.email,
      mobile: request.body.mobile,
      checkbox1: request.body.checkbox1,
    })
    .then(function () {
      console.log("Document successfully written!");
    })
    .catch(function (error) {
      console.error("Error writing document: ", error);
    });
}

app.listen(port, ()=>{
    console.log(`Listening on port ${port}`);
})


bot.launch();
