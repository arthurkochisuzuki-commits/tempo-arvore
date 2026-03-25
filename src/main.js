import './style.css'

document.querySelector('#app').innerHTML = `
  <h1>Eco-Guardião: O Ciclo das Máscaras</h1>
  <div style="position: relative;">
    <canvas id="gameCanvas" width="600" height="800"></canvas>
    <div id="ui-layer">
      <div id="top-bar">
        <div id="score-display">Eco-Pontos: 0</div>
        <div id="lives-display">Pureza: 🌿🌿🌿🌿🌿</div>
      </div>
      <div id="menus">
        <h2 id="menu-title">Defenda a Natureza!</h2>
        <p id="menu-desc" style="margin-top: 10px;">Use as Máscaras Sagradas para se esquivar da poluição.</p>
        <div id="difficulty-selection">
          <p style="margin-bottom: 5px; font-weight: bold;">Nível de Emergência:</p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="mode-btn" data-mode="easy">Bacia Hidrográfica</button>
            <button class="mode-btn" data-mode="normal">Floresta Tropical</button>
            <button class="mode-btn" data-mode="hard">Apocalipse Tóxico</button>
            <button class="mode-btn" data-mode="boss" style="background-color: #aa00ff;">Enfrentar a Corrupção</button>
          </div>
        </div>
      </div>
    </div>
  </div>
`

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menus = document.getElementById('menus');
const menuTitle = document.getElementById('menu-title');
const menuDesc = document.getElementById('menu-desc');
const scoreDisplay = document.getElementById('score-display');
const livesDisplay = document.getElementById('lives-display');

// Game state variables
let isPlaying = false;
let score = 0;
let lives = 5;
let animationFrameId;
let playerInvulnerable = 0;
let currentDifficulty = 'normal';

const difficultySettings = {
  easy: { spawnRate: 80, baseSpeed: 3, bossScore: 1500, lives: 5 },
  normal: { spawnRate: 60, baseSpeed: 4, bossScore: 2500, lives: 5 },
  hard: { spawnRate: 40, baseSpeed: 5, bossScore: 3500, lives: 1 },
  boss: { spawnRate: 60, baseSpeed: 4, bossScore: 0, lives: 5 }
};

let bossActive = false;
let boss = {
  x: 300,
  y: -150,
  targetY: 150,
  size: 100,
  state: 'inactive',
  timer: 0,
  cooldown: 100, // Ajustado para ser mais rápido que o "muito fácil" atual
  beamX: 0,
  beamWidth: 80,
  beamType: 'normal',
  beamSide: 'left',
  color: '#ff0000',
  attacksCount: 0,
  damageDealtToBoss: 0,
  cracks: 0
};

let diagonalBeams = [];

function updateLivesDisplay() {
  let icons = "";
  const icon = lives >= 4 ? "🌿" : (lives >= 2 ? "🍂" : "☠️");
  for (let i = 0; i < lives; i++) icons += icon;
  livesDisplay.innerText = "Pureza: " + icons;
}

// Player (Stickman)
const player = {
  x: canvas.width / 2,
  y: canvas.height - 100, // slightly above bottom
  width: 30, // approximate width for collision
  height: 80, // approximate height for collision
  speed: 8.5, // Reduzido levemente para exigir mais reflexo
  vx: 0
};

// Controls
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  a: false,
  d: false
};

