
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const express = require("express");
const app = express();
const path = require('path');
const bodyParser = require('body-parser');

dotenv.config();

app.use(express.static(path.join(__dirname, 'public')));
const webhookUrl = 'https://beige-spies-study.loca.lt';
app.use(bodyParser.json());

require("./index1")
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);  // Process incoming updates
  res.sendStatus(200);           // Respond with OK
});


app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} \n`);
});
