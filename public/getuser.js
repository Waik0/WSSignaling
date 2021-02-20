function setText(json){
    var dom = document.getElementById('users');
    while (dom.firstChild) {
        dom.firstChild.remove()
    }
    var rooms = {};
    for(let key in json){
        if(rooms[json[key]] == undefined){
            rooms[json[key]] = {};
        }
        rooms[json[key]][key] = "1";
    }
    var tbl = document.createElement("table");
    var tblBody = document.createElement("tbody");
    for(let k in rooms){
        var row = document.createElement("tr");
        var title = document.createElement("td");
        var titleText = document.createTextNode(k);
        title.appendChild(titleText);
        row.appendChild(title);
        for(let k2 in rooms[k]){
            var cell = document.createElement("td");
            var cellText = document.createTextNode(k2);
            cell.appendChild(cellText);
            row.appendChild(cell);
        }
        tblBody.appendChild(row);
    }
    tbl.appendChild(tblBody);
    dom.appendChild(tbl);
    tbl.setAttribute("border", "1");
}
async function getUsers(){
    let response = await fetch("/-/users");
    if (response.status != 200) {
        // エラーを表示
        showMessage(response.statusText);
    } else {
        // メッセージを取得しました
        let message = await response.text();
        setText(JSON.parse(message));
    }
}
async function subscribe() {
    while(true){
        await getUsers();
        await new Promise(resolve => setTimeout(resolve, 1000));
    
    }
}
subscribe();