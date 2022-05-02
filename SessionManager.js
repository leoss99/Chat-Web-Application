const crypto = require('crypto');
class SessionError extends Error {};

function SessionManager (){
    const CookieMaxAgeMs = 600000;

    const sessions = {};

    this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
        let token=crypto.randomBytes(100).toString('hex')
        sessions[token]={
            username: username,
            createdTime: Date.now(),

        }
        response.cookie("cpen322-session",token, { maxAge : maxAge });

        setTimeout(()=>{
            delete sessions[token];
        },maxAge);

    };

    this.deleteSession = (request) => {
        delete sessions[request.session];
        delete request.username
        delete request.session;

    };

    this.middleware = (request, response, next) => {

        var cookie;
        cookie= request.headers.cookie;
        if(cookie){
			for(var a of cookie.split("; ")){
				var arr = a.split("=");
				var key=arr[0];
				var token=arr[1];
				if (key == "cpen322-session"){
					var Obj = sessions[token];
					if (Obj){
						request.username=Obj.username;
						request.session=token;
						next();
	
					}else {
						next(new SessionError());
					}
				} else next(new SessionError());
			}
		} else next(new SessionError());
    };

    this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

SessionManager.Error = SessionError;
module.exports = SessionManager;