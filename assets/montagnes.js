const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const path = "assets/img/";
const assets = {
    licorne: new Image(), licorneDcd: new Image(), wagon: new Image(),
    coin: new Image(), star: new Image(),
    flagStart: new Image(), flagEnd: new Image(),
    hFull: path + "heart1.png", hEmpty: path + "heart3.png"
};

// --- CHARGEMENT ---
assets.licorne.src = path + "licornee.png";
assets.licorneDcd.src = path + "licornedcd.png";
assets.wagon.src = path + "wagonjeu.jpg";
assets.coin.src = path + "coins.png";
assets.star.src = path + "star1.png";
assets.flagStart.src = path + "drapeaunoiretblancdroit.png";
assets.flagEnd.src = path + "drapeaunoiretblanc.png";

// --- AUDIO ---
const sounds = {
    collect: new Audio('assets/sounds/collect.mp3'),
    jump: new Audio('assets/sounds/jump.mp3'),
    music: new Audio('assets/sounds/musique_fond.mp3') // Ajoute un fichier musique_fond.mp3
};
sounds.music.loop = true;

let posX = -200; 
let lives = 3;
let coins = 0;
let stars = 0;
let currentLevel = 1;
let gameState = "WAITING"; 
const keys = {};

const player = { x: 150, y: 0, w: 75, h: 75, vY: 0, gravity: 0.7, jump: -22, onGround: false };

const levels = {
    1: { name: "Plage Calme", color: "#FF4500", speed: 4.5, finish: 3500, freq: 0.02, amp: 50, holes: [{s: 800, e: 1050}, {s: 2000, e: 2250}] },
    2: { name: "Forêt Dense", color: "#FFA500", speed: 6, finish: 4500, freq: 0.03, amp: 70, holes: [{s: 600, e: 950}, {s: 1800, e: 2200}] },
    3: { name: "Montagne Magique", color: "#9400D3", speed: 8, finish: 6000, freq: 0.04, amp: 90, holes: [{s: 500, e: 900}, {s: 1500, e: 2000}, {s: 3500, e: 4000}] }
};

let levelItems = [];
function generateItems() {
    levelItems = [];
    const lvl = levels[currentLevel];
    for (let x = 400; x < lvl.finish - 200; x += 250) {
        if (!lvl.holes.some(h => x > h.s - 20 && x < h.e + 20)) {
            levelItems.push({ 
                x: x, 
                yOffset: -100 - Math.random() * 100, // Aligne les objets plus haut
                type: Math.random() > 0.3 ? 'coin' : 'star', 
                collected: false 
            });
        }
    }
}

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        if (gameState === "WAITING") { 
            gameState = "PLAYING"; 
            generateItems(); 
            sounds.music.play().catch(() => console.log("Musique en attente d'interaction"));
        }
        else if (gameState === "PLAYING" && player.onGround) {
            player.vY = player.jump;
            player.onGround = false;
            sounds.jump.currentTime = 0;
            sounds.jump.play().catch(() => {});
        }
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

function getRailY(x) {
    const lvl = levels[currentLevel];
    if (lvl.holes.some(h => x > h.s && x < h.e)) return null;
    let baseY = canvas.height * 0.7;
    return baseY + Math.sin(x * lvl.freq) * lvl.amp;
}

