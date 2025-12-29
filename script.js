// ============ 配置 ============
const CONFIG = {
    particleCount: 2000,
    colors: ['#ffd700', '#ffec8b', '#ffa500', '#ff6347', '#ffffff', '#87ceeb'],
};

// ============ 全局变量 ============
let canvas, ctx;
let particles = [];
let handPosition = null;
let currentShape = 'float';
let hasShown2025 = false;
let hasShown2026 = false;
let isWechat = /MicroMessenger/i.test(navigator.userAgent);
let animationId;

// ============ 粒子类 ============
class Particle {
    constructor() {
        this.reset();
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
    }
    
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = -10;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = Math.random() * 1 + 0.5;
        this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        this.alpha = Math.random() * 0.5 + 0.5;
        this.targetX = null;
        this.targetY = null;
        this.glowSize = this.size * 3;
    }
    
    update() {
        if (currentShape === 'explode') {
            this.x += (Math.random() - 0.5) * 20;
            this.y += (Math.random() - 0.5) * 20;
            this.alpha -= 0.02;
            if (this.alpha <= 0) this.reset();
        } else if (this.targetX !== null) {
            this.x += (this.targetX - this.x) * 0.08;
            this.y += (this.targetY - this.y) * 0.08;
        } else {
            this.x += this.speedX;
            this.y += this.speedY;
            
            // 手势吸引
            if (handPosition) {
                const dx = handPosition.x - this.x;
                const dy = handPosition.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    const force = (200 - dist) / 200 * 0.15;
                    this.x += dx * force;
                    this.y += dy * force;
                }
            }
            
            // 边界
            if (this.y > canvas.height + 10) this.reset();
            if (this.x < -10) this.x = canvas.width + 10;
            if (this.x > canvas.width + 10) this.x = -10;
        }
    }
    
    draw() {
        // 发光效果
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowSize);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.4, this.color + '80');
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fill();
        
        // 核心
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
}

// ============ 烟花类 ============
class Firework {
    constructor(x, y) {
        this.particles = [];
        for (let i = 0; i < 60; i++) {
            const angle = (Math.PI * 2 / 60) * i;
            const speed = Math.random() * 4 + 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
                size: Math.random() * 3 + 2
            });
        }
    }
    
    update() {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.alpha -= 0.015;
        });
        this.particles = this.particles.filter(p => p.alpha > 0);
    }
    
    draw() {
        this.particles.forEach(p => {
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            gradient.addColorStop(0, p.color);
            gradient.addColorStop(1, 'transparent');
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }
    
    isDead() {
        return this.particles.length === 0;
    }
}

let fireworks = [];

// ============ 数字形状 ============
function getNumberPoints(numStr) {
    const points = [];
    const patterns = {
        '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
        '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
        '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
        '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]]
    };
    
    const digitWidth = canvas.width * 0.18;
    const cellSize = digitWidth / 3;
    const totalWidth = numStr.length * digitWidth;
    const startX = (canvas.width - totalWidth) / 2;
    const startY = canvas.height * 0.35;
    
    for (let c = 0; c < numStr.length; c++) {
        const pattern = patterns[numStr[c]];
        if (!pattern) continue;
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 3; col++) {
                if (pattern[row][col]) {
                    for (let n = 0; n < 12; n++) {
                        points.push({
                            x: startX + c * digitWidth + col * cellSize + Math.random() * cellSize * 0.8,
                            y: startY + row * cellSize + Math.random() * cellSize * 0.8
                        });
                    }
                }
            }
        }
    }
    return points;
}

function setParticleTargets(shape) {
    const points = getNumberPoints(shape);
    particles.forEach((p, i) => {
        if (points.length > 0) {
            const target = points[i % points.length];
            p.targetX = target.x;
            p.targetY = target.y;
        }
    });
}

function clearParticleTargets() {
    particles.forEach(p => {
        p.targetX = null;
        p.targetY = null;
    });
}

