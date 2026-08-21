const MAP_SIZE = 9;
const FOV = 60;
const RAY_COUNT = 120;
const express = require("express");
const app = express();

let SAVE;
// [ 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1 ]
try {
    // import { MAZE_SEED } from "./config.js";
    SAVE = MAZE_SEED
} catch (error) { SAVE = [ 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1 ] }


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

const playerPosition = {
    x: 1.5,
    y: 1.5,
    fov: FOV,
    playerOrientation: 90
};

const getCartesian = orient => {
    const rad = orient * Math.PI / 180;

    const dx = Math.cos(rad) * 0.5;
    const dy = Math.sin(rad) * 0.5;
    return { x: dx, y: dy }
};

const angleWrap = angle =>
    ((angle % 360) + 360) % 360;


const getCell = (map, x, y) =>
    map[x + y * MAP_SIZE];


function toAscii(map) {
    let ascii = "";

    for (let i = 0; i < map.length; i++) {
        ascii += map[i] === 1 ? "⬜" : "⬛";

        if ((i + 1) % MAP_SIZE === 0) {
            ascii += "\n";
        }
    }

    return ascii;
}


function generateMaze(id) {
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
            const random = Math.floor(Math.random() * section.length);
            section[random] = 0;
        }

        mazeId = sections.flat();
        resultId = mazeId;
    }

    for (let i = 0; i < mapTemplate.length; i++) {
        if (mapTemplate[i] === 0 || mapTemplate[i] === 1) {
            map[i] = mapTemplate[i];
        } else {
            map[i] = mazeId[mapTemplate[i].count];
        }
    }
  return resultId
}


function castRay() {
    const result = [];

    for (let i = 0; i < RAY_COUNT; i++) {

        /*
         * Spread the rays evenly across the entire FOV.
         *
         * i = 0                  -> -30°
         * i = RAY_COUNT - 1      -> +30°
         */
        const rayOffset =
            -FOV / 2 +
            (i / (RAY_COUNT - 1)) * FOV;

        const rayDeg = angleWrap(
            playerPosition.playerOrientation + rayOffset
        );

        const rayRad = rayDeg * Math.PI / 180;

        const rayDirX = Math.cos(rayRad);
        const rayDirY = Math.sin(rayRad);

        /*
         * Current map cell.
         */
        let cellX = Math.floor(playerPosition.x);
        let cellY = Math.floor(playerPosition.y);

        /*
         * Which direction we move through the grid.
         */
        const stepX = Math.sign(rayDirX);
        const stepY = Math.sign(rayDirY);

        /*
         * Distance along the ray required to cross
         * one vertical grid line.
         */
        let deltaDistX;

        if (rayDirX === 0) {
            deltaDistX = Infinity;
        } else {
            deltaDistX = Math.abs(1 / rayDirX);
        }

        /*
         * Distance along the ray required to cross
         * one horizontal grid line.
         */
        let deltaDistY;

        if (rayDirY === 0) {
            deltaDistY = Infinity;
        } else {
            deltaDistY = Math.abs(1 / rayDirY);
        }

        /*
         * Distance from the player to the first
         * vertical grid boundary.
         */
        let sideDistX;

        if (rayDirX > 0) {
            sideDistX =
                (Math.floor(playerPosition.x) + 1 - playerPosition.x)
                * deltaDistX;
        } else {
            sideDistX =
                (playerPosition.x - Math.floor(playerPosition.x))
                * deltaDistX;
        }

        /*
         * Distance from the player to the first
         * horizontal grid boundary.
         */
        let sideDistY;

        if (rayDirY > 0) {
            sideDistY =
                (Math.floor(playerPosition.y) + 1 - playerPosition.y)
                * deltaDistY;
        } else {
            sideDistY =
                (playerPosition.y - Math.floor(playerPosition.y))
                * deltaDistY;
        }

        let reachedWall = false;
        let side = null;
        let distance = 0;

        /*
         * Maximum number of cells a ray can cross.
         * This prevents an accidental infinite loop.
         */
        for (let step = 0; step < MAP_SIZE * MAP_SIZE; step++) {

            /*
             * Vertical boundary is closer.
             */
            if (sideDistX < sideDistY) {

                distance = sideDistX;

                sideDistX += deltaDistX;
                cellX += stepX;

                side = "vert";

            /*
             * Horizontal boundary is closer.
             */
            } else {

                distance = sideDistY;

                sideDistY += deltaDistY;
                cellY += stepY;

                side = "horiz";
            }

            /*
             * Check if the ray left the map.
             */
            if (
                cellX < 0 ||
                cellX >= MAP_SIZE ||
                cellY < 0 ||
                cellY >= MAP_SIZE
            ) {
                reachedWall = true;
                break;
            }

            /*
             * Check the cell the ray just entered.
             */
            const cellIndex =
                cellX + cellY * MAP_SIZE;

            if (map[cellIndex] === 1) {
                reachedWall = true;
                break;
            }
        }

        /*
         * Calculate the exact position where
         * the ray hit the wall.
         */
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
            screenHeight: Math.min(80, 80 / distance)
        };
    }

    return result;
}

function renderAscii(rays) {
    const screen = [];

    for (let y = 0; y < 80; y++) {
        for (let x = 0; x < 120; x++) {

            const height = rays[x].screenHeight;

            const top = (80 - height) / 2;
            const bottom = top + height;

            if (y >= top && y < bottom) {
                screen[y * 120 + x] = "⬜";
            } else {
                screen[y * 120 + x] = "⬛";
            }
        }
    }

    let output = "";

    for (let y = 0; y < 80; y++) {
        for (let x = 0; x < 120; x++) {
            output += screen[y * 120 + x];
        }

        output += "\n";
    }

    return output;
}

generateMaze(SAVE);

const rays = castRay();

console.log(toAscii(map), SAVE);
// console.log(renderAscii(rays))
// console.log(rays);

app.get("/move", (req, res) => {
    let futureCartesian = getCartesian(playerPosition.playerOrientation);
    let createFuturePosition = { x: futureCartesian.x + playerPosition.x, y: futureCartesian.y + playerPosition.y };
    let futureCell = getCell(map, Math.floor(createFuturePosition.x), Math.floor(createFuturePosition.y));
    if (futureCell === 0) {
    playerPosition.x = createFuturePosition.x;
    playerPosition.y = createFuturePosition.y;
    }
    let response = castRay();
    res.send(renderAscii(response));
});

app.get("/right", (req, res) => {
    playerPosition.playerOrientation -= 90;
    playerPosition.playerOrientation = angleWrap(playerPosition.playerOrientation);
    let response = castRay();
    res.send(renderAscii(response));

});

app.get("/left", (req, res) => {
    playerPosition.playerOrientation += 45;
    playerPosition.playerOrientation = angleWrap(playerPosition.playerOrientation);
    let response = castRay();
    res.send(renderAscii(response));
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server is running");
});
