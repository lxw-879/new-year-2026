// 粒子系统配置
const CONFIG = {
    particleCount: 800,
    colors: ['#ffd700', '#ffec8b', '#fff8dc', '#ffa500', '#ff6347'],
    transitionSpeed: 0.03,
    floatSpeed: 0.5
};

// 全局变量
let canvas, ctx;
let particles = [];
let handPosition = null;
let isFist = false;
let currentShape = 'float'; // float, 2025, 2026
let shapeProgress = 0;
let showBlessing = false;
let fireworks = [];
let hasShown2025 = false;
let hasShown2026 = false;

// 初始化
function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 创建粒子
    for (let i = 0; i < CONFIG.particleCount; i++) {
        particles.push(createParticle());
    }
    
    // 初始化手势识别
    initHandTracking();
    
    // 开始动画
    animate();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createParticle() {
    return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        targetX: 0,
        targetY: 0,
        size: Math.random() * 3 + 1,
        color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
        speedX: (Math.random() - 0.5) * CONFIG.floatSpeed,
        speedY: Math.random() * CONFIG.floatSpeed + 0.2,
        alpha: Math.random() * 0.5 + 0.5,
        trail: []
    };
}

// 获取数字形状的点位
function getNumberPoints(num, offsetX = 0) {
    const points = [];
    const str = num.toString();
    const charWidth = 80;
    const startX = (window.innerWidth - str.length * charWidth) / 2;
    const startY = window.innerHeight / 2 - 60;
    
    const digitPatterns = {
        '2': [
            [1,1,1], [0,0,1], [1,1,1], [1,0,0], [1,1,1]
        ],
        '0': [
            [1,1,1], [1,0,1], [1,0,1], [1,0,1], [1,1,1]
        ],
        '5': [
            [1,1,1], [1,0,0], [1,1,1], [0,0,1], [1,1,1]
        ],
        '6': [
            [1,1,1], [1,0,0], [1,1,1], [1,0,1], [1,1,1]
        ]
    };
    
    for (let c = 0; c < str.length; c++) {
        const pattern = digitPatterns[str[c]];
        if (!pattern) continue;
        
        for (let row = 0; row < pattern.length; row++) {
            for (let col = 0; col < pattern[row].length; col++) {
                if (pattern[row][col]) {
                    for (let i = 0; i < 8; i++) {
                        points.push({
                            x: startX + c * charWidth + col * 25 + Math.random() * 15 + offsetX,
                            y: startY + row * 25 + Math.random() * 15
                        });
                    }
                }
            }
        }
    }
    return points;
}

// 手势识别初始化
function initHandTracking() {
    const video = document.getElementById('video');
    const loading = document.getElementById('loading');
    const startBtn = document.getElementById('startBtn');
    
    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });
    
    hands.onResults(onHandResults);
    
    // 加载完成后显示开始按钮
    hands.initialize().then(() => {
        loading.style.display = 'none';
        startBtn.style.display = 'block';
    });
    
    startBtn.addEventListener('click', async () => {
        startBtn.style.display = 'none';
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            video.srcObject = stream;
            await video.play();
            
            const camera = new Camera(video, {
                onFrame: async () => {
                    await hands.send({ image: video });
                },
                width: 640,
                height: 480
            });
            camera.start();
        } catch (err) {
            console.error('摄像头访问失败:', err);
            document.getElementById('hint').textContent = '需要摄像头权限才能体验哦~';
        }
    });
}

function onHandResults(results) {
    const hint = document.getElementById('hint');
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        hint.style.opacity = '0';
        
        const landmarks = results.multiHandLandmarks[0];
        // 手掌中心位置 (镜像翻转)
        handPosition = {
            x: (1 - landmarks[9].x) * window.innerWidth,
            y: landmarks[9].y * window.innerHeight
        };
        
        // 检测握拳 (指尖到手掌的距离)
        const palmBase = landmarks[0];
        const fingerTips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
        let closedFingers = 0;
        
        fingerTips.forEach(tip => {
            const dist = Math.hypot(tip.x - palmBase.x, tip.y - palmBase.y);
            if (dist < 0.15) closedFingers++;
        });
        
        const wasFist = isFist;
        isFist = closedFingers >= 3;
        
        // 握拳触发形状变换
        if (isFist && !wasFist) {
            if (!hasShown2025) {
                currentShape = '2025';
                hasShown2025 = true;
            } else if (!hasShown2026) {
                // 2025 碎裂后变成 2026
                setTimeout(() => {
                    currentShape = '2026';
                    hasShown2026 = true;
                    createFireworks();
                    setTimeout(() => {
                        showBlessing = true;
                        document.getElementById('blessing').style.opacity = '1';
                    }, 1500);
                }, 1000);
                currentShape = 'explode';
            }
        }
    } else {
        hint.style.opacity = '1';
        handPosition = null;
    }
}

