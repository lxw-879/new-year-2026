import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============ 配置 ============
const CONFIG = {
    particleCount: 3000,
    colors: [0xffd700, 0xffec8b, 0xffa500, 0xff6347, 0xffffff],
    bloomStrength: 1.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.2
};

// ============ 全局变量 ============
let scene, camera, renderer, composer;
let particles, particlePositions, particleColors, particleTargets;
let handPosition = null;
let currentShape = 'float';
let shapeProgress = 0;
let touchMode = false;
let hasShown2025 = false;
let hasShown2026 = false;
let clock = new THREE.Clock();
let isWechat = /MicroMessenger/i.test(navigator.userAgent);

// ============ 初始化 Three.js ============
function initThree() {
    const container = document.getElementById('container');
    
    // 场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.0008);
    
    // 相机
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 500;
    
    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    // 后期处理 - Bloom 发光效果
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        CONFIG.bloomStrength,
        CONFIG.bloomRadius,
        CONFIG.bloomThreshold
    );
    composer.addPass(bloomPass);
    
    // 创建粒子系统
    createParticles();
    
    // 添加背景星星
    createStars();
    
    // 窗口大小调整
    window.addEventListener('resize', onWindowResize);
}

// ============ 创建粒子 ============
function createParticles() {
    const geometry = new THREE.BufferGeometry();
    particlePositions = new Float32Array(CONFIG.particleCount * 3);
    particleColors = new Float32Array(CONFIG.particleCount * 3);
    particleTargets = new Float32Array(CONFIG.particleCount * 3);
    
    const color = new THREE.Color();
    
    for (let i = 0; i < CONFIG.particleCount; i++) {
        const i3 = i * 3;
        
        // 初始位置 - 球形分布
        const radius = 300 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        particlePositions[i3 + 2] = radius * Math.cos(phi);
        
        // 颜色
        color.setHex(CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)]);
        particleColors[i3] = color.r;
        particleColors[i3 + 1] = color.g;
        particleColors[i3 + 2] = color.b;
        
        // 目标位置初始化
        particleTargets[i3] = particlePositions[i3];
        particleTargets[i3 + 1] = particlePositions[i3 + 1];
        particleTargets[i3 + 2] = particlePositions[i3 + 2];
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    // 粒子材质
    const material = new THREE.PointsMaterial({
        size: 4,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

// ============ 背景星星 ============
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsPositions = new Float32Array(1000 * 3);
    
    for (let i = 0; i < 1000; i++) {
        starsPositions[i * 3] = (Math.random() - 0.5) * 2000;
        starsPositions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
        starsPositions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
        size: 1,
        color: 0xffffff,
        transparent: true,
        opacity: 0.6
    });
    
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// ============ 生成数字形状的点 ============
function getNumberTargets(numStr) {
    const targets = [];
    const digitWidth = 80;
    const totalWidth = numStr.length * digitWidth;
    const startX = -totalWidth / 2 + digitWidth / 2;
    
    const patterns = {
        '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
        '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
        '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
        '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]]
    };
    
    for (let c = 0; c < numStr.length; c++) {
        const pattern = patterns[numStr[c]];
        if (!pattern) continue;
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 3; col++) {
                if (pattern[row][col]) {
                    // 每个格子多个粒子
                    for (let n = 0; n < 15; n++) {
                        targets.push({
                            x: startX + c * digitWidth + (col - 1) * 25 + (Math.random() - 0.5) * 20,
                            y: (2 - row) * 25 + (Math.random() - 0.5) * 20,
                            z: (Math.random() - 0.5) * 30
                        });
                    }
                }
            }
        }
    }
    return targets;
}

// ============ 更新粒子目标位置 ============
function updateTargets(shape) {
    let targets;
    
    if (shape === '2025') {
        targets = getNumberTargets('2025');
    } else if (shape === '2026') {
        targets = getNumberTargets('2026');
    } else {
        targets = null;
    }
    
    for (let i = 0; i < CONFIG.particleCount; i++) {
        const i3 = i * 3;
        
        if (targets && targets.length > 0) {
            const t = targets[i % targets.length];
            particleTargets[i3] = t.x;
            particleTargets[i3 + 1] = t.y;
            particleTargets[i3 + 2] = t.z;
        } else {
            // 回到随机漂浮
            const radius = 200 + Math.random() * 150;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            particleTargets[i3] = radius * Math.sin(phi) * Math.cos(theta);
            particleTargets[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            particleTargets[i3 + 2] = radius * Math.cos(phi);
        }
    }
}

// ============ 动画循环 ============
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    // 更新粒子位置
    const positions = particles.geometry.attributes.position.array;
    
    for (let i = 0; i < CONFIG.particleCount; i++) {
        const i3 = i * 3;
        
        if (currentShape === 'explode') {
            // 爆炸效果
            positions[i3] += (Math.random() - 0.5) * 15;
            positions[i3 + 1] += (Math.random() - 0.5) * 15;
            positions[i3 + 2] += (Math.random() - 0.5) * 15;
        } else if (currentShape === '2025' || currentShape === '2026') {
            // 向目标移动
            positions[i3] += (particleTargets[i3] - positions[i3]) * 0.08;
            positions[i3 + 1] += (particleTargets[i3 + 1] - positions[i3 + 1]) * 0.08;
            positions[i3 + 2] += (particleTargets[i3 + 2] - positions[i3 + 2]) * 0.08;
        } else {
            // 自由漂浮 + 手势吸引
            positions[i3] += Math.sin(time + i * 0.01) * 0.3;
            positions[i3 + 1] += Math.cos(time + i * 0.01) * 0.3;
            
            if (handPosition) {
                const dx = handPosition.x - positions[i3];
                const dy = handPosition.y - positions[i3 + 1];
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 200) {
                    const force = (200 - dist) / 200 * 2;
                    positions[i3] += dx * 0.02 * force;
                    positions[i3 + 1] += dy * 0.02 * force;
                }
            }
        }
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
    
    // 轻微旋转
    particles.rotation.y += 0.001;
    
    composer.render();
}

