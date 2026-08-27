const MAP_SIZE = 9;
const FOV = 60;
const RAY_COUNT = 120;

const express = require("express");
const app = express();

const winCondition = () =>
    Math.random() < 0.5 ? 16 : 70;

const convertIndex = index => ({
    x: index % MAP_SIZE + 0.5,
    y: Math.floor(index / MAP_SIZE) + 0.5
});

function getEmoji(num) {
    if (num <= 0.8) {
        return "⬜";
    } else if (num <= 1.6) {
        return "🟨";
    } else if (num <= 3.2) {
        return "🟧";
    } else if (num <= 6.4) {
        return "🟥";
    } else if (num <= 12.8) {
        return "⬛";
    }

    return "⬛";
}


// =====================
// MAZE SEED
// =====================

const SAVE = [
    1, 0, 0, 1, 1, 1, 0,
    1, 0, 1, 0, 1, 0, 1
];


const mapTemplate = [
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 0, 1, 0, { count: 13 }, 0, 0, 0, 1,
    1, 0, 1, { count: 12 }, 1, 0, 1, { count: 11 }, 1,
    1, 0, { count: 9 }, 0, { count: 7 }, 0, { count: 10 }, 0, 1,
    1, 0, 1, { count: 8 }, 1, { count: 6 }, 1, 0, 1,
    1, 0, { count: 3 }, 0, 0, 0, { count: 5 }, 0, 1,
    1, { count: 2 }, 1, { count: 1 }, 1, { count: 4 }, 1, 0, 1,
    1, 0, 0, 0, { count: 0 }, 0, 0, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1
];


const map = [];


// =====================
// PLAYER
// =====================

const playerPosition = {
    winCondition: 0,
    score: 0,
    step: 0,
    x: 1.5,
    y: 1.5,
    fov: FOV,
    playerOrientation: 90
};


// =====================
// SPRITES
// =====================

const sprites = [
    {
        id: "eye1",
        x: 1.5,
        y: 7.5,
        type: "eye",
        health: 3,
        maxHealth: 3
    },

    {
        id: "eye2",
        x: 7.5,
        y: 1.5,
        type: "eye",
        health: 3,
        maxHealth: 3
    },

    {
        id: "eye3",
        x: 7.5,
        y: 7.5,
        type: "eye",
        health: 3,
        maxHealth: 3
    },

    {
        id: "checkpoint",
        x: null,
        y: null,
        type: "circle"
    }
];


// =====================
// DIRECTIONS
// =====================

const getDirection = orient => {

    let arrow;

    if (orient >= 337.5 || orient < 22.5) {
        arrow = "➡️";
    }
    else if (orient >= 22.5 && orient < 67.5) {
        arrow = "↘️";
    }
    else if (orient >= 67.5 && orient < 112.5) {
        arrow = "⬇️";
    }
    else if (orient >= 112.5 && orient < 157.5) {
        arrow = "↙️";
    }
    else if (orient >= 157.5 && orient < 202.5) {
        arrow = "⬅️";
    }
    else if (orient >= 202.5 && orient < 247.5) {
        arrow = "↖️";
    }
    else if (orient >= 247.5 && orient < 292.5) {
        arrow = "⬆️";
    }
    else if (orient >= 292.5 && orient < 337.5) {
        arrow = "↗️";
    }
    else {
        arrow = "🔴";
    }

    return arrow;
};


// =====================
// MOVEMENT
// =====================

const getCartesian = orient => {

    const rad = orient * Math.PI / 180;

    const dx = Math.cos(rad) * 0.5;
    const dy = Math.sin(rad) * 0.5;

    return {
        x: dx,
        y: dy
    };
};


const angleWrap = angle =>
    ((angle % 360) + 360) % 360;


const getCell = (map, x, y) =>
    map[x + y * MAP_SIZE];


// =====================
// A*
// =====================

