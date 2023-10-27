const socket = io();
const minLen = 4;

btn_name.addEventListener('click', () => {
    if(input_name.value != "") {
        socket.emit('name', input_name.value);
        input_name.value = "";
        form_name.style.display = "none";
        form_room.style.display = "block";
    } 
});

btn_newRoomId.addEventListener('click', () => {
    if(input_newRoomId.value != "") {
        let len = input_gridLength.value;
        if(len < minLen) len = minLen;
        else if(len%2 == 1) len++; 
        socket.emit("newRoomId", {id:input_newRoomId.value, len:len});
        input_newRoomId.value = "";
    }
});

btn_roomId.addEventListener('click', () => {
    if(input_roomId.value != "") {
        // console.log(input_newRoomId);
        socket.emit("roomId", input_roomId.value);
        input_roomId.value = "";
    }
});

btn_vsAI.addEventListener('click', () => {
    let len = input_lenVsAI.value;
    if(len < minLen) len = minLen;
    else if(len%2 == 1) len++; 
    socket.emit('VsAI', len);
    form_room.style.display = "none";
    formDisplay.style.display = "none";
})

socket.on("Error_newRoomId", () => {
    p_newRoomId.innerHTML = "その名前はすでに使われています。";
});

socket.on("Error_roomId", () => {
    p_roomId.innerHTML = "その部屋は存在しません";
})

socket.on("Permission_newRoomId", () => {
    form_room.style.display = "none";
    loadingDisplay.style.display = "block";
});

socket.on("requirePermission", (user) => {
    // if(confirm(`${user.name}の参加を許可しますか？`)) {
    //     loadingDisplay.style.display = "none";
    //     formDisplay.style.display = "none";
    //     socket.emit("Permit_enterRoom", user);
    // }
    loadingDisplay.style.display = "none";
    formDisplay.style.display = "none";
    socket.emit("Permit_enterRoom", user);
});

socket.on("PermissionWaiting", () => {
    form_room.style.display = "none";
    loadingDisplay.style.display = "block";
})

socket.on("Permission_enterRoom", () => {
    formDisplay.style.display = "none";
});

socket.on("startGame", () => {
    gameDisplay.style.display = "block";
});

socket.on("leaveRoom", (url) => {
    socket.emit("disconnectRoom");
    window.location.href = url;
});

window.onload = () => {
    gameDisplay.style.display = "none";
    form_room.style.display = "none";
    loadingDisplay.style.display = "none";
    finishDisplay.style.display = "none";
}