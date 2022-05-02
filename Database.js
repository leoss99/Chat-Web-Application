const { MongoClient, ObjectID } = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v3.6+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/3.6/api/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			(err, client) => {
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}

Database.prototype.getRooms = function(){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: read the chatrooms from `db`
			 * and resolve an array of chatrooms */
            resolve(db.collection("chatrooms").find().toArray());
		})
	)
}

Database.prototype.getRoom = function(room_id){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
		
			var r;
			if(room_id instanceof ObjectID){
				r=db.collection("chatrooms").findOne({_id:  room_id});
				if(r==null) {  resolve(null);}
				else resolve(r);
	
			}else {
				try {
                var id=new ObjectID(room_id);
                r = db.collection("chatrooms").findOne({_id: id});
                resolve(r);}
                catch (e) {resolve(db.collection("chatrooms").findOne({_id: room_id}));}
		   } 

/*
const collect = db.collection("chatrooms");
try{resolve(collect.findOne({_id: ObjectID(room_id)}))}
catch(e){
	try{resolve(collect.findOne({_id: room_id}))}
	catch(e){
	resolve(null)}
}
*/

		})
	);
}

Database.prototype.addRoom = function (room){
	return this.connected.then(db => 
		new Promise((resolve, reject) => {
            if(room.name!=undefined){
				db.collection("chatrooms").insertOne(room);
              resolve(room);       
                
            }else throw new Error("cannot find room name");
	
		})
	)
}

Database.prototype.getLastConversation = function(room_id, before){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
/*
		if (before){ before=parseInt(before);}
		   else { before=Date.now();}
            
		 var cur= db.collection("conversations").find({
			room_id: room_id,
			timestamp: {$lt: before}
		 });
        
		if(!cur.hasNext()) {resolve(null);}
		else 

		var closest;
		var time = before;

		while(cur.hasNext()){
			var cv = cur.next();
			if(before-cv.timestamp<time){
				closest=cv;
				time=before-cv.timestamp;
			}
		}
		cur.close();
         resolve(closest);
*/		
		
        resolve(null);

			})
		);
}


Database.prototype.addConversation = function(conversation){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			/* TODO: insert a conversation in the "conversations" collection in `db`
			 * and resolve the newly added conversation */
            if(conversation.room_id==undefined || conversation.timestamp==undefined || conversation.messages==undefined)
            {  throw new Error(' ${_id} or ${timestamp} or ${messages} was not found'); }

            else {  db.collection("conversations").insertOne(conversation);
				     resolve(conversation);
            }

		})
	)
}

Database.prototype.getUser=async function(username){
    let conn=await this.connected;
    return  await conn.collection("users").findOne({username: username});

}

module.exports = Database;