function findPath(startX, startY, targetX, targetY) {

    startX = Math.floor(startX);
    startY = Math.floor(startY);

    targetX = Math.floor(targetX);
    targetY = Math.floor(targetY);

    const open = [
        {
            x: startX,
            y: startY,
            g: 0,
            h: Math.abs(targetX - startX) +
               Math.abs(targetY - startY),
            parent: null
        }
    ];

    const closed = new Set();

    while (open.length > 0) {

        let best = 0;

        for (let i = 1; i < open.length; i++) {

            if (
                open[i].g + open[i].h <
                open[best].g + open[best].h
            ) {
                best = i;
            }
        }

        const current = open.splice(best, 1)[0];

        const currentKey =
            `${current.x},${current.y}`;

        if (closed.has(currentKey)) {
            continue;
        }

        closed.add(currentKey);


        // Reached target
        if (
            current.x === targetX &&
            current.y === targetY
        ) {

            const path = [];

            let node = current;

            while (node.parent !== null) {

                path.unshift(node.direction);

                node = node.parent;
            }

            return path;
        }


        const neighbors = [

            {
                x: 0,
                y: -1,
                direction: {
                    x: 0,
                    y: -1
                }
            },

            {
                x: 0,
                y: 1,
                direction: {
                    x: 0,
                    y: 1
                }
            },

            {
                x: -1,
                y: 0,
                direction: {
                    x: -1,
                    y: 0
                }
            },

            {
                x: 1,
                y: 0,
                direction: {
                    x: 1,
                    y: 0
                }
            }

        ];


        for (const neighbor of neighbors) {

            const newX =
                current.x + neighbor.x;

            const newY =
                current.y + neighbor.y;


            if (
                newX < 0 ||
                newX >= MAP_SIZE ||
                newY < 0 ||
                newY >= MAP_SIZE
            ) {
                continue;
            }


            if (
                getCell(map, newX, newY) === 1
            ) {
                continue;
            }


            const neighborKey =
                `${newX},${newY}`;


            if (closed.has(neighborKey)) {
                continue;
            }


            const g =
                current.g + 1;


            const h =
                Math.abs(targetX - newX) +
                Math.abs(targetY - newY);


            open.push({
                x: newX,
                y: newY,
                g: g,
                h: h,
                direction: neighbor.direction,
                parent: current
            });
        }
    }

    return null;
}


// =====================
// ASCII MAP
// =====================

function toAscii(map) {

    let ascii = "";

    for (let i = 0; i < map.length; i++) {

        ascii +=
            map[i] === 1
                ? "⬜"
                : "⬛";

        if (
            (i + 1) % MAP_SIZE === 0
        ) {
            ascii += "\n";
        }
    }

    return ascii;
}


// =====================
// MAZE GENERATOR
// =====================

function generateMaze(id) {

    playerPosition.winCondition =
        winCondition();

    let mazeId = id;
    let resultId = id;


    if (mazeId === undefined) {

        const sections = [

            [1, 1],

            [1, 1],

            [1, 1, 1],

            [1, 1, 1],

            [1, 1],

            [1, 1]

        ];


        for (const section of sections) {

            const random =
                Math.floor(
                    Math.random() *
                    section.length
                );

            section[random] = 0;
        }


        mazeId =
            sections.flat();

        resultId =
            mazeId;
    }


    for (
        let i = 0;
        i < mapTemplate.length;
        i++
    ) {

        if (
            mapTemplate[i] === 0 ||
            mapTemplate[i] === 1
        ) {

            map[i] =
                mapTemplate[i];

        }
        else {

            map[i] =
                mazeId[
                    mapTemplate[i].count
                ];
        }
    }


    return resultId;
}


// =====================
// RESET GAME
// =====================

function resetGame() {

    playerPosition.x = 1.5;
    playerPosition.y = 1.5;
    playerPosition.playerOrientation = 90;

    sprites.find(
        sprite => sprite.id === "eye1"
    ).x = 1.5;

    sprites.find(
        sprite => sprite.id === "eye1"
    ).y = 7.5;


    sprites.find(
        sprite => sprite.id === "eye2"
    ).x = 7.5;

    sprites.find(
        sprite => sprite.id === "eye2"
    ).y = 1.5;


    sprites.find(
        sprite => sprite.id === "eye3"
    ).x = 7.5;

    sprites.find(
        sprite => sprite.id === "eye3"
    ).y = 7.5;


    for (const sprite of sprites) {

        if (sprite.type === "eye") {

            sprite.health =
                sprite.maxHealth;
        }
    }


    generateMaze();
}


