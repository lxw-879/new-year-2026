// ============ 配置 ============
const CONFIG = {
    particleCount: 2500,
    colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6', '#ffa500', '#ffffff'],
};

// ============ 全局变量 ============
let canvas, ctx;
let particles = [];
let handPosition = null;
let lastHandPosition = null;
let currentShape = 'float';
let hasShown2025 = false;
let hasShown2026 = false;
let isWechat = /MicroMessenger/i.test(navigator.userAgent);
let ripples = [];
let meteors = [];
let shockwaves = [];
let time = 0;
let isLongPress = false;
let longPressTimer = null;

// ============ 粒子类 ============
class Particle {
    constructor() {
        this.reset();
        this.x = Math.random() * (canvas?.width || window.innerWidth);
        this.y = Math.random() * (canvas?.height || window.innerHeight);
        this.baseSize = Math.random() * 4 + 1;
        this.size = this.baseSize;
        this.pulseSpeed = Math.random() * 0.05 + 0.02;
        this.pulseOffset = Math.random() * Math.PI * 2;
        this.hue = Math.random() * 360;
        this.useRainbow = Math.random() > 0.6;
    }
    
    reset() {
        this.x = Math.random() * (canvas?.width || window.innerWidth);
        this.y = -10 - Math.random() * 100;
        this.baseSize = Math.random() * 4 + 1;
        this.size = this.baseSize;
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.speedY = Math.random() * 1.5 + 0.5;
        this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        this.alpha = Math.random() * 0.6 + 0.4;
        this.targetX = null;
        this.targetY = null;
        this.vx = 0;
        this.vy = 0;
        this.trail = [];
        this.maxTrail = 5;
    }
    
    update() {
        // 呼吸效果
        this.size = this.baseSize * (1 + Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.3);
        
        // 彩虹色变化
        if (this.useRainbow) {
            this.hue = (this.hue + 0.5) % 360;
        }
        
        // 保存轨迹
        if (currentShape !== '2025' && currentShape !== '2026') {
            this.trail.push({ x: this.x, y: this.y, alpha: this.alpha });
            if (this.trail.length > this.maxTrail) this.trail.shift();
        }
        
        if (currentShape === 'explode') {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.alpha -= 0.01;
            if (this.alpha <= 0) {
                this.alpha = 0.8;
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
            }
        } else if (currentShape === 'gather') {
            // 聚合动画
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            this.x += (centerX - this.x) * 0.05;
            this.y += (centerY - this.y) * 0.05;
        } else if (this.targetX !== null) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            this.x += dx * 0.06;
            this.y += dy * 0.06;
        } else {
            this.x += this.speedX;
            this.y += this.speedY;
            
            // 长按漩涡效果
            if (isLongPress && handPosition) {
                const dx = handPosition.x - this.x;
                const dy = handPosition.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 300 && dist > 20) {
                    const angle = Math.atan2(dy, dx);
                    const force = (300 - dist) / 300 * 0.1;
                    // 螺旋吸入
                    this.x += Math.cos(angle + 1.5) * force * 5;
                    this.y += Math.sin(angle + 1.5) * force * 5;
                    this.x += dx * force * 0.3;
                    this.y += dy * force * 0.3;
                }
            }
            // 普通手势推开效果
            else if (handPosition) {
                const dx = this.x - handPosition.x;
                const dy = this.y - handPosition.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    const force = (150 - dist) / 150 * 3;
                    this.x += (dx / dist) * force;
                    this.y += (dy / dist) * force;
                }
            }
            
            // 边界
            if (this.y > canvas.height + 10) this.reset();
            if (this.x < -10) this.x = canvas.width + 10;
            if (this.x > canvas.width + 10) this.x = -10;
        }
    }
    
    draw() {
        // 绘制拖尾
        this.trail.forEach((t, i) => {
            const ratio = i / this.trail.length;
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.size * ratio * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = this.useRainbow 
                ? `hsla(${this.hue}, 100%, 70%, ${t.alpha * ratio * 0.3})`
                : this.color;
            ctx.globalAlpha = t.alpha * ratio * 0.3;
            ctx.fill();
        });
        
        // 发光效果
        const glowSize = this.size * 4;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
        const color = this.useRainbow ? `hsl(${this.hue}, 100%, 70%)` : this.color;
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.3, color + '60');
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = this.alpha * 0.6;
        ctx.fill();
        
        // 核心
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = this.alpha;
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
}