function update() {
    if (gameState !== "PLAYING") return;

    posX += levels[currentLevel].speed;
    player.vY += player.gravity;
    player.y += player.vY;

    // Collision Rail
    let cRY = getRailY(posX + player.x + player.w/2);
    if (cRY && player.y + player.h > cRY && player.vY > 0) {
        player.y = cRY - player.h; player.vY = 0; player.onGround = true;
    } else player.onGround = false;

    // Collision Objets (Zone de détection agrandie)
    levelItems.forEach(item => {
        if (!item.collected) {
            let itemX = item.x - posX;
            let railY = getRailY(item.x) || canvas.height * 0.7;
            let itemY = railY + item.yOffset;
            
            if (Math.abs(itemX - player.x) < 50 && Math.abs(itemY - player.y) < 80) {
                item.collected = true;
                if (item.type === 'coin') coins++; else stars++;
                sounds.collect.currentTime = 0;
                sounds.collect.play().catch(() => {});
                updateHUD();
            }
        }
    });

    // Gestion de la chute et perte de vie
    if (player.y > canvas.height) {
        lives--;
        updateHUD();
        if (lives <= 0) {
            triggerGameOver();
        } else {
            // Reset position après chute
            player.y = 0; 
            player.vY = 0; 
            posX -= 500; // Recule plus pour aider le joueur
            gameState = "WAITING"; // Petite pause pour respirer
        }
    }

    if (posX + player.x > levels[currentLevel].finish) triggerWin();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const lvl = levels[currentLevel];

    // PIEDS
    ctx.strokeStyle = "#D3D3D3"; ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width + 100; i += 40) {
        let y = getRailY(posX + i);
        if (y) { ctx.beginPath(); ctx.moveTo(i, y); ctx.lineTo(i, canvas.height); ctx.stroke(); }
    }

    // RAIL
    ctx.strokeStyle = lvl.color; ctx.lineWidth = 6; ctx.beginPath();
    let drawing = false;
    for (let i = -100; i < canvas.width + 100; i += 2) {
        let y = getRailY(posX + i);
        if (y) {
            if (!drawing) { ctx.moveTo(i, y); drawing = true; }
            else ctx.lineTo(i, y);
        } else if (drawing) { ctx.stroke(); drawing = false; ctx.beginPath(); }
    }
    ctx.stroke();

    // OBJETS (Plus hauts)
    levelItems.forEach(item => {
        if (!item.collected) {
            let itemX = item.x - posX;
            let railY = getRailY(item.x) || canvas.height * 0.7;
            let itemY = railY + item.yOffset;
            if (itemX > -50 && itemX < canvas.width + 50) {
                let img = item.type === 'coin' ? assets.coin : assets.star;
                ctx.drawImage(img, itemX, itemY, 40, 40);
            }
        }
    });

    // DRAPEAUX
    let yS = getRailY(100); if (yS && (100-posX) > -100) ctx.drawImage(assets.flagStart, 100-posX, yS-90, 60, 90);
    let yE = getRailY(lvl.finish); if (yE && (lvl.finish-posX) < canvas.width+100) ctx.drawImage(assets.flagEnd, lvl.finish-posX, yE-90, 70, 90);

    // LICORNE + WAGON
    if (assets.wagon.complete) ctx.drawImage(assets.wagon, player.x - 10, player.y + 35, player.w + 20, player.h * 0.7);
    let uImg = (gameState === "GAMEOVER") ? assets.licorneDcd : assets.licorne;
    if (uImg.complete) ctx.drawImage(uImg, player.x, player.y, player.w, player.h);

    if (gameState === "WAITING") {
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle = "white"; ctx.font = "bold 32px Arial"; ctx.textAlign = "center";
        ctx.fillText(`NIVEAU ${currentLevel} : ${lvl.name}`, canvas.width/2, canvas.height/2 - 40);
        ctx.fillText("APPUYEZ SUR ESPACE", canvas.width/2, canvas.height/2 + 20);
    }

    update();
    requestAnimationFrame(draw);
}

function triggerWin() {
    gameState = "WIN";
    const overlay = document.getElementById('end-screen');
    const content = document.getElementById('modal-content');
    if (currentLevel < 3) {
        content.innerHTML = `<h1 style="color: #2ed573;">NIVEAU RÉUSSI !</h1><button onclick="nextLevel()" style="background:#2ed573; color:white; padding:15px 30px; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">VERS LE NIVEAU ${currentLevel + 1}</button>`;
    } else {
        content.innerHTML = `<h1 style="color: #FFD700; font-size: 50px;">BRAVO TU AS GAGNÉ !</h1><button onclick="location.reload()" style="background:#ff4757; color:white; padding:15px 30px; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">RETOUR AU DÉBUT</button>`;
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }
    overlay.style.display = 'flex';
}

function nextLevel() {
    currentLevel++; posX = -200; player.y = 0; player.vY = 0;
    gameState = "WAITING";
    document.getElementById('end-screen').style.display = 'none';
    sounds.music.playbackRate += 0.2; // Accélère la musique
    updateHUD();
}

function triggerGameOver() {
    gameState = "GAMEOVER";
    sounds.music.pause();
    const overlay = document.getElementById('end-screen');
    const content = document.getElementById('modal-content');
    overlay.style.background = "rgba(0,0,0,0.85)";
    content.innerHTML = `<h1 style="color: white; font-size: 45px;">GAME OVER</h1><div style="display: flex; gap: 20px; justify-content: center;"><button onclick="location.reload()" style="background:#2ed573; color:white; padding:15px 30px; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">REJOUER</button><button onclick="location.href='index.html'" style="background:#ff4757; color:white; padding:15px 30px; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">RETOUR</button></div>`;
    overlay.style.display = 'flex';
}

function updateHUD() {
    document.getElementById('level-display').innerText = currentLevel;
    document.getElementById('val-coins').innerText = coins;
    document.getElementById('val-stars').innerText = stars;
    const container = document.getElementById('lives-container');
    if(container) {
        container.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            let img = document.createElement('img');
            img.src = i < lives ? assets.hFull : assets.hEmpty;
            img.style.width = "22px"; container.appendChild(img);
        }
    }
}

assets.licorne.onload = () => { updateHUD(); draw(); };