var iourl = "";
var socket;
var lastPing = new Date();
async function GetIOUrl(){
    let response = await fetch("/-/iourl");
    if (response.status != 200) {
        // エラーを表示
        showMessage(response.statusText);
    } else {
        // メッセージを取得しました
        let message = await response.text();
        iourl = message;
    }
}
async function subscribe() {
    while (true) {
        await GetIOUrl();
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (iourl != "") {
            console.log("get url" + iourl);
            break;
        }
    }
}
subscribe();
function OnEnter(){
    if(iourl == ""){
        console.log("no url");
        return;
    }
    var room = document.getElementById("roomname");
    console.log(room.value)
    console.log(socket);
    if (socket == undefined) {
        console.log("no socket");
    }else {
        socket.disconnect();
    }
    socket = io.connect(iourl);
    socket.on('connect',function(evt){
        socket.emit('enter', room.value);
     });
    socket.on('message',function(evt) { OnRecvMessage(evt); } );
    socket.on("disconnect", function () {});
    socket.on('ping', function (evt) { OnRecvPing();});
}
function OnRecvMessage(msg){
    var recv = document.getElementById("recv");
    var li = document.createElement("li");
    var text = document.createTextNode(JSON.stringify(msg));
    li.appendChild(text);
    recv.appendChild(li);
}
function OnSendMessage(){
    if(socket == undefined){
        console.log("no socket");
    }
    var msg = document.getElementById("message");
    var send = {message:msg.value}
    socket.emit('message',send);

}
function OnRecvPing(){
    var ping = document.getElementById("ping");
    var diff = lastPing.getTime() - new Date().getTime();
    ping.innerText = diff + " ms";
}
function Ping(){
    if (socket == undefined) {
        console.log("no socket");
    }
    lastPing = new Date();
    socket.emit('ping',{});
 
}
function Disconnect(){
    if (socket == undefined) {
        console.log("no socket");
    }
    socket.disconnect();
}