// ============ 窗口调整 ============
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// ============ 形状切换 ============
function triggerShapeChange() {
    if (!hasShown2025) {
        currentShape = '2025';
        updateTargets('2025');
        hasShown2025 = true;
        showIndicator('2025 → 再次点击');
    } else if (!hasShown2026) {
        currentShape = 'explode';
        showIndicator('告别 2025...');
        
        setTimeout(() => {
            currentShape = '2026';
            updateTargets('2026');
            hasShown2026 = true;
            showIndicator('');
            
            setTimeout(() => {
                document.getElementById('blessing').style.opacity = '1';
            }, 1500);
        }, 1200);
    }
}

function showIndicator(text) {
    const indicator = document.getElementById('shapeIndicator');
    indicator.textContent = text;
    indicator.style.display = text ? 'block' : 'none';
}

// ============ 手势识别 ============
function initHandTracking() {
    const video = document.getElementById('video');
    const loading = document.getElementById('loading');
    const modeSelect = document.getElementById('modeSelect');
    const wechatTip = document.getElementById('wechatTip');
    
    // 微信检测
    if (isWechat) {
        loading.style.display = 'none';
        wechatTip.style.display = 'flex';
        
        wechatTip.querySelector('.skip').addEventListener('click', () => {
            wechatTip.style.display = 'none';
            video.style.display = 'none';
            enableTouchMode();
        });
        return;
    }
    
    // 直接显示模式选择，不等待 MediaPipe 加载
    loading.style.display = 'none';
    modeSelect.style.display = 'flex';
    
    document.getElementById('gestureBtn').addEventListener('click', async () => {
        modeSelect.style.display = 'none';
        loading.style.display = 'flex';
        loading.querySelector('div:last-child').textContent = '正在启动摄像头...';
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            video.srcObject = stream;
            await video.play();
            
            // 初始化 MediaPipe
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
            
            loading.style.display = 'none';
            camera.start();
            
        } catch (err) {
            console.error('摄像头失败:', err);
            loading.style.display = 'none';
            video.style.display = 'none';
            enableTouchMode();
        }
    });
    
    document.getElementById('touchBtn').addEventListener('click', () => {
        modeSelect.style.display = 'none';
        video.style.display = 'none';
        enableTouchMode();
    });
}

function onHandResults(results) {
    const hint = document.getElementById('hint');
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        hint.style.display = 'none';
        
        const landmarks = results.multiHandLandmarks[0];
        // 转换到 3D 空间坐标
        handPosition = {
            x: ((1 - landmarks[9].x) - 0.5) * 600,
            y: (0.5 - landmarks[9].y) * 400
        };
        
        // 检测握拳
        const palmBase = landmarks[0];
        const fingerTips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
        let closedFingers = 0;
        
        fingerTips.forEach(tip => {
            const dist = Math.hypot(tip.x - palmBase.x, tip.y - palmBase.y);
            if (dist < 0.15) closedFingers++;
        });
        
        if (closedFingers >= 3) {
            triggerShapeChange();
        }
    } else {
        handPosition = null;
    }
}

// ============ 触屏模式 ============
function enableTouchMode() {
    touchMode = true;
    const hint = document.getElementById('hint');
    hint.innerHTML = '👆 滑动控制粒子 · 双击切换形状';
    hint.style.display = 'block';
    
    const container = document.getElementById('container');
    
    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handPosition = {
            x: (touch.clientX / window.innerWidth - 0.5) * 600,
            y: (0.5 - touch.clientY / window.innerHeight) * 400
        };
        hint.style.display = 'none';
    }, { passive: false });
    
    container.addEventListener('touchend', () => {
        handPosition = null;
    });
    
    // 双击
    let lastTap = 0;
    container.addEventListener('touchend', () => {
        const now = Date.now();
        if (now - lastTap < 300) triggerShapeChange();
        lastTap = now;
    });
    
    // 鼠标支持
    container.addEventListener('mousemove', (e) => {
        handPosition = {
            x: (e.clientX / window.innerWidth - 0.5) * 600,
            y: (0.5 - e.clientY / window.innerHeight) * 400
        };
        hint.style.display = 'none';
    });
    
    container.addEventListener('dblclick', triggerShapeChange);
}

// ============ 启动 ============
window.addEventListener('load', () => {
    initThree();
    initHandTracking();
    animate();
});