// =====================
// CHECK NPC COLLISION
// =====================
function npcReachedPlayer() {

    const playerCellX =
        Math.floor(playerPosition.x);

    const playerCellY =
        Math.floor(playerPosition.y);

    for (const sprite of sprites) {

        if (
            sprite.type !== "eye" ||
            sprite.health <= 0
        ) {
            continue;
        }

        const npcCellX =
            Math.floor(sprite.x);

        const npcCellY =
            Math.floor(sprite.y);

        if (
            npcCellX === playerCellX &&
            npcCellY === playerCellY
        ) {
            return true;
        }
    }

    return false;
}


// =====================
// RAYCASTING
// =====================

function castRay() {

    const result = [];


    for (
        let i = 0;
        i < RAY_COUNT;
        i++
    ) {

        const rayOffset =
            -FOV / 2 +
            (i / (RAY_COUNT - 1)) * FOV;


        const rayDeg =
            angleWrap(
                playerPosition.playerOrientation +
                rayOffset
            );


        const rayRad =
            rayDeg * Math.PI / 180;


        const rayDirX =
            Math.cos(rayRad);

        const rayDirY =
            Math.sin(rayRad);


        let cellX =
            Math.floor(playerPosition.x);

        let cellY =
            Math.floor(playerPosition.y);


        const stepX =
            Math.sign(rayDirX);

        const stepY =
            Math.sign(rayDirY);


        let deltaDistX;

        if (rayDirX === 0) {
            deltaDistX = Infinity;
        }
        else {
            deltaDistX =
                Math.abs(1 / rayDirX);
        }


        let deltaDistY;

        if (rayDirY === 0) {
            deltaDistY = Infinity;
        }
        else {
            deltaDistY =
                Math.abs(1 / rayDirY);
        }


        let sideDistX;

        if (rayDirX > 0) {

            sideDistX =
                (
                    Math.floor(playerPosition.x) +
                    1 -
                    playerPosition.x
                ) * deltaDistX;

        }
        else {

            sideDistX =
                (
                    playerPosition.x -
                    Math.floor(playerPosition.x)
                ) * deltaDistX;
        }


        let sideDistY;

        if (rayDirY > 0) {

            sideDistY =
                (
                    Math.floor(playerPosition.y) +
                    1 -
                    playerPosition.y
                ) * deltaDistY;

        }
        else {

            sideDistY =
                (
                    playerPosition.y -
                    Math.floor(playerPosition.y)
                ) * deltaDistY;
        }


        let side = null;
        let distance = 0;


        for (
            let step = 0;
            step < MAP_SIZE * MAP_SIZE;
            step++
        ) {

            if (sideDistX < sideDistY) {

                distance =
                    sideDistX;

                sideDistX +=
                    deltaDistX;

                cellX +=
                    stepX;

                side = "vert";

            }
            else {

                distance =
                    sideDistY;

                sideDistY +=
                    deltaDistY;

                cellY +=
                    stepY;

                side = "horiz";
            }


            if (
                cellX < 0 ||
                cellX >= MAP_SIZE ||
                cellY < 0 ||
                cellY >= MAP_SIZE
            ) {
                break;
            }


            const cellIndex =
                cellX +
                cellY * MAP_SIZE;


            if (
                map[cellIndex] === 1
            ) {
                break;
            }
        }


        const hitX =
            playerPosition.x +
            rayDirX * distance;

        const hitY =
            playerPosition.y +
            rayDirY * distance;


        result[i] = {

            ray: i,

            angle: rayDeg,

            x: hitX,

            y: hitY,

            distance: distance,

            side: side,

            cellX: cellX,

            cellY: cellY,

            screenHeight:
                Math.min(
                    80,
                    80 / distance
                )
        };
    }


    return result;
}


// =====================
// SPRITE RENDERING
// =====================

