const { MongoClient } = require("mongodb");
const dotenv = require('dotenv');
const express = require("express");
var fs = require('fs'); 
var {parse} = require('csv-parse');
const {formidable} = require("formidable");
var fs = require('fs');
const csv = require('csvtojson');
const nodemailer = require("nodemailer");

dotenv.config();
const uri = process.env.URI;

const mongoose = require('mongoose'); 
mongoose.connect(uri); 

const app = express();
const PORT = 3000; 

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: "testmathgo@gmail.com",
      pass: process.env.PASS,
    },
  });

  
app.post('/createlist', async(req, res) => {
    try{
        const form = formidable({ multiples: true });
    form.parse(req, async(err, fields, files) => {
        var map = {
            name: {
                type: String,
                require: true
            },
            email: { 
                type: String,
                require: true,
                index: {
                    unique: true
                }
            },
            subscribed: {
                type: Boolean,
                default: true
            }
        }
        if(fields.properties){
            var properties = JSON.parse(fields.properties[0])
        for(var i=0; i<properties.length; i++){
            if(properties[i]['name']=='name' || properties[i]['name']=='email' || properties[i]['name']=='subscribed'){
                res.send('Fields name, email, subscribed should not present in custom properties')
                return
            }
            map[properties[i]['name']] = {
                type: String,
                default: properties[i]['default']
            }
        }
        }
    
        try{
            if(!fields.title){
                res.send('Please mention the title')
                return
            }
            const mageSchema = new mongoose.Schema(map, {collection: fields.title[0]})
        const Mage = new mongoose.model(fields.title[0], mageSchema)
        res.send('List created')
        }catch(e){
            if(e.message.startsWith('Cannot overwrite')){
                res.send('List already exists. Please mention another list name')
            }else{
                res.send(e.message)
            }
        }
        
    });
    }catch(e){
        if(e.message.startsWith('Cannot overwrite')){
            res.send('List already exists. Please mention another list name')
        }else{
            res.send(e.message)
        }
    }
})

app.post('/add', async(req, res) => {
    try{
        const form = formidable({ multiples: true });
    form.parse(req, async(err, fields, files) => {
        if(!files.data){
            res.send('Send a CSV file in field data')
            return
        }
        if(!fields.title){
            res.send('Mention the list name in title field')
        }
        const jsonArray= await csv({ignoreEmpty: true}).fromFile(files.data[0].filepath);
        var f = mongoose.model(fields.title[0])
        var data = (await mongoose.model(fields.title[0]).find()).length
        f.insertMany(jsonArray, {ordered : false }).then(value  => {
            res.send('All user added. Current list count: '+(data+jsonArray.length))
        }).catch(err => {
            
            var faileditems = [];
            err.writeErrors.forEach(item => {
                faileditems.push(item.err.op)
            })
            res.send({
                currentlistcount: data+err.result.insertedCount,
                insertcount: err.result.insertedCount,
                errorinsertcount: err.writeErrors.length,
                itemsnotadded: faileditems,
                givencsvdata: jsonArray,
                
                
            })
        })
    });

    }catch(e){
        if(e.message.startsWith("Schema hasn't been registered for model")){
            res.send('Title not exists')
        }else{
            res.send(e.message)
        }
    }
})

app.get('/fetchuser', async(req, res) => {
    try{
        const form = formidable({ multiples: true });
    form.parse(req, async(err, fields, files) => {
        if(!fields.email){
            res.send('Please mention email ID of user in email field')
            return
        }
        if(!fields.title){
            res.send('Please mention title of list in title field')
            return
        }
        var data = await mongoose.model(fields.title[0]).find({email: fields.email[0]})
        res.send(data)
    });
    }catch(e){
        res.send(e.message)
    }
})

app.get('/fetchallusers', async(req, res) => {
    try{
        const form = formidable({ multiples: true });
    form.parse(req, async(err, fields, files) => {
        if(!fields.title){
            res.send('Please mention title of list in title field')
            return
        }
        var data = await mongoose.model(fields.title[0]).find()
        res.send(data)
    });
    }catch(e){
        res.send(e.message)
    }
})

app.post('/sendmails', async(req, res) => {
    try{
        const form = formidable({ multiples: true });
    form.parse(req, async(err, fields, files) => {
        if(!fields.title){
            res.send('Please mention the title to send emails')
            return;
        }
        var data = await mongoose.model(fields.title[0]).find({subscribed: true})
    for(var u=0; u<data.length; u++){
        const info = await transporter.sendMail({
            from: 'testmathgo@gmail.com',
            to: data[u]['email'],
            subject: "Welcome Message",
            text: "Hey "+data[u]['name']+", \n Thank you for signing up with your email"+data[u]['email']+". We have received your city as "+data[u]['city']+".\n Team MathonGo. \n \n \n To unsubscribe, click on https://mathongo-task-2lfe.onrender.com/unsubscribe?title="+encodeURIComponent(fields.title[0].trim())+"&email="+data[u]['email'],
          });
    }
    res.send('Mail send to all users.')
    });
    }catch(e){
        res.send(e.message)
    }
})

app.get('/unsubscribe', async(req, res) => {
    try{
        var title = req.query.title;
        var email = req.query.email;
        var data = await mongoose.model(title).updateOne({email: email}, {$set: {subscribed: false}})
        console.log(data)
        res.send('Unsubscribed')
    }catch(e){
        res.send(e.message)
    }
})



app.listen(PORT, (error) =>{ 
    if(!error) {
        console.log("Server is Successfully Running,  and App is listening on port "+ PORT) 
    }
    else 
        console.log("Error occurred, server can't start", error); 
    } 
); 