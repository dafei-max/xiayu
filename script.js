// Canvas setup
const canvas = document.getElementById('textCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 600;
canvas.height = 800;

// Text parameters
const mainText = "xiaohongshu";
const fontSize = 24; // Changed font size back to 24
const fontFamily = "sans-serif"; // Use generic sans-serif
const bgTextColor = "rgba(0, 0, 0, 0.08)"; // Faint background color
const fgTextColor = "#005f99"; // Reverted fgTextColor to the specific blue

// Interaction parameters
const interactionRadius = 100; // Changed radius back to 100px
const explosionForce = 7; // Adjusted force
const chargePullSpring = 0.04; // Spring force pulling towards charge point
const explosionDurationFrames = 4 * 60; // 4 seconds
const recoveryDurationFrames = 3 * 60;  // 3 seconds (Changed from 5)
const explosionPullbackSpring = 0.005; // Added weak spring for explosion bounce
const recoverySpring = 0.05; // Kept for potential future use, not used in current recovery
const damping = 0.92; // Slightly adjusted damping

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
                // color: bgTextColor, // Color handled during draw
                // currentSize: fontSize, // Size handled during draw
                rotation: 0,
                rotationSpeed: 0,
                alpha: 1,
                state: 'idle', // idle, charging, exploding, recovering
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
            // Pull towards the charging point
            const dx = chargeX - charObj.x;
            const dy = chargeY - charObj.y;
            charObj.vx += dx * chargePullSpring;
            charObj.vy += dy * chargePullSpring;

            // Apply damping & update position
            charObj.vx *= damping;
            charObj.vy *= damping;
            charObj.x += charObj.vx;
            charObj.y += charObj.vy;

            // Keep appearance normal during charge
            drawX = charObj.x;
            drawY = charObj.y;
            drawAlpha = 1;
            drawSize = fontSize;
            drawRotation = 0;

        } else if (charObj.state === 'exploding') {
            // Apply weak spring towards origin during explosion for elasticity
            const dxSpring = charObj.originX - charObj.x;
            const dySpring = charObj.originY - charObj.y;
            charObj.vx += dxSpring * explosionPullbackSpring;
            charObj.vy += dySpring * explosionPullbackSpring;
            
            // Apply damping & update position
            charObj.vx *= damping;
            charObj.vy *= damping;
            charObj.x += charObj.vx;
            charObj.y += charObj.vy;
            
            // Update rotation
            charObj.rotation += charObj.rotationSpeed;
            
            // Variations for explosion
            // Size pulse
            const timeFactor = (explosionDurationFrames - charObj.timer) / explosionDurationFrames; // 0 to 1
            drawSize = fontSize * (0.7 + Math.abs(Math.sin(timeFactor * Math.PI * 2)) * 0.5); // Slower size pulse
            // Linear fade out instead of flicker
            drawAlpha = Math.max(0, charObj.timer / explosionDurationFrames); 
            
            // Store current alpha for drawing state consistency
            charObj.alpha = drawAlpha;
            drawColor = fgTextColor; // Set color to blue during explosion

            // Add small random position offset for more scatter (reduced further)
            drawX = charObj.x + (Math.random() - 0.5) * 1.5;
            drawY = charObj.y + (Math.random() - 0.5) * 1.5;
            drawRotation = charObj.rotation;

            // Timer logic
            charObj.timer--;
            if (charObj.timer <= 0) {
                charObj.state = 'recovering';
                charObj.timer = recoveryDurationFrames;
                // Reset appearance properties for recovery start
                charObj.x = charObj.originX; // Ensure it recovers at origin
                charObj.y = charObj.originY;
                charObj.vx = 0;
                charObj.vy = 0;
                charObj.rotation = 0;
                charObj.rotationSpeed = 0;
                charObj.alpha = 0; // Start recovery fully transparent
            }
        } else if (charObj.state === 'recovering') {
            // In-place recovery: only alpha changes
            drawAlpha = Math.min(1, 1 - (charObj.timer / recoveryDurationFrames)); 
            charObj.alpha = drawAlpha;

            // Keep at original position, normal size/rotation
            drawSize = fontSize;
            drawX = charObj.originX;
            drawY = charObj.originY;
            drawRotation = 0;
            // drawColor remains bgTextColor
            
            // Timer and recovery completion check
            charObj.timer--;
            if (charObj.timer <= 0) {
                charObj.state = 'idle';
                charObj.alpha = 1;
                // Update draw variables for this frame
                drawAlpha = 1;
            }
        } else { // 'idle' state
             // Ensure idle state has correct default values
             drawSize = fontSize;
             drawAlpha = 1;
             drawRotation = 0;
             drawX = charObj.originX;
             drawY = charObj.originY;
             if(charObj.x !== charObj.originX || charObj.y !== charObj.originY || charObj.vx !== 0 || charObj.vy !== 0) {
                 // Force reset if somehow drifted
                 charObj.x = charObj.originX;
                 charObj.y = charObj.originY;
                 charObj.vx = 0;
                 charObj.vy = 0;
                 charObj.rotation = 0;
                 charObj.rotationSpeed = 0;
                 charObj.alpha = 1;
             }
        }
        
        // Draw the character
        ctx.save();
        ctx.globalAlpha = drawAlpha;
        ctx.fillStyle = drawColor; // Will always be bgTextColor now
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

