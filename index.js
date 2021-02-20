"use strict";
const PORT = process.env.PORT || 3000;
var express = require('express');
const basicAuth = require("express-basic-auth")
var cookie = require('cookie');
var WebSocket = require('ws');
var app = express();
var srv = require('http').Server(app);
const basicUserName = "wssig";
const basicPassword = "test";
//basicauth
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
//routing
app.use('/static', express.static(__dirname + '/public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
// app.get('/-/rooms', function (req, res) {
//     res.send(rooms);
// });
app.get('/-/users', function (req, res) {
    res.send(users);
});
var ws = new WebSocket.Server({
    noServer : true
});
var rooms = {};
var users = {};
ws.on('connection', (socket,req) => {
    //onconnect
    socket.id = req.headers['sec-websocket-key'];
    users[socket.id] = "";
    if(req.headers['cookie'] == undefined){
        socket.close();
        return;
    }
    var parsedCookie = cookie.parse(req.headers['cookie']);
    if(parsedCookie.create != undefined){
        createRoom(parsedCookie.create);
    }
    else if(parsedCookie.join != undefined){
        joinRoom(parsedCookie.join)
    }else{
        socket.close();
        return;
    }
    var con = {};
    con.command = "sys_connected";
    con.msgfrom = socket.id;
    socket.send(JSON.stringify(con));
    console.log('connected : ' + socket.id);
    //functions
    //ルーム生成
    function createRoom(room) {
        if(rooms[room] == undefined){
            console.log("create room : " + room);
            rooms[room] = {};
            joinRoom(room);
        }else{
            leaveRoom(room);
            socket.close();
        }
    }
    //ルーム入室
    function joinRoom(room) {
        if (rooms[room] == undefined) {
            leaveRoom(room);
            socket.close();
            return;
        }
        console.log("join room  : " + room);
        socket.room = room;
        rooms[room][socket.id] = socket;
        users[socket.id] = room;
    }
    //ルーム退室
    function leaveRoom(room){
        if(room == undefined){
            return;
        }
        if(rooms[room] != undefined){
            delete rooms[room][socket.id];
            //console.log(Object.keys(rooms[room]).length);
            if (Object.keys(rooms[room]).length <= 0) {
                console.log("delete room : " + room);
                delete rooms[room];
            } 
        }
        if (users[socket.id] != undefined) {
            delete users[socket.id];
        }
        console.log("leave room : " + room);
    }
    //ルームか個人にメッセージ送信
    function sendMsg(ms){
        try {
            var json = JSON.parse(ms);
            var room = socket.room;
            if ( room == undefined){
                leaveRoom(room);
                socket.close();
            }
            if (rooms[room] == undefined) {
                console.log(room);
                leaveRoom(room);
                socket.close();
                return;
            }
            json.msgfrom = socket.id;
            for (let u in rooms[room]){
                rooms[room][u].send(JSON.stringify(json));
            }

            //console.log("meessage : " + ms);
        }catch (e){
            console.log(e);
        }
    }
    socket.on('message', ms => {
        sendMsg(ms);
    });

    socket.on('close', () => {
        sendMsg('{command:"sys_leave"}');
        leaveRoom(socket.room);
        console.log('closed : ' + socket.id);
    });
});
srv.on('upgrade', function (request, socket, head) {
    try {
        var parsedCookie = cookie.parse(request.headers['cookie']);
        if(parsedCookie.username == undefined || parsedCookie.password == undefined)
        {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        const userMatch = basicAuth.safeCompare(parsedCookie.username, basicUserName)
        const passMatch = basicAuth.safeCompare(parsedCookie.password, basicPassword)
        if (!(userMatch & passMatch)) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
    }catch{
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }
    ws.handleUpgrade(request, socket, head, function (s) {
        ws.emit('connection', s, request);
    });
});
srv.listen(PORT, function () {
    console.log('signaling server started on port:' + PORT);
}); 