// ============ 波纹类 ============
class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 200;
        this.alpha = 0.8;
    }
    
    update() {
        this.radius += 8;
        this.alpha -= 0.02;
    }
    
    draw() {
        if (this.alpha <= 0) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${this.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    isDead() { return this.alpha <= 0; }
}

// ============ 冲击波类 ============
class Shockwave {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = Math.max(canvas.width, canvas.height);
        this.alpha = 1;
    }
    
    update() {
        this.radius += 25;
        this.alpha = 1 - this.radius / this.maxRadius;
    }
    
    draw() {
        if (this.alpha <= 0) return;
        const gradient = ctx.createRadialGradient(this.x, this.y, this.radius - 20, this.x, this.y, this.radius + 20);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, `rgba(255, 200, 100, ${this.alpha * 0.5})`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    isDead() { return this.radius > this.maxRadius; }
}

// ============ 流星类 ============
class Meteor {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * canvas.width * 1.5;
        this.y = -50;
        this.length = Math.random() * 80 + 40;
        this.speed = Math.random() * 15 + 10;
        this.alpha = Math.random() * 0.5 + 0.5;
    }
    
    update() {
        this.x -= this.speed * 0.7;
        this.y += this.speed;
        if (this.y > canvas.height + 50) this.reset();
    }
    
    draw() {
        const gradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x + this.length * 0.7, this.y - this.length
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.alpha})`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.length * 0.7, this.y - this.length);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ============ 烟花类 ============
class Firework {
    constructor(x, y, color) {
        this.particles = [];
        const baseColor = color || CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2 / 80) * i + Math.random() * 0.2;
            const speed = Math.random() * 6 + 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: baseColor,
                size: Math.random() * 3 + 2,
                gravity: 0.05
            });
        }
    }
    
    update() {
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.alpha -= 0.012;
        });
        this.particles = this.particles.filter(p => p.alpha > 0);
    }
    
    draw() {
        this.particles.forEach(p => {
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
            gradient.addColorStop(0, p.color);
            gradient.addColorStop(0.5, p.color + '80');
            gradient.addColorStop(1, 'transparent');
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }
    
    isDead() { return this.particles.length === 0; }
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
    
    const digitWidth = canvas.width * 0.16;
    const cellSize = digitWidth / 3;
    const totalWidth = numStr.length * digitWidth;
    const startX = (canvas.width - totalWidth) / 2;
    const startY = canvas.height * 0.32;
    
    for (let c = 0; c < numStr.length; c++) {
        const pattern = patterns[numStr[c]];
        if (!pattern) continue;
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 3; col++) {
                if (pattern[row][col]) {
                    for (let n = 0; n < 15; n++) {
                        points.push({
                            x: startX + c * digitWidth + col * cellSize + Math.random() * cellSize * 0.9,
                            y: startY + row * cellSize + Math.random() * cellSize * 0.9
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
            p.trail = [];
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
let countdownNum = 0;

function triggerShapeChange() {
    if (!hasShown2025) {
        // 波纹效果
        ripples.push(new Ripple(canvas.width / 2, canvas.height / 2));
        
        currentShape = '2025';
        setParticleTargets('2025');
        hasShown2025 = true;
        
        document.getElementById('hint').innerHTML = '👆 再次双击迎接 2026';
        document.getElementById('hint').style.display = 'block';
        
    } else if (!hasShown2026) {
        document.getElementById('hint').style.display = 'none';
        
        // 冲击波
        shockwaves.push(new Shockwave(canvas.width / 2, canvas.height / 2));
        
        // 爆炸
        currentShape = 'explode';
        particles.forEach(p => {
            const dx = p.x - canvas.width / 2;
            const dy = p.y - canvas.height / 2;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            p.vx = (dx / dist) * (Math.random() * 15 + 5);
            p.vy = (dy / dist) * (Math.random() * 15 + 5);
        });
        
        // 倒计时后聚合
        setTimeout(() => {
            currentShape = 'gather';
        }, 800);
        
        setTimeout(() => {
            currentShape = '2026';
            setParticleTargets('2026');
            hasShown2026 = true;
            
            // 连续烟花
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    fireworks.push(new Firework(
                        Math.random() * canvas.width,
                        Math.random() * canvas.height * 0.6
                    ));
                }, i * 250);
            }
            
            setTimeout(() => {
                document.getElementById('blessing').style.opacity = '1';
            }, 1200);
        }, 1500);
    }
}

// ============ 背景绘制 ============
function drawBackground() {
    // 渐变背景
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
    );
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#050510');
    gradient.addColorStop(1, '#020208');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ============ 动画循环 ============
function animate() {
    time++;
    
    // 背景（带拖尾）
    ctx.fillStyle = 'rgba(5, 5, 16, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 流星
    meteors.forEach(m => {
        m.update();
        m.draw();
    });
    
    // 波纹
    ripples.forEach(r => {
        r.update();
        r.draw();
    });
    ripples = ripples.filter(r => !r.isDead());
    
    // 冲击波
    shockwaves.forEach(s => {
        s.update();
        s.draw();
    });
    shockwaves = shockwaves.filter(s => !s.isDead());
    
    // 粒子
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // 烟花
    fireworks.forEach(fw => {
        fw.update();
        fw.draw();
    });
    fireworks = fireworks.filter(fw => !fw.isDead());
    
    // 滑动产生波纹
    if (handPosition && lastHandPosition) {
        const dx = handPosition.x - lastHandPosition.x;
        const dy = handPosition.y - lastHandPosition.y;
        const speed = Math.sqrt(dx * dx + dy * dy);
        if (speed > 30 && Math.random() > 0.7) {
            ripples.push(new Ripple(handPosition.x, handPosition.y));
        }
    }
    lastHandPosition = handPosition ? { ...handPosition } : null;
    
    requestAnimationFrame(animate);
}

// ============ 初始化 ============
function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawBackground();
    }
    resize();
    window.addEventListener('resize', resize);
    
    // 创建粒子
    for (let i = 0; i < CONFIG.particleCount; i++) {
        particles.push(new Particle());
    }
    
    // 创建流星
    for (let i = 0; i < 5; i++) {
        meteors.push(new Meteor());
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
            
            document.getElementById('hint').innerHTML = '👋 移动手掌推开粒子<br>✊ 握拳切换形状';
            
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
        if (closedFingers >= 3 && now - lastFistTime > 1500) {
            lastFistTime = now;
            triggerShapeChange();
        }
    } else {
        handPosition = null;
    }
}

function enableTouchMode() {
    document.getElementById('hint').innerHTML = '👆 滑动推开粒子<br>📍 长按产生漩涡<br>👆👆 双击切换形状';
    document.getElementById('hint').style.display = 'block';
    
    // 触摸移动
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handPosition = { x: touch.clientX, y: touch.clientY };
        document.getElementById('hint').style.display = 'none';
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => {
        handPosition = null;
        isLongPress = false;
        clearTimeout(longPressTimer);
    });
    
    // 长按检测
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        handPosition = { x: touch.clientX, y: touch.clientY };
        longPressTimer = setTimeout(() => {
            isLongPress = true;
        }, 500);
    });
    
    // 双击
    let lastTap = 0;
    canvas.addEventListener('touchend', () => {
        const now = Date.now();
        if (now - lastTap < 300) {
            triggerShapeChange();
        }
        lastTap = now;
    });
    
    // 鼠标支持
    canvas.addEventListener('mousemove', (e) => {
        handPosition = { x: e.clientX, y: e.clientY };
        document.getElementById('hint').style.display = 'none';
    });
    
    canvas.addEventListener('mousedown', () => {
        longPressTimer = setTimeout(() => {
            isLongPress = true;
        }, 500);
    });
    
    canvas.addEventListener('mouseup', () => {
        isLongPress = false;
        clearTimeout(longPressTimer);
    });
    
    canvas.addEventListener('dblclick', triggerShapeChange);
}

// 启动
window.addEventListener('load', init);
