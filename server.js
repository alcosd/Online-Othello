const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
var url;
var users = {};
var rooms = {};
var len;

app.use(express.static(path.join(__dirname, "..")));
app.use(express.urlencoded({extended:true}));
app.get('/', (req, res) => {
    url = req.url;
    res.sendFile(path.join(__dirname, "../index.html"));
});
io.on('connection', (socket) => {
    console.log("a user connected");

    socket.on('disconnect', () => {
        console.log("a user disconnected");

        //ルームから削除
        for(var r of Object.keys(rooms)) {
            if(rooms[r][socket.id] != null) {
                //退出したユーザーの相手をホームに戻す
                try{
                    io.to(users[socket.id].room).emit("leaveRoom", url==null ? "" : url);
                }
                catch(err){
                    throw new Error(err);
                }
                //ルーム事削除
                delete rooms[r];
            }
        }

        //ユーザー一覧からも削除
        if(users[socket.id]) {
            delete users[socket.id];
        }
    });

    socket.on('name', (name) => {
        users[socket.id] = {
            id: socket.id,
            room: null,
            name: name,
            status: 0,
            opposition: null,
            turn: 0,
        }
    });

    socket.on('newRoomId', (data) => {
        // console.log(id, gridLength);
        if(rooms[data.id] == undefined) {
            socket.emit("Permission_newRoomId");
            // console.log("permitted", rooms[data.id])
            socket.join(data.id);    
            users[socket.id].status = 1; //host status
            users[socket.id].room = data.id;
            rooms[data.id] = [];
            rooms[data.id][socket.id] = users[socket.id];
            len = data.len;
        }
        else {
            socket.emit("Error_newRoomId");
        }
    });

    socket.on('roomId', (id) => {
        // console.log(id);
        if(rooms[id] != null) {
            //ホストの入室許可を待つ
            socket.emit("PermissionWaiting");
            io.to(getHostOfRoom(rooms[id])).emit("requirePermission", users[socket.id]);
        }
        else {
            socket.emit("Error_roomId");
        }
    });

    socket.on('Permit_enterRoom', (user)=> {
        console.log("permitted");
        io.to(user.id).emit("Permission_enterRoom");

        //users[user.id]初期化
        users[user.id].room = users[socket.id].room;
        rooms[users[socket.id].room][user.id] = users[user.id];
        io.to(user.id).socketsJoin(users[socket.id].room);

        try{
            io.to(users[socket.id].room).emit("initCanvas", len);
        }
        catch(err) {
            throw new Error(err);
        }
        io.to(users[socket.id].room).emit("startGame");

        //対戦相手設定
        users[socket.id].opposition = user;
        users[user.id].opposition = users[socket.id];
        users[socket.id].turn = 1;
        users[socket.id].opposition.turn = 2;
        io.to(socket.id).emit("checkTurn", users[socket.id].turn);
        io.to(users[socket.id].opposition.id).emit("checkTurn", users[socket.id].opposition.turn);
        io.to(socket.id).emit("newTurn", users[socket.id].turn);
        
    });

    socket.on("changeTurn", (data) => {
        if(data.mode == 0) {
            //Online
            io.to(users[socket.id].room).emit("updateCanvas", data.grid);
            io.to(users[socket.id].room).emit("newTurn", users[socket.id].opposition.turn);
        }
        else if(data.mode==1) {
            //AI
            socket.emit("updateCanvas", data.grid);
            socket.emit("newTurn", 0);    
        }
        
    });

    socket.on("finish", () => {
        gameDisplay.style.display = "none";
        finishDisplay.style.display = "block";
    });

    socket.on("disconnectRoom", () => {
        socket.leave(users[socket.id].room);
    });

    socket.on("VsAI", (len) => {
        socket.emit("startGameWithAI", len);
        socket.emit("newTurn", 2);
    });
})

function searchUser(room, f) {
    Object.keys(room).find(f);
}

function getHostOfRoom(room) {
    return Object.keys(room).find(u => room[u].status == 1);
}

server.listen(5000, () => console.log("server is running", url));