function renderSprites(screen, rays) {

    for (const sprite of sprites) {

        if (
            sprite.x === null ||
            sprite.y === null
        ) {
            continue;
        }


        const dx =
            sprite.x -
            playerPosition.x;

        const dy =
            sprite.y -
            playerPosition.y;


        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        if (distance > 8) {
            continue;
        }


        const spriteAngle =
            angleWrap(
                Math.atan2(dy, dx) *
                180 / Math.PI
            );


        let relativeAngle =
            spriteAngle -
            playerPosition.playerOrientation;


        if (relativeAngle > 180) {
            relativeAngle -= 360;
        }

        if (relativeAngle < -180) {
            relativeAngle += 360;
        }


        if (
            relativeAngle < -FOV / 2 ||
            relativeAngle > FOV / 2
        ) {
            continue;
        }


        const screenX =
            (
                relativeAngle +
                FOV / 2
            ) / FOV *
            (RAY_COUNT - 1);


        const rayIndex =
            Math.round(screenX);


        if (
            rayIndex < 0 ||
            rayIndex >= RAY_COUNT
        ) {
            continue;
        }


        const wallHeight =
            rays[rayIndex].screenHeight;


        const spriteHeight =
            wallHeight * 0.8;

        const spriteWidth =
            spriteHeight;


        const top =
            40 -
            spriteHeight / 2;

        const bottom =
            40 +
            spriteHeight / 2;


        const left =
            screenX -
            spriteWidth / 2;

        const right =
            screenX +
            spriteWidth / 2;


        const outerRadius =
            spriteHeight / 2;

        const middleRadius =
            outerRadius * 4 / 5;

        const innerRadius =
            middleRadius * 1 / 3;


        for (
            let y = Math.floor(top);
            y < Math.ceil(bottom);
            y++
        ) {

            for (
                let x = Math.floor(left);
                x < Math.ceil(right);
                x++
            ) {

                if (
                    x < 0 ||
                    x >= 120 ||
                    y < 0 ||
                    y >= 80
                ) {
                    continue;
                }


                if (
                    distance >=
                    rays[x].distance
                ) {
                    continue;
                }


                const normalizedX =
                    (x - left) /
                    spriteWidth;

                const normalizedY =
                    (y - top) /
                    spriteHeight;


                if (
                    sprite.type === "circle"
                ) {

                    const circleX =
                        normalizedX * 2 - 1;

                    const circleY =
                        normalizedY * 2 - 1;


                    const distanceFromCenter =
                        Math.sqrt(
                            circleX * circleX +
                            circleY * circleY
                        );


                    if (
                        distanceFromCenter <= 1
                    ) {

                        screen[
                            y * 120 + x
                        ] = "🟩";
                    }
                }


                else if (
                    sprite.type === "eye"
                ) {

                    const circleX =
                        normalizedX * 2 - 1;

                    const circleY =
                        normalizedY * 2 - 1;


                    const distanceFromCenter =
                        Math.sqrt(
                            circleX * circleX +
                            circleY * circleY
                        );


                    if (
                        distanceFromCenter <=
                        innerRadius / outerRadius
                    ) {

                        screen[
                            y * 120 + x
                        ] = "⬛";

                    }

                    else if (
                        distanceFromCenter <=
                        middleRadius / outerRadius
                    ) {

                        screen[
                            y * 120 + x
                        ] = "⬜";

                    }

                    else if (
                        distanceFromCenter <= 1
                    ) {

                        screen[
                            y * 120 + x
                        ] = "🟩";
                    }
                }


                else if (
                    sprite.type === "custom"
                ) {

                    const data =
                        sprite.data;


                    const dataX =
                        Math.floor(
                            normalizedX *
                            data[0].length
                        );


                    const dataY =
                        Math.floor(
                            normalizedY *
                            data.length
                        );


                    const pixel =
                        data[dataY][dataX];


                    if (pixel !== 0) {

                        screen[
                            y * 120 + x
                        ] = pixel;
                    }
                }
            }
        }


        // HEALTH BAR

        if (
            sprite.type === "eye" &&
            sprite.health !== undefined &&
            sprite.maxHealth !== undefined
        ) {

            const healthRatio =
                Math.max(
                    0,
                    Math.min(
                        1,
                        sprite.health /
                        sprite.maxHealth
                    )
                );


            const barWidth =
                spriteWidth;

            const barHeight = 3;


            const barLeft =
                screenX -
                barWidth / 2;


            const barTop =
                top -
                barHeight -
                2;


            const filledWidth =
                barWidth *
                healthRatio;


            for (
                let y = Math.floor(barTop);
                y < Math.ceil(
                    barTop + barHeight
                );
                y++
            ) {

                for (
                    let x = Math.floor(barLeft);
                    x < Math.ceil(
                        barLeft + barWidth
                    );
                    x++
                ) {

                    if (
                        x < 0 ||
                        x >= 120 ||
                        y < 0 ||
                        y >= 80
                    ) {
                        continue;
                    }


                    if (
                        distance >=
                        rays[x].distance
                    ) {
                        continue;
                    }


                    if (
                        x <
                        barLeft +
                        filledWidth
                    ) {

                        screen[
                            y * 120 + x
                        ] = "✅";

                    }
                    else {

                        screen[
                            y * 120 + x
                        ] = "❌";
                    }
                }
            }
        }
    }
}


