// Canvas setup
const canvas = document.getElementById('textCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 600;
canvas.height = 800;

// Text parameters
const mainText = "xiaohongshu";
const fontSize = 30;
const fontFamily = "sans-serif";
const bgTextColor = "rgba(0, 0, 0, 0.08)";
const fgTextColor = "#005f99";

// Interaction parameters
const interactionRadius = 100;
const explosionForce = 25;
const chargePullSpring = 0.04;
const explosionDurationFrames = 2 * 60;
const damping = 0.89;
const explosionPullbackSpring = 0.01;
const recoveryDurationFrames = 30;

// Array to hold background character objects
let bgChars = [];

// Mouse/Touch Interaction State
let isCharging = false;
let chargeX = null;
let chargeY = null;

// Pre-calculated character widths (global scope)
const charWidths = {};

// Function to precompute character widths
function precomputeWidths() {
    ctx.font = `${fontSize}px ${fontFamily}`;
    for (let i = 0; i < mainText.length; i++) {
        const char = mainText[i];
        charWidths[char] = ctx.measureText(char).width;
    }
}

// Initialize background character objects
function initializeChars() {
    bgChars = [];
    ctx.font = `${fontSize}px ${fontFamily}`;
    let currentX = 0;
    let currentY = 0;
    const lineHeight = fontSize * 1.5;
    let charIndex = 0;

    const estimatedTextWidth = ctx.measureText(mainText).width;
    const cols = Math.ceil(canvas.width / estimatedTextWidth) * mainText.length * 0.9;
    const rows = Math.ceil(canvas.height / lineHeight);

    for (let r = 0; r < rows; r++) {
        currentX = -estimatedTextWidth * 0.1;
        currentY = r * lineHeight;
        for (let i = 0; i < cols; i++) {
            const char = mainText[charIndex % mainText.length];
            const charWidth = charWidths[char] || fontSize * 0.6;
            
            if (currentX + charWidth > canvas.width + estimatedTextWidth * 0.1) break;
            
            bgChars.push({
                char: char,
                originX: currentX,
                originY: currentY,
                x: currentX,
                y: currentY,
                vx: 0,
                vy: 0,
                rotation: 0,
                rotationSpeed: 0,
                alpha: 1,
                state: 'idle',
                timer: 0,
                charWidth: charWidth
            });
            currentX += charWidth;
            charIndex++;
        }
    }
}

// Function to update and draw characters
function updateAndDrawChars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    bgChars.forEach(charObj => {
        let drawX = charObj.x;
        let drawY = charObj.y;
        let drawColor = bgTextColor;
        let drawSize = fontSize;
        let drawAlpha = charObj.alpha;
        let drawRotation = charObj.rotation;

        if (charObj.state === 'charging') {
            const dx = chargeX - charObj.x;
            const dy = chargeY - charObj.y;
            charObj.vx += dx * chargePullSpring;
            charObj.vy += dy * chargePullSpring;
            charObj.vx *= damping; 
            charObj.vy *= damping;
            charObj.x += charObj.vx;
            charObj.y += charObj.vy;
            drawX = charObj.x;
            drawY = charObj.y;
            drawAlpha = 1;
            drawSize = fontSize;
            drawRotation = 0;
            drawColor = bgTextColor;

        } else if (charObj.state === 'exploding') {
            const dxSpring = charObj.originX - charObj.x;
            const dySpring = charObj.originY - charObj.y;
            charObj.vx += dxSpring * explosionPullbackSpring;
            charObj.vy += dySpring * explosionPullbackSpring;

            charObj.vx *= damping;
            charObj.vy *= damping;
            charObj.x += charObj.vx;
            charObj.y += charObj.vy;
            
            charObj.rotation += charObj.rotationSpeed;
            
            const timeFactor = Math.max(0, charObj.timer / explosionDurationFrames);
            drawSize = fontSize * (0.7 + Math.abs(Math.sin((1-timeFactor) * Math.PI * 2)) * 0.5); 
            drawAlpha = 0.4 + Math.abs(Math.sin((1-timeFactor) * Math.PI * 3)) * 0.6; 
            charObj.alpha = drawAlpha;
            
            drawX = charObj.x;
            drawY = charObj.y;
            drawRotation = charObj.rotation;
            drawColor = fgTextColor;

            charObj.timer--;
            if (charObj.timer <= 0) {
                charObj.state = 'waitingToRecover';
                charObj.recoveryDelayTimer = Math.random() * 90;
                charObj.x = charObj.originX;
                charObj.y = charObj.originY;
                charObj.vx = 0;
                charObj.vy = 0;
                charObj.rotation = 0;
                charObj.rotationSpeed = 0;
                charObj.alpha = 0;
            }
        } else if (charObj.state === 'waitingToRecover') {
            charObj.recoveryDelayTimer--;
            if (charObj.recoveryDelayTimer <= 0) {
                charObj.state = 'recovering';
                charObj.timer = recoveryDurationFrames;
                charObj.alpha = 0;
            }
            drawAlpha = 0;
            drawX = charObj.originX;
            drawY = charObj.originY;
            drawSize = fontSize;
            drawRotation = 0;
            drawColor = fgTextColor;
            
        } else if (charObj.state === 'recovering') {
            drawAlpha = Math.min(1, 1 - (charObj.timer / recoveryDurationFrames)); 
            charObj.alpha = drawAlpha;

            drawSize = fontSize;
            drawX = charObj.originX;
            drawY = charObj.originY;
            drawRotation = 0;
            drawColor = fgTextColor;
            
            charObj.timer--;
            if (charObj.timer <= 0) {
                charObj.state = 'idle';
                charObj.alpha = 1;
                drawAlpha = 1;
                drawColor = bgTextColor;
            }
        } else {
            drawSize = fontSize;
            drawAlpha = 1;
            drawRotation = 0;
            drawX = charObj.originX;
            drawY = charObj.originY;
            drawColor = bgTextColor;
            if(charObj.x !== charObj.originX || charObj.y !== charObj.originY || charObj.vx !== 0 || charObj.vy !== 0 || charObj.alpha !== 1) {
                charObj.x = charObj.originX;
                charObj.y = charObj.originY;
                charObj.vx = 0;
                charObj.vy = 0;
                charObj.rotation = 0;
                charObj.rotationSpeed = 0;
                charObj.alpha = 1;
            }
        }
        
        ctx.save();
        ctx.globalAlpha = drawAlpha;
        ctx.fillStyle = drawColor;
        ctx.font = `${drawSize}px ${fontFamily}`;
        const centerX = drawX + charObj.charWidth / 2;
        const centerY = drawY + fontSize / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(drawRotation);
        ctx.fillText(charObj.char, -charObj.charWidth / 2, -fontSize / 2);
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

function handlePointerDown(event) {
    isCharging = true;
    const rect = canvas.getBoundingClientRect();
    chargeX = (event.clientX || event.touches[0].clientX) - rect.left;
    chargeY = (event.clientY || event.touches[0].clientY) - rect.top;

    bgChars.forEach(charObj => {
        if (charObj.state === 'idle') {
            const charCenterX = charObj.originX + charObj.charWidth / 2;
            const charCenterY = charObj.originY + fontSize / 2;
            const dx = charCenterX - chargeX;
            const dy = charCenterY - chargeY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < interactionRadius) {
                charObj.state = 'charging';
                charObj.vx = 0;
                charObj.vy = 0;
            }
        }
    });
}

function handlePointerUp(event) {
    if (!isCharging) return;
    isCharging = false;

    bgChars.forEach(charObj => {
        if (charObj.state === 'charging') {
            charObj.state = 'exploding';
            charObj.timer = explosionDurationFrames;
            charObj.rotation = 0;
            charObj.rotationSpeed = (Math.random() - 0.5) * 0.08;

            const dx = charObj.x - chargeX;
            const dy = charObj.y - chargeY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = (1 - distance / interactionRadius) * explosionForce;
            
            const angle = Math.atan2(dy, dx);
            const randomAngle = angle + (Math.random() - 0.5) * 0.2;
            
            charObj.vx = Math.cos(randomAngle) * force;
            charObj.vy = Math.sin(randomAngle) * force;
        }
    });
    chargeX = null;
    chargeY = null;
}

function handlePointerMove(event) {
    if (!isCharging) return;
    const rect = canvas.getBoundingClientRect();
    chargeX = (event.clientX || event.touches[0].clientX) - rect.left;
    chargeY = (event.clientY || event.touches[0].clientY) - rect.top;
}

// Add event listeners
canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('mousemove', handlePointerMove);

canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
canvas.addEventListener('touchend', handlePointerUp);
canvas.addEventListener('touchmove', handlePointerMove, { passive: true });

// Main animation loop
function animate() {
    updateAndDrawChars();
    requestAnimationFrame(animate);
}

// Start animation when page loads
window.onload = function() {
    precomputeWidths();
    initializeChars();
    animate();
}; 