"use strict";
const PORT = process.env.PORT || 3000;
var express = require('express');
const basicAuth = require("express-basic-auth")
var app = express();
var srv = require('http').Server(app);
var io = require('socket.io')(srv);
var port = PORT;
const basicUserName = "test"
const basicPassword = "test"
// app.use(basicAuth({
//     users: {
//         'admin': 'admin',
//         'unity': 'unity',
//     }
// }));
app.use(basicAuth({
    challenge: true,
    unauthorizedResponse: function(){
        return "Unauthorized" // 認証失敗時に表示するメッセージ
    },
    authorizer(username, password){
        const userMatch = basicAuth.safeCompare(username, basicUserName)
        const passMatch = basicAuth.safeCompare(password, basicPassword)
        return userMatch & passMatch
    }
}));
app.set('view engine', 'ejs');
app.use('/static', express.static(__dirname + '/public'));
app.get('/',function(req,res){
    res.sendFile(__dirname + '/public/index.html');
});
app.get('/dashboard', function (req, res) {
    res.send('hello world');
});
app.get('/debug', function (req, res) {
    var url = req.baseUrl;
    res.render('debug');
});
app.get('/-/users', function (req, res) {
    res.send(users);
});
app.get('/-/iourl', function (req, res) {
    res.send('ws://' + req.get('Host'));
});
srv.listen(port,function(){
    console.log('signaling server started on port:' + port);
});

//---------------------------------------------------
//シグナリングサーバー
var users = {};
function addUser(name, room) {
    users[name] = room;
}
function removeUser(name) {
    delete users[name];
}
// This callback function is called every time a socket
// tries to connect to the server
io.on('connection', function (socket) {
    // ---- multi room ----
    socket.on('enter', function (roomname) {
        socket.join(roomname);
        console.log('id=' + socket.id + ' enter room=' + roomname);
        setRoomname(roomname);
        addUser(socket.id,roomname);
    });

    function setRoomname(room) {
        socket.roomname = room;
    }

    function getRoomname() {
        var room = socket.roomname;
        return room;
    }

    function emitMessage(type, message) {
        // ----- multi room ----
        var roomname = getRoomname();

        if (roomname) {
            //console.log('===== message broadcast to room -->' + roomname);
            socket.broadcast.to(roomname).emit(type, message);
        }
        else {
            //console.log('===== message broadcast all');
            socket.broadcast.emit(type, message);
        }
    }

    // When a user send a SDP message
    // broadcast to all users in the room
    socket.on('message', function (message) {
        if (!(message instanceof Object)){
            console.log("invalid data");
            return;
        }
        var date = new Date();
        message.from = socket.id;
        //console.log(date + 'id=' + socket.id + ' Received Message: ' + JSON.stringify(message));

        // get send target
        var target = message.sendto;
        if (target) {
            //console.log('===== message emit to -->' + target);
            socket.to(target).emit('message', message);
            return;
        }

        // broadcast in room
        emitMessage('message', message);
    });
    socket.on('ping', function (message) {
        //console.log("ping");
        socket.emit('ping', message);
    });
    // When the user hangs up
    // broadcast bye signal to all users in the room
    socket.on('disconnect', function () {
        // close user connection
        console.log((new Date()) + ' Peer disconnected. id=' + socket.id);
        removeUser(socket.id);
        // --- emit ----
        emitMessage('user disconnected', { id: socket.id });
        // --- leave room --
        var roomname = getRoomname();
        if (roomname) {
            socket.leave(roomname);
        }
    });

});