// =====================
// ASCII RENDER
// =====================

function renderAscii(rays) {

    const screen = [];


    for (
        let y = 0;
        y < 80;
        y++
    ) {

        for (
            let x = 0;
            x < 120;
            x++
        ) {

            const height =
                rays[x].screenHeight;


            const top =
                (80 - height) / 2;


            const bottom =
                top + height;


            const shade =
                rays[x].distance;


            if (
                y >= top &&
                y < bottom
            ) {

                screen[
                    y * 120 + x
                ] = getEmoji(shade);

            }
            else {

                if (y < 40) {

                    screen[
                        y * 120 + x
                    ] = "⬛";

                }
                else {

                    screen[
                        y * 120 + x
                    ] = "🏿";
                }
            }
        }
    }


    renderSprites(
        screen,
        rays
    );


    let output = "";


    for (
        let y = 0;
        y < 80;
        y++
    ) {

        for (
            let x = 0;
            x < 120;
            x++
        ) {

            output +=
                screen[
                    y * 120 + x
                ];
        }

        output += "\n";
    }


    output +=
        `<font size="120">X: ${playerPosition.x.toFixed(2)} | Y: ${playerPosition.y.toFixed(2)} | Orientation: ${playerPosition.playerOrientation}° | Score: ${playerPosition.score}</font>`;


    return output;
}


// =====================
// INITIALIZE
// =====================

generateMaze(SAVE);

console.log(
    toAscii(map),
    SAVE
);


// =====================
// MOVE
// =====================

app.get("/move", (req, res) => {

    playerPosition.step += 1;


    if (
        playerPosition.step % 30 === 0
    ) {

        playerPosition.score += 1;
    }


    const eyeOne =
        sprites.find(
            sprite => sprite.id === "eye1"
        );

    const eyeTwo =
        sprites.find(
            sprite => sprite.id === "eye2"
        );

    const eyeThree =
        sprites.find(
            sprite => sprite.id === "eye3"
        );


    // PLAYER MOVEMENT

    const futureCartesian =
        getCartesian(
            playerPosition.playerOrientation
        );


    const createFuturePosition = {

        x:
            futureCartesian.x +
            playerPosition.x,

        y:
            futureCartesian.y +
            playerPosition.y
    };


    const futureCell =
        getCell(
            map,
            Math.floor(
                createFuturePosition.x
            ),
            Math.floor(
                createFuturePosition.y
            )
        );


    if (
        futureCell === 0
    ) {

        playerPosition.x =
            createFuturePosition.x;

        playerPosition.y =
            createFuturePosition.y;
    }


    // NPC PATHFINDING

    const findNpcPathOne =
        findPath(
            eyeOne.x,
            eyeOne.y,
            playerPosition.x,
            playerPosition.y
        );


    const findNpcPathTwo =
        findPath(
            eyeTwo.x,
            eyeTwo.y,
            playerPosition.x,
            playerPosition.y
        );


    const findNpcPathThree =
        findPath(
            eyeThree.x,
            eyeThree.y,
            playerPosition.x,
            playerPosition.y
        );


    // MOVE EYE 1

    if (
        eyeOne.health > 0 &&
        findNpcPathOne &&
        findNpcPathOne.length > 0
    ) {
        const firstPathOne = findNpcPathOne[0];

        eyeOne.x += firstPathOne.x;
        eyeOne.y += firstPathOne.y;
    }


    // MOVE EYE 2

   if (
        eyeTwo.health > 0 &&
        findNpcPathTwo &&
        findNpcPathTwo.length > 0
    ) {
        const firstPathTwo = findNpcPathTwo[0];

        eyeTwo.x += firstPathTwo.x;
        eyeTwo.y += firstPathTwo.y;
    }


    // MOVE EYE 3

    if (
        eyeThree.health > 0 &&
        findNpcPathThree &&
        findNpcPathThree.length > 0
    ){
        const firstPathThree = findNpcPathThree[0];

        eyeThree.x += firstPathThree.x;
        eyeThree.y += firstPathThree.y;
    }


    // CHECK IF ANY NPC REACHED PLAYER

    if (
        npcReachedPlayer()
    ) {

        resetGame();
    }


    const response =
        castRay();


    res.send(
        renderAscii(response)
    );
});