window.addEventListener('keydown', e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener('keyup', e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Objects (Meteors/Rocks)
let obstacles = [];
let spawnRate = 60; // frames
let frameCount = 0;
let baseSpeed = 4;

function drawBackground(currentLives) {
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (currentLives >= 4) {
    // Primavera Luxuriante
    gradient.addColorStop(0, '#2d5a27'); 
    gradient.addColorStop(1, '#a8e063'); 
  } else if (currentLives >= 2) {
    // Outono Seco
    gradient.addColorStop(0, '#8e44ad'); 
    gradient.addColorStop(1, '#f39c12'); 
  } else {
    // Apocalipse Tóxico
    gradient.addColorStop(0, '#2c3e50'); 
    gradient.addColorStop(1, '#000000'); 
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Detalhes sutil de textura/partículas no fundo
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#fff';
  for(let i=0; i<20; i++) {
    ctx.beginPath();
    ctx.arc((i * 37) % canvas.width, (i * 59 + frameCount) % canvas.height, 2, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawStickman(x, y, currentLives) {
  if (playerInvulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

  const color = currentLives >= 4 ? '#2ecc71' : (currentLives >= 2 ? '#d35400' : '#ecf0f1');
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (currentLives >= 4) {
    // Guardião da Floresta - Máscara de Folha Verde
    ctx.strokeStyle = '#1b5e20';
    // Corpo
    ctx.beginPath();
    ctx.moveTo(x, y - 40); ctx.lineTo(x, y + 5); 
    ctx.stroke();
    // Braços
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 25); ctx.lineTo(x + 20, y - 25);
    ctx.stroke();
    // Pernas
    ctx.beginPath();
    ctx.moveTo(x, y + 5); ctx.lineTo(x - 15, y + 35);
    ctx.moveTo(x, y + 5); ctx.lineTo(x + 15, y + 35);
    ctx.stroke();
    
    // Máscara de Folha
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.ellipse(x, y - 55, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#145a32';
    ctx.stroke();
    // Detalhes da folha
    ctx.beginPath();
    ctx.moveTo(x, y - 77); ctx.lineTo(x, y - 33);
    ctx.stroke();
    // Olhos brilhantes na máscara
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 6, y - 60, 3, 0, Math.PI*2);
    ctx.arc(x + 6, y - 60, 3, 0, Math.PI*2);
    ctx.fill();
  } 
  else if (currentLives >= 2) {
    // Guardião do Barro - Máscara de Madeira/Tribal
    ctx.strokeStyle = '#5d4037';
    // Corpo
    ctx.beginPath();
    ctx.moveTo(x, y - 40); ctx.lineTo(x, y + 5); 
    ctx.stroke();
    // Braços
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 15); ctx.lineTo(x + 18, y - 15);
    ctx.stroke();
    // Pernas
    ctx.beginPath();
    ctx.moveTo(x, y + 5); ctx.lineTo(x - 12, y + 35);
    ctx.moveTo(x, y + 5); ctx.lineTo(x + 12, y + 35);
    ctx.stroke();
    
    // Máscara de Madeira
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(x - 15, y - 75, 30, 35);
    ctx.strokeStyle = '#3e2723';
    ctx.strokeRect(x - 15, y - 75, 30, 35);
    // Pintura tribal
    ctx.strokeStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 60); ctx.lineTo(x + 15, y - 60);
    ctx.stroke();
    // Olhos
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(x - 8, y - 70, 4, 4);
    ctx.fillRect(x + 4, y - 70, 4, 4);
  } 
  else {
    // Guardião Desolado - Máscara de Caveira/Pedra Branca
    ctx.strokeStyle = '#7f8c8d';
    // Corpo curvado
    ctx.beginPath();
    ctx.moveTo(x, y - 35);
    ctx.quadraticCurveTo(x - 5, y - 15, x, y + 10);
    ctx.stroke();
    // Braços caídos
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 5); ctx.lineTo(x, y - 25); ctx.lineTo(x + 15, y - 5);
    ctx.stroke();
    // Pernas
    ctx.beginPath();
    ctx.moveTo(x, y + 10); ctx.lineTo(x - 10, y + 40);
    ctx.moveTo(x, y + 10); ctx.lineTo(x + 10, y + 40);
    ctx.stroke();

    // Máscara de Caveira
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.arc(x, y - 55, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.stroke();
    // Olhos sombrios
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 6, y - 58, 4, 0, Math.PI*2);
    ctx.arc(x + 6, y - 58, 4, 0, Math.PI*2);
    ctx.fill();
    // Boca costurada
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 48); ctx.lineTo(x + 8, y - 48);
    ctx.stroke();
  }
}

function spawnObstacle() {
  const isHeal = Math.random() < 0.05; // 5% de chance de cura
  const size = isHeal ? 15 : Math.random() * 20 + 20;
  obstacles.push({
    x: Math.random() * (canvas.width - size * 2) + size,
    y: -size,
    size: size,
    speedY: baseSpeed + (isHeal ? 2 : Math.random() * 2),
    type: isHeal ? 'heal' : 'meteor',
    color: isHeal ? '#00ff88' : `hsl(${Math.random() * 60 + 10}, 80%, 60%)`
  });
}

function update() {
  if (!isPlaying) return;

  if (playerInvulnerable > 0) playerInvulnerable--;

  // Move player
  if (keys.ArrowLeft || keys.a) player.vx = -player.speed;
  else if (keys.ArrowRight || keys.d) player.vx = player.speed;
  else player.vx = 0;

  player.x += player.vx;

  // Prevent going off screen
  if (player.x - 20 < 0) player.x = 20;
  if (player.x + 20 > canvas.width) player.x = canvas.width - 20;

  // Boss spawn condition
  const bossThreshold = difficultySettings[currentDifficulty].bossScore;
  if (score >= bossThreshold && !bossActive && boss.state === 'inactive') {
    bossActive = true;
    boss.state = 'entering';
    boss.y = -boss.size * 2;
    boss.x = canvas.width / 2;
    obstacles = []; // Limpar pequenos meteoros para a luta principal
  }

  frameCount++;

  if (bossActive) {
    if (boss.state === 'entering') {
      boss.y += 2;
      if (boss.y >= boss.targetY) {
        boss.y = boss.targetY;
        boss.state = 'idle';
        boss.timer = boss.cooldown; // Usa a variável dinâmica para o delay
      }
    } else if (boss.state === 'idle') {
      // Movimento suave seguindo o jogador antes de atacar
      boss.x += (player.x - boss.x) * 0.05;
      boss.timer--;
      if (boss.timer <= 0) {
        boss.state = 'warning';
        
        // Decide tipo de ataque aleatoriamente (depois de aquecer com uns 2 ataques)
        const rand = Math.random();
        if (boss.attacksCount >= 4 && rand < 0.25) {
            boss.beamType = 'sweep';
            boss.sweepDirection = Math.random() < 0.5 ? 1 : -1;
            boss.sweepStage = 0;
            boss.sweepWidth = canvas.width / 5;
            boss.timer = 50; 
        } else if (boss.attacksCount >= 1 && rand < 0.4) {
            boss.beamType = 'wall';
            boss.safeZoneX = Math.random() * (canvas.width - 120) + 60;
            boss.wallStage = 1;
            boss.timer = 85; 
        } else if (boss.attacksCount >= 2 && rand < 0.6) {
            boss.beamType = 'half';
            boss.beamSide = Math.random() < 0.5 ? 'left' : 'right';
            boss.timer = 75; 
        } else {
            boss.beamType = 'normal';
            boss.beamX = boss.x;
            boss.timer = 55; 
        }
      }
    } else if (boss.state === 'warning') {
      boss.timer--;
      if (boss.timer <= 0) {
        boss.state = 'attacking';
        boss.timer = 40; // duração do ataque levemente aumentada para dar peso
      }
    } else if (boss.state === 'attacking') {
      boss.timer--;
      // Hit detection
      let hit = false;
      if (boss.beamType === 'normal') {
          const pLeft = player.x - 15;
          const pRight = player.x + 15;
          const bLeft = boss.beamX - boss.beamWidth / 2;
          const bRight = boss.beamX + boss.beamWidth / 2;
          hit = (pRight > bLeft && pLeft < bRight);
      } else if (boss.beamType === 'half') {
          const pCenter = player.x;
          if (boss.beamSide === 'left' && pCenter <= canvas.width / 2) hit = true;
          if (boss.beamSide === 'right' && pCenter > canvas.width / 2) hit = true;
      } else if (boss.beamType === 'wall') {
          // Player foge se estiver dentro da safeZone
          const pLeft = player.x - 12;
          const pRight = player.x + 12;
          const sLeft = boss.safeZoneX - 40;
          const sRight = boss.safeZoneX + 40;
          if (!(pLeft > sLeft && pRight < sRight)) {
              hit = true;
          }
      } else if (boss.beamType === 'sweep') {
          const sweepX = boss.sweepDirection === 1 
              ? (boss.sweepStage + 0.5) * boss.sweepWidth 
              : (4 - boss.sweepStage + 0.5) * boss.sweepWidth;
          const pLeft = player.x - 15;
          const pRight = player.x + 15;
          const bLeft = sweepX - boss.sweepWidth / 2;
          const bRight = sweepX + boss.sweepWidth / 2;
          hit = (pRight > bLeft && pLeft < bRight);
      }
      
      if (hit) {
        if (playerInvulnerable <= 0) {
           lives--;
           updateLivesDisplay();
           if (lives <= 0) { gameOver(); return; }
           else { playerInvulnerable = 60; }
        }
      }

      if (boss.timer <= 0) {
        // Se for o primeiro estágio do muro, vai pro segundo sem delay
        if (boss.beamType === 'wall' && boss.wallStage === 1) {
            boss.state = 'warning';
            boss.wallStage = 2;
            let newSafeX;
            do {
              newSafeX = Math.random() * (canvas.width - 120) + 60;
            } while (Math.abs(newSafeX - boss.safeZoneX) < 150); // Garante que o espaço mude bem de lugar
            boss.safeZoneX = newSafeX;
            boss.timer = 65; // Tempo mais apertado para o segundo muro
            return;
        }

        // Se for ataque de varredura, avança para o próximo estágio
        if (boss.beamType === 'sweep' && boss.sweepStage < 4) {
            boss.state = 'warning';
            boss.sweepStage++;
            boss.timer = 25; // Transição rápida entre varreuras
            return;
        }

        boss.state = 'idle';
        
        boss.damageDealtToBoss += 250; // 4 desvios = 1000 dano = 1 rachadura
        let prevCracks = boss.cracks;
        boss.cracks = Math.floor(boss.damageDealtToBoss / 750); // 3 desvios = 1 rachadura
        
        // Aumenta a velocidade
        if (boss.cracks > prevCracks) {
            boss.cooldown = Math.max(30, boss.cooldown - 10); // acelera mais na rachadura
        } else {
            boss.cooldown = Math.max(30, boss.cooldown - 4); 
        }

        if (boss.cracks >= 8) { // Aumentado para 8 rachaduras para uma luta mais longa
            // Boss Derrotado - Vitória!
            bossActive = false;
            boss.state = 'inactive';
            score += 10000;
            scoreDisplay.innerText = "Eco-Pontos: " + score;
            boss.attacksCount = 0;
            boss.damageDealtToBoss = 0;
            boss.cracks = 0;
            diagonalBeams = [];
            victory();
            return;
        } else {
            boss.timer = boss.cooldown; // Define delay com base no novo cooldown progressivo
            boss.attacksCount++;
            score += 50; 
            scoreDisplay.innerText = "Eco-Pontos: " + score;
        }
      }
    }
    
    // Lasers diagonais (aparecem depois que ele ataca pelo menos 3 vezes)
    if (boss.attacksCount >= 3 && boss.state === 'idle') {
      if (Math.random() < 0.01) { // chance reduzida de instanciar laser diagonal
         diagonalBeams.push({
           direction: Math.random() < 0.5 ? 1 : -1, // 1 = cima-esq -> baixo-dir, -1 = cima-dir -> baixo-esq
           width: 50,
           timer: 65, // Aviso mais rápido para o laser lateral
           state: 'warning'
         });
      }
    }

    // Update Lasers Diagonais
    for (let i = diagonalBeams.length - 1; i >= 0; i--) {
       let db = diagonalBeams[i];
       db.timer--;
       if (db.state === 'warning') {
         if (db.timer <= 0) {
           db.state = 'attacking';
           db.timer = 20; // Duração do ataque diagonal
         }
       } else if (db.state === 'attacking') {
         // Hit detection: Distância de um ponto a uma reta
         // Reta passa pelo centro do canvas. slope m = canvas.height/canvas.width.
         const m = canvas.height / canvas.width;
         let dist = 0;
         if (db.direction === 1) {
            // Reta: y = m * x => m*x - y = 0
            dist = Math.abs(m * player.x - player.y) / Math.sqrt(m*m + 1);
         } else {
            // Reta: y = -m * (x - canvas.width) => m*x + y - m*canvas.width = 0 
            dist = Math.abs(m * player.x + player.y - m * canvas.width) / Math.sqrt(m*m + 1);
         }
         
         const pRad = 20; // bounding box aprox. do jogador raio
         const bRad = db.width / 2;
         
         // Se a colisão ocorrer
         if (dist < pRad + bRad) {
            if (playerInvulnerable <= 0) {
               lives--;
               updateLivesDisplay();
               if (lives <= 0) { gameOver(); return; }
               else { playerInvulnerable = 60; }
            }
         }

         if (db.timer <= 0) {
           diagonalBeams.splice(i, 1);
         }
       }
    }

  } else {
    // Update obstacles
    if (frameCount >= spawnRate) {
      spawnObstacle();
      frameCount = 0;

      // Increase difficulty gradually
      if (spawnRate > 20) spawnRate -= 0.5;
      baseSpeed += 0.05;
    }
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.y += obs.speedY;

    // Check collision with bounding box
    // Player's approximate BB based on stickman
    const pLeft = player.x - 20;
    const pRight = player.x + 20;
    const pTop = player.y - 75; // head top
    const pBottom = player.y + 30; // feet

    const oLeft = obs.x - obs.size / 2;
    const oRight = obs.x + obs.size / 2;
    const oTop = obs.y - obs.size / 2;
    const oBottom = obs.y + obs.size / 2;

    if (pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom) {
      // Collision detected
      if (obs.type === 'heal') {
        if (lives < 3) lives++;
        updateLivesDisplay();
        obstacles.splice(i, 1);
        continue;
      } else {
        if (playerInvulnerable <= 0) {
          lives--;
          updateLivesDisplay();
          obstacles.splice(i, 1);
          if (lives <= 0) {
            gameOver();
          } else {
            playerInvulnerable = 60;
          }
        }
        continue;
      }
    }

    // Remove if off screen and add score
    if (obs.y - obs.size > canvas.height) {
      obstacles.splice(i, 1);
      if (obs.type !== 'heal') {
        score += 10;
        scoreDisplay.innerText = "Eco-Pontos: " + score;
      }
    }
  }
}

function drawClock(obs) {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    
    if (obs.type === 'heal') {
        // Semente de Vida
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.moveTo(0, -obs.size);
        ctx.quadraticCurveTo(obs.size, 0, 0, obs.size);
        ctx.quadraticCurveTo(-obs.size, 0, 0, -obs.size);
        ctx.fill();
        // Brilho
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, -obs.size/2, 3, 0, Math.PI*2);
        ctx.fill();
    } 
    else if (obs.type === 'meteor') {
        // Barril de Lixo Tóxico ou Nuvem de Poluição
        const isTrash = (obs.x % 2 === 0);
        if (isTrash) {
            ctx.fillStyle = '#34495e';
            ctx.fillRect(-obs.size/2, -obs.size/2, obs.size, obs.size);
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(-obs.size/2, -obs.size/2, obs.size, obs.size/4);
            // Símbolo tóxico
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
            ctx.moveTo(5, -5); ctx.lineTo(-5, 5);
            ctx.stroke();
        } else {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
            for(let i=0; i<3; i++) {
                ctx.beginPath();
                ctx.arc((i-1)*10, Math.sin(frameCount*0.1 + i)*5, obs.size/2 + 5, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
    else if (obs.type === 'boss') {
      // Espírito da Corrupção (Evo do Poluente)
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(0, 0, obs.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Olhos de Fogo Roxo
      ctx.fillStyle = '#8e44ad';
      ctx.beginPath();
      ctx.ellipse(-obs.size * 0.4, -obs.size * 0.2, obs.size * 0.2, obs.size * 0.1, 0.5, 0, Math.PI*2);
      ctx.ellipse(obs.size * 0.4, -obs.size * 0.2, obs.size * 0.2, obs.size * 0.1, -0.5, 0, Math.PI*2);
      ctx.fill();
      
      // Aura de fumaça ao redor do boss
      ctx.globalAlpha = 0.3;
      for(let i=0; i<8; i++) {
          const angle = (frameCount * 0.05) + (i * Math.PI / 4);
          ctx.beginPath();
          ctx.arc(Math.cos(angle)*obs.size, Math.sin(angle)*obs.size, obs.size/3, 0, Math.PI*2);
          ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      if (obs.cracks > 0) {
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Rachaduras de luz roxa
        for(let i=0; i<obs.cracks; i++) {
            const startAngle = i * 0.7;
            ctx.moveTo(Math.cos(startAngle)*obs.size, Math.sin(startAngle)*obs.size);
            ctx.lineTo(Math.cos(startAngle)*obs.size*0.5, Math.sin(startAngle+0.2)*obs.size*0.3);
            ctx.lineTo(0,0);
        }
        ctx.stroke();
      }
    }
    
    ctx.restore();
}

function draw() {
  // Draw changing background
  drawBackground(lives);

  if (bossActive) {
    // Draw warnings or beams
    if (boss.state === 'warning') {
      if (boss.beamType === 'normal') {
        ctx.fillStyle = 'rgba(142, 68, 173, 0.2)';
        ctx.fillRect(boss.beamX - boss.beamWidth / 2, boss.y, boss.beamWidth, canvas.height);
        ctx.fillStyle = '#8e44ad';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        if (Math.floor(Date.now() / 150) % 2 === 0) {
          ctx.fillText('! VAPOR TÓXICO !', boss.beamX, boss.y + boss.size + 40);
        }
      } else if (boss.beamType === 'half') {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
        const rX = boss.beamSide === 'left' ? 0 : canvas.width / 2;
        ctx.fillRect(rX, boss.y, canvas.width / 2, canvas.height);
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 28px Inter';
        ctx.textAlign = 'center';
        if (Math.floor(Date.now() / 150) % 2 === 0) {
          ctx.fillText('! RADIAÇÃO !', rX + canvas.width / 4, boss.y + boss.size + 80);
        }
      } else if (boss.beamType === 'wall') {
        ctx.fillStyle = 'rgba(192, 57, 43, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(127, 140, 141, 0.3)';
        ctx.fillRect(0, 0, boss.safeZoneX - 50, canvas.height);
        ctx.fillRect(boss.safeZoneX + 50, 0, canvas.width - (boss.safeZoneX + 50), canvas.height);
        ctx.fillStyle = '#c0392b';
        ctx.font = 'bold 30px Inter';
        ctx.textAlign = 'center';
        if (Math.floor(Date.now() / 150) % 2 === 0) {
           ctx.fillText('! AR PURO AQUI !', boss.safeZoneX, canvas.height / 2);
        }
      } else if (boss.beamType === 'sweep') {
        const sweepX = boss.sweepDirection === 1 
            ? (boss.sweepStage + 0.5) * boss.sweepWidth 
            : (4 - boss.sweepStage + 0.5) * boss.sweepWidth;
        ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
        ctx.fillRect(sweepX - boss.sweepWidth / 2, 0, boss.sweepWidth, canvas.height);
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        if (Math.floor(Date.now() / 150) % 2 === 0) {
           ctx.fillText('! VARREDURA DE LIXO !', sweepX, canvas.height / 2);
        }
      }
    }

    if (boss.state === 'attacking') {
      if (boss.beamType === 'normal') {
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(boss.beamX - boss.beamWidth / 2, boss.y, boss.beamWidth, canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(boss.beamX - boss.beamWidth / 2 + 10, boss.y, boss.beamWidth - 20, canvas.height);
      } else if (boss.beamType === 'half') {
        const rX = boss.beamSide === 'left' ? 0 : canvas.width / 2;
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(rX, boss.y, canvas.width / 2, canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(rX + 10, boss.y, canvas.width / 2 - 20, canvas.height);
      } else if (boss.beamType === 'wall') {
        ctx.fillStyle = '#34495e';
        for(let i=0; i < canvas.width; i += 20) {
          if (i < boss.safeZoneX - 60 || i > boss.safeZoneX + 40) {
            ctx.fillRect(i, 0, 15, canvas.height);
          }
        }
      } else if (boss.beamType === 'sweep') {
        const sweepX = boss.sweepDirection === 1 
            ? (boss.sweepStage + 0.5) * boss.sweepWidth 
            : (4 - boss.sweepStage + 0.5) * boss.sweepWidth;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(sweepX - boss.sweepWidth / 2, 0, boss.sweepWidth, canvas.height);
      }
    }

    for (let db of diagonalBeams) {
      ctx.save();
      if (db.state === 'warning') {
        ctx.strokeStyle = 'rgba(142, 68, 173, 0.2)';
        ctx.lineWidth = db.width;
      } else if (db.state === 'attacking') {
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = db.width;
      }

      ctx.beginPath();
      if (db.direction === 1) { 
         ctx.moveTo(0, 0); ctx.lineTo(canvas.width, canvas.height);
      } else {
         ctx.moveTo(canvas.width, 0); ctx.lineTo(0, canvas.height);
      }
      ctx.stroke();

      if (db.state === 'warning' && Math.floor(Date.now() / 150) % 2 === 0) {
        ctx.fillStyle = '#8e44ad';
        ctx.font = 'bold 20px Inter';
        ctx.textAlign = 'center';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(db.direction === 1 ? Math.PI/4 : -Math.PI/4);
        ctx.fillText('! CHUVA ÁCIDA !', 0, 7);
      }
      ctx.restore();
    }
    
    // Draw boss
    drawClock({...boss, type: 'boss'});
  }

  // Desenha o Guardião com sua Máscara atual
  drawStickman(player.x, player.y, lives);

  // Desenha os poluentes e sementes caindo
  obstacles.forEach(obs => {
    drawClock(obs);
  });
}

function loop() {
  update();
  draw();
  if (isPlaying) {
    animationFrameId = requestAnimationFrame(loop);
  }
}

function startGame(mode) {
  currentDifficulty = mode || 'normal';
  const settings = difficultySettings[currentDifficulty];
  
  score = 0;
  lives = settings.lives;
  player.x = canvas.width / 2;
  obstacles = [];
  spawnRate = settings.spawnRate;
  baseSpeed = settings.baseSpeed;
  frameCount = 0;
  isPlaying = true;
  bossActive = false;
  boss.state = 'inactive';
  boss.cooldown = 100; // Reseta para o novo valor padrão
  boss.attacksCount = 0;
  boss.damageDealtToBoss = 0;
  boss.cracks = 0;
  diagonalBeams = [];
  playerInvulnerable = 0;
  scoreDisplay.innerText = "Eco-Pontos: " + score;
  updateLivesDisplay();

  // If "Direct to Boss" mode, we trigger boss immediately
  if (currentDifficulty === 'boss') {
    bossActive = true;
    boss.state = 'entering';
    boss.y = -boss.size * 2;
    boss.x = canvas.width / 2;
  }

  menus.classList.add('hidden');

  // Reset input state properly
  keys.ArrowLeft = false;
  keys.ArrowRight = false;
  keys.a = false;
  keys.d = false;

  loop();
}

function gameOver() {
  isPlaying = false;
  menus.classList.remove('hidden');
  menuTitle.innerText = "NATUREZA DEVASTADA!";
  menuTitle.style.color = '#7f8c8d';
  menuDesc.innerText = "A poluição venceu... Seu legado ecológico foi de: " + score + " pontos.";
  document.querySelector('#difficulty-selection p').innerText = "Tentar novamente o reflorestamento?";
  cancelAnimationFrame(animationFrameId);
}

function victory() {
  isPlaying = false;
  menus.classList.remove('hidden');
  menuTitle.innerText = "NATUREZA SALVA!";
  menuTitle.style.color = '#2ecc71';
  menuDesc.innerHTML = `
    <div style="margin-bottom: 15px;">
      <p>O Espírito da Corrupção foi PURIFICADO!</p>
      <p style="font-size: 1.2em; font-weight: bold; margin-top: 10px;">Eco-Pontos: ${score}</p>
    </div>
    <div style="background: rgba(46, 204, 113, 0.2); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <p>O equilíbrio foi restaurado. As máscaras podem descansar.</p>
    </div>
  `;
  document.querySelector('#difficulty-selection p').innerText = "Jogar novamente?";
  cancelAnimationFrame(animationFrameId);
}

// Wired up mode buttons
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.getAttribute('data-mode');
    startGame(mode);
  });
});

// Draw static initial state
drawBackground(lives);
drawStickman(player.x, player.y, lives);
