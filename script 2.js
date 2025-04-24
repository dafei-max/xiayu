// Canvas setup
const canvas = document.getElementById('textCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 600;
canvas.height = 800;

// Text parameters
const mainText = "xiaohongshu";
const bgFontSize = 18; // Background text size
const fgFontSizeMin = 20; // Foreground letter min size
const fgFontSizeMax = 40; // Foreground letter max size
const fontFamily = "'Times New Roman', Times, serif";
const bgTextColor = "rgba(0, 0, 0, 0.08)"; // Faint background color
const fgTextColor = "#005f99"; // Darker blue foreground color

// Foreground letters array
const fgLetters = [];
const numFgLetters = 150; // Number of floating letters

// Interaction parameters
const explosionRadius = 50;
const explosionForce = 8;
const explosionDurationFrames = 3 * 60; // 3 seconds at 60fps
const recoveryDurationFrames = 4 * 60; // 4 seconds at 60fps
const recoverySpring = 0.04;
const damping = 0.92; // Increased damping slightly for smoother recovery
const idleSpeedFactor = 0.05; // Slower idle movement

// Initialize foreground letters
function initializeLetters() {
    for (let i = 0; i < numFgLetters; i++) {
        const charIndex = Math.floor(Math.random() * mainText.length);
        const char = mainText[charIndex];
        
        // Target position (where it should idle)
        const radius = Math.random() * Math.min(canvas.width, canvas.height) * 0.4;
        const angle = Math.random() * Math.PI * 2;
        const targetX = canvas.width / 2 + Math.cos(angle) * radius;
        const targetY = canvas.height / 2 + Math.sin(angle) * radius;

        fgLetters.push({
            char: char,
            x: targetX, // Start at target position
            y: targetY,
            targetX: targetX, 
            targetY: targetY,
            vx: 0, // Set initial velocity to 0
            vy: 0, // Set initial velocity to 0
            size: Math.random() * (fgFontSizeMax - fgFontSizeMin) + fgFontSizeMin,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.005,
            alpha: 1,
            state: 'idle', // idle, exploding, recovering
            timer: 0
        });
    }
}

// Function to draw the background text grid
function drawBackgroundText() {
    ctx.font = `${bgFontSize}px ${fontFamily}`;
    ctx.fillStyle = bgTextColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const metrics = ctx.measureText(mainText + ' ');
    const textWidth = metrics.width;
    const textHeight = bgFontSize * 1.5;
    const cols = Math.ceil(canvas.width / textWidth) + 1; // Ensure coverage
    const rows = Math.ceil(canvas.height / textHeight);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = (col * textWidth) - textWidth / 2; // Offset slightly for centering
            const y = row * textHeight;
            ctx.fillText(mainText, x, y);
        }
    }
}

// Function to update and draw foreground letters
function updateAndDrawForegroundLetters() {
    fgLetters.forEach(letter => {
        // State-based updates
        if (letter.state === 'exploding') {
            letter.vx *= damping;
            letter.vy *= damping;
            letter.x += letter.vx;
            letter.y += letter.vy;
            letter.rotation += letter.rotationSpeed * 3; // Rotate faster when exploding
            letter.alpha = 1; // Keep full opacity during explosion
            letter.timer--;

            if (letter.timer <= 0) {
                letter.state = 'recovering';
                letter.timer = recoveryDurationFrames;
            }
        } else if (letter.state === 'recovering') {
            const dx = letter.targetX - letter.x;
            const dy = letter.targetY - letter.y;
            const ax = dx * recoverySpring;
            const ay = dy * recoverySpring;
            
            letter.vx += ax;
            letter.vy += ay;
            letter.vx *= damping;
            letter.vy *= damping;
            letter.x += letter.vx;
            letter.y += letter.vy;
            letter.rotation += letter.rotationSpeed; // Normal rotation during recovery
            letter.alpha = 1; // No flicker
            letter.timer--;

            const distToTarget = Math.sqrt(dx*dx + dy*dy);
            const speed = Math.sqrt(letter.vx*letter.vx + letter.vy*letter.vy);
            if (letter.timer <= 0 || (distToTarget < 1 && speed < 0.1)) {
                letter.state = 'idle';
                letter.x = letter.targetX;
                letter.y = letter.targetY;
                letter.vx = (Math.random() - 0.5) * idleSpeedFactor * 10;
                letter.vy = (Math.random() - 0.5) * idleSpeedFactor * 10;
                letter.alpha = 1;
            }
        } else { // 'idle' state
            // Gentle pull towards target if drifted too far
            const dx = letter.targetX - letter.x;
            const dy = letter.targetY - letter.y;
            letter.vx += dx * recoverySpring * 0.1; // Very weak pull
            letter.vy += dy * recoverySpring * 0.1;
            
            // Add random movement
            letter.vx += (Math.random() - 0.5) * idleSpeedFactor;
            letter.vy += (Math.random() - 0.5) * idleSpeedFactor;
            
            // Apply damping & move
            letter.vx *= damping; 
            letter.vy *= damping;
            letter.x += letter.vx;
            letter.y += letter.vy;
            letter.rotation += letter.rotationSpeed;
            letter.alpha = 1;
            
            // Keep within bounds slightly better (optional)
            if (letter.x < 0 || letter.x > canvas.width) letter.vx *= -0.5;
            if (letter.y < 0 || letter.y > canvas.height) letter.vy *= -0.5;
        }

        // Draw letter
        ctx.save();
        ctx.globalAlpha = letter.alpha;
        ctx.translate(letter.x, letter.y);
        ctx.rotate(letter.rotation);
        ctx.font = `${letter.size}px ${fontFamily}`;
        ctx.fillStyle = fgTextColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(letter.char, 0, 0);
        ctx.restore();
    });
    ctx.globalAlpha = 1; // Reset global alpha
}

// Add click listener
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    fgLetters.forEach(letter => {
        const dx = letter.x - clickX;
        const dy = letter.y - clickY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < explosionRadius) {
            if (letter.state === 'idle' || letter.state === 'recovering') { // Only affect idle/recovering letters
                letter.state = 'exploding';
                letter.timer = explosionDurationFrames;
                const angle = Math.atan2(dy, dx); // Angle away from click
                const force = (1 - distance / explosionRadius) * explosionForce;
                letter.vx = Math.cos(angle) * force + (Math.random() - 0.5) * 2;
                letter.vy = Math.sin(angle) * force + (Math.random() - 0.5) * 2;
            }
        }
    });
});

// Main animation loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundText();
    updateAndDrawForegroundLetters();
    requestAnimationFrame(animate);
}

// Start animation when page loads
window.onload = function() {
    initializeLetters();
    animate();
}; 