// =====================
// RIGHT
// =====================

app.get("/right", (req, res) => {

    playerPosition.playerOrientation -= 15;

    playerPosition.playerOrientation =
        angleWrap(
            playerPosition.playerOrientation
        );


    const response =
        castRay();


    res.send(
        renderAscii(response)
    );
});


// =====================
// LEFT
// =====================

app.get("/left", (req, res) => {

    playerPosition.playerOrientation += 15;

    playerPosition.playerOrientation =
        angleWrap(
            playerPosition.playerOrientation
        );


    const response =
        castRay();


    res.send(
        renderAscii(response)
    );
});


// =====================
// MAP
// =====================

app.get("/map", (req, res) => {

    const localMap =
        [...map];


    const cellIndex =
        Math.floor(playerPosition.x) +
        Math.floor(playerPosition.y) *
        MAP_SIZE;


    localMap[cellIndex] = 2;


    let response = "";


    const checkpoint =
        sprites.find(
            sprite =>
                sprite.id === "checkpoint"
        );


    for (
        let i = 0;
        i < localMap.length;
        i++
    ) {

        if (
            localMap[i] === 1
        ) {

            response += "⬜";
        }

        else if (
            localMap[i] === 2
        ) {

            response +=
                getDirection(
                    playerPosition.playerOrientation
                );
        }

        else if (
            i ===
            playerPosition.winCondition
        ) {

            response += "🔴";


            checkpoint.x =
                convertIndex(
                    playerPosition.winCondition
                ).x;


            checkpoint.y =
                convertIndex(
                    playerPosition.winCondition
                ).y;
        }

        else {

            response += "⬛";
        }


        if (
            (i + 1) % MAP_SIZE === 0
        ) {

            response += "\n";
        }
    }


    res.send(response);


    // CHECKPOINT

    const playerCell =
        Math.floor(playerPosition.x) +
        Math.floor(playerPosition.y) *
        MAP_SIZE;


    if (
        playerCell ===
        playerPosition.winCondition
    ) {

        playerPosition.x = 1.5;
        playerPosition.y = 1.5;

        playerPosition.playerOrientation = 90;

        playerPosition.score += 5;

        generateMaze();
    }
});

app.get("/fire", (req, res) => {
    const rays = castRay();
    const ray = rays[59];

    for (const sprite of sprites) {
        if (sprite.type !== "eye") {
            continue;
        }

        const dx = sprite.x - playerPosition.x;
        const dy = sprite.y - playerPosition.y;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance > 8) {
            continue;
        }

        const spriteAngle =
            angleWrap(
                Math.atan2(dy, dx) * 180 / Math.PI
            );

        let relativeAngle =
            spriteAngle - playerPosition.playerOrientation;

        if (relativeAngle > 180) {
            relativeAngle -= 360;
        }

        if (relativeAngle < -180) {
            relativeAngle += 360;
        }

        if (
            Math.abs(relativeAngle) >
            FOV / (RAY_COUNT - 1) / 2
        ) {
            continue;
        }

        if (distance >= ray.distance) {
            continue;
        }

        sprite.health =
            Math.max(0, sprite.health - 1);

        break;
    }

    const updatedScreen = renderAscii(rays);

    res.send(updatedScreen);
});

// =====================
// SERVER
// =====================

app.listen(
    process.env.PORT || 3000,
    () => {
        console.log(
            "Server is running"
        );
    }
);