// 烟花效果
function createFireworks() {
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const fw = {
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight * 0.6,
                particles: []
            };
            for (let j = 0; j < 50; j++) {
                const angle = (Math.PI * 2 / 50) * j;
                const speed = Math.random() * 3 + 2;
                fw.particles.push({
                    x: fw.x,
                    y: fw.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    alpha: 1,
                    color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)]
                });
            }
            fireworks.push(fw);
        }, i * 300);
    }
}

// 动画循环
function animate() {
    ctx.fillStyle = 'rgba(10, 10, 32, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let targetPoints = null;
    if (currentShape === '2025') {
        targetPoints = getNumberPoints(2025);
        shapeProgress = Math.min(shapeProgress + CONFIG.transitionSpeed, 1);
    } else if (currentShape === '2026') {
        targetPoints = getNumberPoints(2026);
        shapeProgress = Math.min(shapeProgress + CONFIG.transitionSpeed, 1);
    } else if (currentShape === 'explode') {
        shapeProgress = 0;
    } else {
        shapeProgress = Math.max(shapeProgress - CONFIG.transitionSpeed, 0);
    }
    
    // 更新和绘制粒子
    particles.forEach((p, i) => {
        // 保存轨迹
        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
        if (p.trail.length > 5) p.trail.shift();
        
        if (currentShape === 'explode') {
            // 爆炸散开
            p.x += (Math.random() - 0.5) * 20;
            p.y += (Math.random() - 0.5) * 20;
        } else if (targetPoints && shapeProgress > 0) {
            // 向目标形状移动
            const target = targetPoints[i % targetPoints.length];
            p.x += (target.x - p.x) * 0.05 * shapeProgress;
            p.y += (target.y - p.y) * 0.05 * shapeProgress;
        } else {
            // 自由飘落
            p.x += p.speedX;
            p.y += p.speedY;
            
            // 手掌吸引
            if (handPosition) {
                const dx = handPosition.x - p.x;
                const dy = handPosition.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 200) {
                    const force = (200 - dist) / 200 * 0.1;
                    p.x += dx * force;
                    p.y += dy * force;
                }
            }
            
            // 边界循环
            if (p.y > canvas.height + 10) {
                p.y = -10;
                p.x = Math.random() * canvas.width;
            }
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
        }
        
        // 绘制轨迹
        p.trail.forEach((t, ti) => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, p.size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color.replace(')', `, ${t.alpha * (ti / p.trail.length) * 0.3})`).replace('rgb', 'rgba').replace('#', '');
            ctx.globalAlpha = t.alpha * (ti / p.trail.length) * 0.3;
            ctx.fill();
        });
        
        // 绘制粒子
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });
    
    // 绘制烟花
    fireworks.forEach((fw, fi) => {
        fw.particles.forEach(fp => {
            fp.x += fp.vx;
            fp.y += fp.vy;
            fp.vy += 0.05; // 重力
            fp.alpha -= 0.015;
            
            if (fp.alpha > 0) {
                ctx.beginPath();
                ctx.arc(fp.x, fp.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = fp.color;
                ctx.globalAlpha = fp.alpha;
                ctx.shadowBlur = 15;
                ctx.shadowColor = fp.color;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
        });
        
        // 移除消失的烟花
        if (fw.particles.every(fp => fp.alpha <= 0)) {
            fireworks.splice(fi, 1);
        }
    });
    
    requestAnimationFrame(animate);
}

// 页面加载完成后初始化
window.addEventListener('load', init);
