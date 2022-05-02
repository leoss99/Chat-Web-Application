//const { response } = require("express");

              
var profile = {username : "Alice"}

var Service = {origin : window.location.origin,

       async getLastConversation(roomId,before){
         var url;
      if (before){
          url = Service.origin + `/chat/${roomId}/messages?before=${before}`;
      } else {
          url = Service.origin + `/chat/${roomId}/messages`;
      }

      return fetch(url).then((response)=>{
          if (response.ok){
              return  response.json();
          } 
      });

       },
    
       async getAllRooms (){
      var link = Service.origin + "/chat";
      //return response.json();                         //?
       //try {
          var response = await fetch(link);
          
          if (response.ok) { return response.json(); } //success                        
          else
            var text = await response.text();
            throw new Error(text); //server error
        } ,
        //catch (err) {
        //  return console.log(err);
        //}                             //client error

        
        async addRoom(data){
          var  link = Service.origin + "/chat";
          var req = {
              body: JSON.stringify(data),
              method:"POST",
              headers: {
                  'Content-Type': "application/json"
              },
          };

          let response = await fetch(link, req);
          if (response.ok) {
            return response.json();
          } else {
            return response.text().then((text) => {
              throw new Error(text);
            });
          }
        },

        getProfile: ()=>{
          let url=Service.origin + `/profile`;
  
          const response = fetch(url);
             if (response.ok) {
               return response.json();
             } else {
               return response.text().then((text) => {
                 throw new Error(text);
               });

             }
      }
}

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

function main(){
  
  let socket = new WebSocket("ws://localhost:8000");
  var lobby = new Lobby();
  var lobbyView = new LobbyView(lobby);
  var chatView = new ChatView(socket);
  var profileView = new ProfileView();
  
  Service.getProfile().then(res=>{
    profile.username = res.username;
  });
  
     function refreshLobby(){

      Service.getAllRooms().then((rooms)=>{
       for(var e of rooms){
         if (lobby.getRoom(e._id)==null) {lobby.addRoom(e._id,e.name,e.image,e.messages);}
         else {var r = lobby.getRoom(e._id);
              r.name=e.name;
              r.image=e.image;}
       }});
    }

    socket.addEventListener('message', function (message) {
      var obj = JSON.parse(message.data);
      lobby.getRoom(obj.roomId).addMessage(obj.username,obj.text);
    });
    
    function renderRoute(){
         var hash = window.location.hash;
         var path = hash.split("/");
         if (hash==""||hash=="#"||hash=="#/"){                     
            var pageView1 = document.getElementById("page-view");
             emptyDOM(pageView1);
             pageView1.appendChild(lobbyView.elem);
         }

         else if (path[1]=="chat"){
          var pageView2 = document.getElementById("page-view");
          emptyDOM(pageView2);
          pageView2.appendChild(chatView.elem);
          var room = lobby.getRoom(path[2]);
          if(typeof room != "undefined" && room != null){
            chatView.setRoom(room);
          }
         }

         else if (path[1]=="profile"){
          var pageView3 = document.getElementById("page-view");
          emptyDOM(pageView3);
          pageView3.appendChild(profileView.elem);
         }

         else console.error("error");

    }

    window.addEventListener("popstate", renderRoute);
    renderRoute();
    refreshLobby();
    setInterval(refreshLobby, 20000);

    cpen322.export(arguments.callee, { renderRoute, refreshLobby, sanitize, main, socket, Service, lobbyView, lobby, chatView, profileView });
    
}