// ============ 形状切换 ============
function triggerShapeChange() {
    if (!hasShown2025) {
        currentShape = '2025';
        setParticleTargets('2025');
        hasShown2025 = true;
    } else if (!hasShown2026) {
        currentShape = 'explode';
        clearParticleTargets();
        
        setTimeout(() => {
            // 重置粒子
            particles.forEach(p => {
                p.alpha = Math.random() * 0.5 + 0.5;
                p.x = Math.random() * canvas.width;
                p.y = Math.random() * canvas.height;
            });
            
            currentShape = '2026';
            setParticleTargets('2026');
            hasShown2026 = true;
            
            // 放烟花
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    fireworks.push(new Firework(
                        Math.random() * canvas.width,
                        Math.random() * canvas.height * 0.5
                    ));
                }, i * 300);
            }
            
            setTimeout(() => {
                document.getElementById('blessing').style.opacity = '1';
            }, 1500);
        }, 1000);
    }
}

// ============ 动画循环 ============
function animate() {
    // 半透明背景实现拖尾
    ctx.fillStyle = 'rgba(5, 5, 16, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    fireworks.forEach(fw => {
        fw.update();
        fw.draw();
    });
    fireworks = fireworks.filter(fw => !fw.isDead());
    
    animationId = requestAnimationFrame(animate);
}

// ============ 初始化 ============
function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    
    // 创建粒子
    for (let i = 0; i < CONFIG.particleCount; i++) {
        particles.push(new Particle());
    }
    
    // 微信检测
    if (isWechat) {
        document.getElementById('modeSelect').style.display = 'none';
        document.getElementById('wechatTip').style.display = 'flex';
        
        document.querySelector('#wechatTip .skip').addEventListener('click', () => {
            document.getElementById('wechatTip').style.display = 'none';
            enableTouchMode();
        });
    } else {
        setupModeButtons();
    }
    
    animate();
}

function setupModeButtons() {
    const modeSelect = document.getElementById('modeSelect');
    const video = document.getElementById('video');
    
    document.getElementById('gestureBtn').addEventListener('click', async () => {
        modeSelect.style.display = 'none';
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            video.srcObject = stream;
            video.style.display = 'block';
            await video.play();
            
            const hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });
            
            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 0,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.3
            });
            
            hands.onResults(onHandResults);
            
            const camera = new Camera(video, {
                onFrame: async () => await hands.send({ image: video }),
                width: 640,
                height: 480
            });
            camera.start();
            
            document.getElementById('hint').textContent = '👋 伸出手掌控制粒子 · 握拳切换形状';
            
        } catch (err) {
            console.error('摄像头失败:', err);
            enableTouchMode();
        }
    });
    
    document.getElementById('touchBtn').addEventListener('click', () => {
        modeSelect.style.display = 'none';
        enableTouchMode();
    });
}

let lastFistTime = 0;
function onHandResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        document.getElementById('hint').style.display = 'none';
        
        const landmarks = results.multiHandLandmarks[0];
        handPosition = {
            x: (1 - landmarks[9].x) * canvas.width,
            y: landmarks[9].y * canvas.height
        };
        
        // 检测握拳
        const palmBase = landmarks[0];
        const fingerTips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
        let closedFingers = 0;
        
        fingerTips.forEach(tip => {
            const dist = Math.hypot(tip.x - palmBase.x, tip.y - palmBase.y);
            if (dist < 0.15) closedFingers++;
        });
        
        const now = Date.now();
        if (closedFingers >= 3 && now - lastFistTime > 1000) {
            lastFistTime = now;
            triggerShapeChange();
        }
    } else {
        handPosition = null;
    }
}

function enableTouchMode() {
    document.getElementById('hint').innerHTML = '👆 滑动控制粒子 · 双击切换形状';
    document.getElementById('hint').style.display = 'block';
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handPosition = { x: touch.clientX, y: touch.clientY };
        document.getElementById('hint').style.display = 'none';
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => { handPosition = null; });
    
    let lastTap = 0;
    canvas.addEventListener('touchend', () => {
        const now = Date.now();
        if (now - lastTap < 300) triggerShapeChange();
        lastTap = now;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        handPosition = { x: e.clientX, y: e.clientY };
        document.getElementById('hint').style.display = 'none';
    });
    
    canvas.addEventListener('dblclick', triggerShapeChange);
}

// 启动
window.addEventListener('load', init);
