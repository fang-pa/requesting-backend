const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(cors())

// เชื่อม Database 
mongoose.connect(process.env.DB_Connection,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err) => {
        if (err) console.log(err)
        else console.log("Server is run on http://localhost:3000")
    })

// imports from Router
const homeRoute = require('./routers/home');
const userRoute = require('./routers/user');
const dataRoute = require('./routers/data');
const formReqRoute = require('./routers/formReq');

// routes from routers
app.use('', homeRoute)
app.use('/user', userRoute)
app.use('/data', dataRoute)
app.use('/form', formReqRoute)

// Port number for the server
app.listen(3000);