// --- Event Listeners for Charging/Explosion ---

function handlePointerDown(event) {
    isCharging = true;
    const rect = canvas.getBoundingClientRect();
    // Use clientX/Y for mouse, potentially touches[0].clientX/Y for touch
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
                // Reset velocity before charging pull starts
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
            // Transition from charging to exploding
            charObj.state = 'exploding';
            charObj.timer = explosionDurationFrames;
            charObj.rotation = 0;
            charObj.rotationSpeed = (Math.random() - 0.5) * 0.15; // Assign random rotation speed for explosion

            // Explosion force based on the initial charge point
            const dx = charObj.x - chargeX; // Explode from current pos away from charge point
            const dy = charObj.y - chargeY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const angle = Math.atan2(dy, dx);
            const force = (1 - dist / interactionRadius) * explosionForce; // Less force if it was pulled further
            
            charObj.vx = Math.cos(angle) * force + (Math.random() - 0.5) * 3; // More randomness
            charObj.vy = Math.sin(angle) * force + (Math.random() - 0.5) * 3;
        }
    });
    chargeX = null; // Clear charge point
    chargeY = null;
}

function handlePointerMove(event) {
    // Optional: Update chargeX/Y if you want the pull point to follow the cursor while holding
    // if (!isCharging) return;
    // const rect = canvas.getBoundingClientRect();
    // chargeX = (event.clientX || event.touches[0].clientX) - rect.left;
    // chargeY = (event.clientY || event.touches[0].clientY) - rect.top;
}

function handlePointerLeave(event) {
    // Optional: Cancel charge if mouse leaves canvas while holding?
    // if (isCharging) {
    //     isCharging = false;
    //     bgChars.forEach(charObj => {
    //         if (charObj.state === 'charging') {
    //             // Reset to idle smoothly or instantly?
    //             charObj.state = 'recovering'; // Use recovery logic to return
    //             charObj.timer = 60; // Short recovery
    //             charObj.alpha = 0;
    //         }
    //     });
    //     chargeX = null;
    //     chargeY = null;
    // }
}

// Add listeners (consider touch events too for broader compatibility)
canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('mousemove', handlePointerMove); // If needed
canvas.addEventListener('mouseleave', handlePointerLeave); // If needed

canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
canvas.addEventListener('touchend', handlePointerUp);
canvas.addEventListener('touchmove', handlePointerMove, { passive: true }); // If needed
canvas.addEventListener('touchcancel', handlePointerLeave); // If needed

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