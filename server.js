// code from : https://www.npmjs.com/package/express
const express = require('express')
const app = express();

app.get('/', function (req, res) {
  res.send('Hello Adelina!')
})

app.listen(3000) //open in browser http://localhost:3000/