window.addEventListener("load",main);

  class LobbyView {
    constructor(lobby){
      var str = ` <div class="content">
      <ul class="room-list">

        <li class="menu-item">
          <img src="assets/everyone-icon.png"/> <a href="#/chat">Everyone in CPEN322</a>
        </li>

        <li class="menu-item">
          <img src="assets/bibimbap.jpg"/> <a href="#/chat">Foodies only</a>
        </li>

        <li class="menu-item">
          <img src="assets/minecraft.jpg"/> <a href="#/chat">Gamers Unite</a>
        </li>

        <li class="menu-item">
          <img src="assets/canucks.png"/> <a href="#/chat">Canucks Fans</a>
        </li>

      </ul>
    
      <div class="page-control">
        <input type = "text"/>
        <button type="button">Create Room</button>              
      </div>  
    </div>`;
    var self=this;
    this.lobby=lobby;
    this.elem=createDOM(str);
    this.listElem=this.elem.querySelector("ul.room-list");
    this.inputElem=this.elem.querySelector("input");
    this.buttonElem=this.elem.querySelector("button");

    var roomName=this.inputElem.value;                                //6D
    this.buttonElem.addEventListener("click",function () {   
    
      var data1 ={name:"data1", image:""};   
    Service.addRoom(data1).then((r)=>{
        self.lobby.addRoom( r._id, r.name, r.image, []);
        });

    self.inputElem.value="";
    });
    self.lobby.onNewRoom =function(room){self.redrawList();};              //7B
 
    this.redrawList();                                           
    }

    redrawList(){
      emptyDOM(this.listElem);
      for(var id in this.lobby.rooms ){
        var room=this.lobby.rooms[id]
        this.listElem.appendChild(createDOM(`<li><a href="#/chat/${id}">${room.name}</a> </li>`));       
      }
    }

  }

  class ChatView {
    constructor(socket){
     var str = `<div class = "content">
      <h4 class = "room-name">room-name</h4> 

      <div class =  "message-list">
         <div class =  "message">
             <span class="message-user"></span>
             <span class="message-text"></span>
         </div>

         <div class =  "message my-message">
             <span class="message-user"></span>
             <span class="message-text"></span>
         </div>
      </div>

      <div class="page-control">
         <textarea name="chat box" id="1" cols="30" rows="10"></textarea>
         <button type="button">Send</button>               
      </div> 
     </div>`;
     this.room = null;
     this.elem = createDOM(str);
     this.titleElem = this.elem.querySelector("h4.room-name");
     this.chatElem = this.elem.querySelector("div.message-list");
     this.inputElem = this.elem.querySelector("textarea");
     this.buttonElem = this.elem.querySelector("button");
     this.socket=socket;
     
     this.buttonElem.addEventListener("click", ()=>{
      this.sendMessage();
     });
     this.inputElem.addEventListener("keyup",  (e)=> {
      if(e.code == "Enter" && !e.shiftKey){
          this.sendMessage();
       }
      });

      this.chatElem.addEventListener("wheel",(ce)=>{
        if (this.chatElem.scrollTop == 0 && ce.deltaY < 0 && this.room.canLoadConversation == true){
            this.room.getLastConversation.next();
        }
    });

    }

    sendMessage() {
       
      this.room.addMessage(profile.username, this.inputElem.value);
      this.socket.send(JSON.stringify({
         roomId: this.room.id,
         username: profile.username,
         text: this.inputElem.value
      }));
      this.inputElem.value="";
    }


    setRoom(room){
      this.room = room;
      this.titleElem.innerText = this.room.name;
      emptyDOM(this.chatElem);
      this.room.messages.forEach(
        (message)=>{

            var MessageClass="";
            if(message['username']==profile.username){
                MessageClass="my-message";
            }

            this.chatElem.appendChild(createDOM(
                ` <div class="message ${MessageClass}">
                                <span class="message-user"><b>${message['username']}</b></span><br/>
                                <span class="message-text">${message['text']}</span>
                            </div>` ));
        });

        this.room.onNewMessage=(message)=>{
          var MessageClass="";
          if(message['username']==profile.username){
              MessageClass="my-message";
          }
  
          this.chatElem.appendChild(createDOM(
              ` <div class="message ${MessageClass}">
                                <span class="message-user"><b>${message['username']}</b></span><br/>
                                <span class="message-text">${sanitize(message['text'])}</span>
                              </div>` ));
      };

      this.room.onFetchConversation=(cv)=>{
        var hb=this.chatElem.scrollHeight;
        let str="";
        let children=[];

        for (let i = 0; i < cv.messages.length; i++) {
            var m = cv.messages[i];
            var myMessage="";
            if(m['username']==profile.username){
                myMessage="my-message";
            }
          
            children.push(createDOM(
                `<div class="message ${myMessage}">
                <span class="message-user"><b>${m['username']}</b></span><br/>
                <span class="message-text">${m['text']}</span>
            </div>`)) ;
          
        }
        this.chatElem.prepend(...children);

        this.chatElem.appendChild(createDOM(str));
        var ha=this.chatElem.scrollHeight;
        this.chatElem.scrollTop=ha - hb;
    }

    }

  }

  class ProfileView {
    constructor(){
      var str =  `<div class = "content">
      <div class = "profile-form">
          <div class = "form-field">
             <label for="Username">Username</label>
             <input type="text" id="Username" name="Username"/>
          </div>

          <div class = "form-field">
             <label for="Password">Password</label>
             <input type="password" id="Password" name="Password"/>
          </div>

          <div class = "form-field">
             <label for="Image">Image</label>
             <input type="file" id="Image" name="Image"/>
          </div>
        
      </div>
      <div class="page-control">
        <textarea name="chat box" id="1" cols="30" rows="10"></textarea>  
        <button type="button">Save</button>               
     </div> 
  </div>`;
    this.elem=createDOM(str);
    }
  }

class Room{
     constructor(id, name, image, messages){
      this.id=id;
      this.name=name;
      this.image = (image==undefined||image=="")? "assets/everyone-icon.png": image;
      this.messages= (messages==undefined) ? []:messages ;
      this.canLoadConversation= true;
      this.getLastConversation = makeConversationLoader(this);
     }

      addMessage(username, text){
        var message = {
          username : username,
          text : sanitize(text)};

       if(text.length==0||!text.replace(/\s/g, '').length){
          return;
       }
       else this.messages.push(message);

       if( this.onNewMessage){
         this.onNewMessage(message);
       }
      }

      addConversation(conversation){

        this.messages.unshift(...conversation.messages);

        if(this.onFetchConversation){
            this.onFetchConversation(conversation);
        }
      }
}

function * makeConversationLoader(room){

  var last;
  while (room.canLoadConversation){
      room.canLoadConversation=false;
    yield Service.getLastConversation(room.id, last).then((cv)=>{
          if (cv==null){
            room.canLoadConversation=false;
            return null;
          } else {
            last=cv.timestamp;
            room.addConversation(cv);
            room.canLoadConversation=true;

            return cv;
            }
      });

  }
}

class Lobby{
  constructor(){
    this.rooms = {};
  }

  getRoom(roomId){
     return this.rooms[roomId];
  }

  addRoom(id, name, image, messages){
    var newRoom = new Room(this.id = id,
                       this.name = name,
                       this.image = image,
                       this.messages = messages );
    this.rooms[id]=newRoom;
    if(typeof this.onNewRoom  === "function"){
        this.onNewRoom(newRoom);
    }
  }
}


function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
  let template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  return template.content.firstChild;
}

