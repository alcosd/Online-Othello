const FIELD_W = 400;
const FIELD_H = 400;  
var discs = 10;
const DISC_W = FIELD_W/discs;
const DISC_H = FIELD_H/discs;

var turn = 1;
var myTurn;
var mode = 0;

class Disc {
    constructor(pos, turn) {
        this.pos = pos;
        this.turn = turn;
        grid[posToIndex(this.pos)] = this.turn;
        // consoleGrid(grid);
    }

    static putDisc(pos, _turn) {
        var vect = [-Number(discs)-Number(1), -Number(discs), -Number(discs)+Number(1), 
                    -Number(1),               Number(1),
                    Number(discs)-Number(1),  Number(discs) , Number(discs)+Number(1)];
        var index = posToIndex(pos);
        var nTurn = _turn==1 ? 2 : 1;
        var totalFlip = 0;
        var flipPos = [];

        if(grid[index] != 0) return [];

        // console.log("check")
        for(var v of vect) {
            var nIndex = index;
            var flip = 0;
            while(grid[nIndex+=v] == nTurn) {
                let nIndexPos = indexToPos(nIndex);
                let vPos = indexToPos(v);
                // console.log(nIndexPos);
                flip++;
                //端で飛び越えるとき

                if(nIndexPos.x==0 && vPos.x<0 || nIndexPos.y==0 && vPos.y<0 || nIndexPos.x==discs-1 && vPos.x>0 || nIndexPos.y==discs-1 && vPos.y>0) {
                    console.log("超えた");
                    break;
                }
            }

            if(grid[nIndex] == _turn) {
                for(var i=0; i<flip; i++) {
                    // console.log({turn:_turn, nIndex: indexToPos(nIndex), flipPos: indexToPos(index + (i+1) * v), flip:flip});
                    //i+1しないとi*v = 0となるから

                    flipPos.push({pos:indexToPos(index + (i+1) * v), turn:_turn});
                }
                totalFlip += flip;
                flip = 0;
            }
        }
        //もし盤面が変わる場合
        if(totalFlip > 0) {
            //裏返す場所

            //置いた場所に置く
            flipPos.push({pos:indexToPos(index), turn:_turn});
            return flipPos;
        }
        return [];
    }
}

class Pos {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

var grid = [];

function setup() {
    noLoop();
}

function drawField(_grid) {
    for(var i=0; i<_grid.length; i++) {
        var x = (i % discs) * DISC_W;
        var y = (int)(i/discs) * DISC_H;
        fill('green');
        rect(x, y, DISC_W, DISC_H);

        if(_grid[i] == 1) {
            fill('white');
            circle(x+DISC_W/2, y+DISC_H/2, DISC_W/2);
        }
        else if(_grid[i] == 2) {
            fill('black');
            circle(x+DISC_W/2, y+DISC_H/2, DISC_W/2);
        }
    }
}

socket.on("startGameWithAI", (len) => {
    myTurn = 1;
    li_turn.innerHTML = `${myTurn==1 ? "白": "黒"}`;
    //AI mode
    mode = 1;
    initCanvas(len);
    gameDisplay.style.display = "block";
});

socket.on("initCanvas", (gridLength) => {
    initCanvas(gridLength);
})

socket.on("checkTurn", (_myTurn) => {
    myTurn = _myTurn;
    // console.log(myTurn)
    li_turn.innerHTML = `${myTurn==1 ? "白": "黒"}`;
    li_turn.style.background = "green";
    
    display_turn.innerHTML = `${turn==1 ? "白": "黒"}の番です。`;
    display_turn.animate(
        [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }],
        1000
    );
})

socket.on("newTurn", (_turn) => {
    //AImodeな時
    // console.log("turn", turn);
    if(mode==1) {
        turn = turn==2 ? 1 : 2;
        console.log("turn", turn, "unko");
    }
    else turn = _turn;
    if(isPuttable(turn).length>0) {
        if(turn == myTurn) {
            // console.log("turn", turn)
            li_turn.style.background = "red";
            li_turn.style.color = "white";
        } else {
            if(mode==1 && turn == 2) {
                console.log(turn);
                console.log("AI", turn, AI(turn));
                
                new Disc(AI(turn), turn);
                socket.emit("changeTurn", {grid:grid, mode:mode});
            }
            li_turn.style.background = "green";
            li_turn.style.color = "white";
        }
        display_turn.innerHTML = `${turn==1 ? "白": "黒"}の番です。`;
        display_turn.animate(
            [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }],
            1000
        );
        // console.log("puttable")
    }
    else {
        socket.emit("changeTurn", grid);
        if(grid.filter(g => g==0).length == 0) {
            socket.emit("finish");
        }
    }
});

socket.on("updateCanvas", (_grid) => {
    //gridの同期
    grid = _grid;
    drawField(grid);
});

function initCanvas(canvasLength) {
    discs = canvasLength;
    var offset = canvasLength/2;
    var canvas = createCanvas(FIELD_W, FIELD_H);
    canvas.parent(gameDisplay);
    canvas.mouseClicked(inputMouseClicked);
    for(let i=0; i<discs*discs; i++) grid.push(0);
    new Disc(new Pos(offset-1, offset-1), 1);
    new Disc(new Pos(offset-1, offset), 2);
    new Disc(new Pos(offset, offset-1), 2);
    new Disc(new Pos(offset, offset), 1);
    drawField(grid);
}

function inputMouseClicked() {
    if(turn == myTurn) {
        var mousePos = floorBoard(mouseX, mouseY);
        //もしdiscを置いて一つでもひっくり返ったら
        let poses = Disc.putDisc(mousePos, turn);
        if(poses.length > 0) {
            console.log(`${turn==1 ? "白": "黒"}が裏返した。`);
            for(let p of poses) {
                new Disc(p.pos, p.turn);
            }
            socket.emit("changeTurn", {grid:grid, mode:mode});
        };
    }
}

function floorBoard(x, y) {
    var fx = (int)(x / DISC_W);
    var fy = (int)(y / DISC_H);
    return(new Pos(fx, fy));
}

function indexToPos(i) {
    var x = (i % discs);
    var y = (int)(i/discs);
    return(new Pos(x, y));
}

function posToIndex(pos) {
    return(Number(pos.y*discs+pos.x));
}

function consoleGrid() {
    for(let i=0; i<10; i++) {
        let line = "";
        for(let j=0; j<10; j++) {
            line += grid[i*10+j];
        }
        console.log(line+"\n");
    }
}

function isPuttable(turn) {
    let choices = [];
    for(let i=0; i<grid.length; i++) {
        if(grid[i] == 0) {
            choices.push(Disc.putDisc(indexToPos(i), turn));
        }
    }
    return choices;
}

function AI(turn) {
    let choices = isPuttable(turn);
    let choice = choices[maxOfAll(isPuttable(turn).map(c => c.length))];
    return choice;
}

function maxOfAll(arr) {
    let _max = 0;
    let maxIndex = 0;
    for(let [index, a] of Object.entries(arr)) {
        _max = max(a, _max);
        if(a==_max) {
            maxIndex = index;
        }
    }
    return maxIndex;
}