const path = require("path");
const express = require("express");
const hbs = require("hbs");
const app = express();
const port = process.env.PORT || 3000;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Telegraf } = require('telegraf');
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require('compression');
const morgan = require('morgan');
const validator = require('validator');

// Initialize Firebase
const serviceAccount = require("./software.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://software-hiring-bot-default-rtdb.firebaseio.com/",
});

// Initialize Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Setup paths
const staticPath = path.join(__dirname, "./public");
const templatePath = path.join(__dirname, "./templates/views");
const partialsPath = path.join(__dirname, "./templates/partials");

// Middleware
app.use(express.static(staticPath));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// View engine setup
app.set('view engine', 'hbs');
app.set("views", templatePath);
hbs.registerPartials(partialsPath);

// CORS setup
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Routes
app.get('/', (req, res) => {
  res.send("Welcome to our application!");
});

app.get('/form', (req, res) => {
  res.render("form");
});

app.post("/form", async (request, response) => {
  try {
    // Input validation
    if (!validator.isEmail(request.body.email)) {
      throw new Error('Invalid email');
    }
    if (!validator.isMobilePhone(request.body.mobile)) {
      throw new Error('Invalid mobile number');
    }

    await insertUserData(request.body);
    
    // Send notification to Telegram
    await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, 
      `New user registered:\nName: ${request.body.name}\nEmail: ${request.body.email}`
    );

    response.status(200).send("User data successfully saved");
  } catch (error) {
    console.error("Error processing form:", error);
    response.status(400).send("Error processing form: " + error.message);
  }
});

// New route for fetching user data
app.get("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const userDoc = await admin.firestore().collection("userdata").doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).send("User not found");
    } else {
      res.status(200).json(userDoc.data());
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).send("Error fetching user data");
  }
});

// New route for updating user data
app.put("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedData = req.body;
    
    await admin.firestore().collection("userdata").doc(userId).update(updatedData);
    
    res.status(200).send("User data updated successfully");
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).send("Error updating user data");
  }
});

// Firebase functions
async function insertUserData(userData) {
  try {
    const writeResult = await admin
      .firestore()
      .collection("userdata")
      .doc(userData.id)
      .set({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        mobile: userData.mobile,
        checkbox1: userData.checkbox1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    console.log("Document successfully written!");
    return writeResult;
  } catch (error) {
    console.error("Error writing document: ", error);
    throw error;
  }
}

// Telegram bot commands
bot.command('start', (ctx) => ctx.reply('Welcome to our bot!'));
bot.command('help', (ctx) => ctx.reply('This bot notifies about new user registrations.'));

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Start Telegram bot
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Export the Express API as a Firebase Cloud Function
exports.app = functions.https.onRequest(app);
