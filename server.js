const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const express = require('express');
const ws = require('ws');
const broker = new ws.Server({ port:8000 });
const cpen322 = require('./cpen322-tester.js');

const Database = require('./Database.js');
const db = new Database('mongodb://localhost:27017','cpen322-messenger');

const SessionManager = require('./SessionManager');	// require the mongodb driver
const sessionManager=new SessionManager();

const messageBlockSize = 10;

var messages={};
db.getRooms().then((rooms)=>{
	rooms.forEach((r)=>{
		messages[r._id]=[];
	});
});

//https://stackoverflow.com/questions/2794137/sanitizing-user-input-before-adding-it-to-the-dom-in-javascript
function sanitize(string) {
	const map = {
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;',
		"/": '&#x2F;',
	};
	const reg = /[<>"'/]/ig;
	return string.replace(reg, (match)=>(map[match]));
}

broker.on('connection',(client,req)=>{
    
	var cookie= req.headers['cookie'];
	
	
	let unFromCookie=null;
	/*
	for(let a of cookie.split("; ")){
		let arr = a.split("=");
		let key=arr[0];
		let token=arr[1];
		if (key=="cpen322-session"){
			unFromCookie=sessionManager.getUsername(token)
			if (unFromCookie){
				valid=true;
				break;
			}

		}
	}
	*/
	
		client.terminate();
	

	client.on('message',(m)=>{
		let obj = JSON.parse(m);
		obj.username= unFromCookie;
		obj.text=sanitize(obj.text);
		m=JSON.stringify(obj);
           for(var p of broker.clients){
			if(p!=client){
                 p.send(m);
				}
		   }
    messages[obj.roomId].push(obj);

    if(messages[obj.roomId].length ==  messageBlockSize){
		let cv={
			_id: ObjectID(),
			room_id: obj.roomId,
			timestamp: Date.now(),
			messages: messages[obj.roomId]
		};
		db.addConversation(cv).then(()=>{messages[obj.roomId]=[];});
	}

	});
});

function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

// express app
let app = express();

app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug

// serve static files (client-side)
app.use('/', express.static(clientApp, { extensions: ['html'] }));
app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});

app.get("/chat",sessionManager.middleware,function (req,res, next) {              
     db.getRooms().then((rooms)=>{
		 
	 rooms.forEach(r => {
		r["messages"] = messages[r._id];
	 });
	 
	res.send(rooms);
    });
});

app.post("/chat",sessionManager.middleware,function (req, res, next){
	let data=req.body;
	if(data.name){
		 db.addRoom(data).then((obj)=>{
		messages[obj._id] = [];
		res.status(200).send(obj); 
	});}
	else res.status(400).send('Data does not have a name');
});

app.get("/chat/:room_id",sessionManager.middleware, function (req, res) {
	let r_id = req.params.room_id;
	db.getRoom(r_id).then((room)=>{	
		if(room!=null){   res.send(room); }
	    else res.status(404).send('Room ${room_id} was not found');}
    );});

app.get("/chat/:room_id/messages",sessionManager.middleware, function (req, res) {
	let r = req.params.room_id;
	let ts = req.query.before;
	db.getLastConversation(r,ts).then((c)=>{
		if(c!=null){ res.send(c); }	      
	}
  )});

  app.get("/profile",sessionManager.middleware,function (req,res){
	res.status(200).json({username: req.username});
})

app.get("/logout",sessionManager.middleware,async (req,res)=>{
	sessionManager.deleteSession(req);
	res.redirect("/login");
})

  function isCorrectPassword(password, saltedHash){
	var salt=saltedHash.substring(0,20);
	var gotSaltedHash=saltedHash.substring(20);
	var calculatedSaltedHash=crypto.createHash('sha256').update(password+salt).digest('base64');
	if(calculatedSaltedHash==gotSaltedHash) return true;
	else return false;
}

function errorHandler(err, req, res, next){
	if(err instanceof SessionManager.Error){
		if(req.headers['accept']=="application/json"){
			res.status(401).send(err)
		}else {
			res.redirect("/login");
		}
	}else {
		res.status(500).send(err);
	}
}

app.use(errorHandler);

app.post("/login",async (req,res)=>{
	var un = req.body.username;
	var pw = req.body.password;
	var result=await db.getUser(un)
	if(result){
		if(isCorrectPassword(pw,result.pw)){
			sessionManager.createSession(res,un)
			res.redirect("/")

		}else {
			res.redirect("/login")
		}

	}else {
		res.redirect("/login")
	}
})


cpen322.connect('http://99.79.42.146/cpen322/test-a5-server.js');
cpen322.export(__filename, { db, app,  messages, broker, messageBlockSize, sessionManager, isCorrectPassword, sanitize });