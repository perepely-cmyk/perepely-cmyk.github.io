        let grid = []; 
        let flippedCards = []; 
        let volume = 0; 
        let displayVolume = 0; 
        let isBusy = false; 
        let isShaking = false; 
        
        let flipAnimation = []; 
        const SHUFFLE_DURATION = 2500; 
        let shuffleState = { isShuffling: false, startTime: 0, duration: SHUFFLE_DURATION, newPositions: [] };
        const BOMB_ANIM_DURATION = 1500; 
        let bombAnimation = { 
            isAnimating: false, 
            startTime: 0, 
            cardIndices: [], 
            phase: 0 
        }; 

        let synth;
        
        const CANVAS_WIDTH = 1200;
        const CANVAS_HEIGHT = 800;
        const GRID_SIZE_X = 6; 
        const GRID_SIZE_Y = 4;
        const BASE_CARD_DIM = 100; 
        const PADDING = 20; 

        const CARD_WIDTH = BASE_CARD_DIM; 
        const CARD_HEIGHT = BASE_CARD_DIM; 
        const BAR_WIDTH = 60;
        
        let GRID_START_X, GRID_START_Y;
        let TOTAL_GRID_WIDTH, VOLUME_BAR_HEIGHT, VOLUME_BAR_Y;
        
        const volumeValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const cardActions = [];

        class Card {
            constructor(id, label, action, color, index) {
                this.id = id;
                this.label = label;
                this.action = action; 
                this.color = color;
                this.isFlipped = false;
                this.currentIndex = index; 
                this.targetIndex = index; 
                this.targetX = 0;
                this.targetY = 0;
                this.currentX = 0;
                this.currentY = 0;
            }

            calculateTargetPosition(index) {
                const row = floor(index / GRID_SIZE_X); 
                const col = index % GRID_SIZE_X;
                this.targetX = GRID_START_X + col * (CARD_WIDTH + PADDING);
                this.targetY = GRID_START_Y + row * (CARD_HEIGHT + PADDING);
                
                if (this.currentX === 0 && this.currentY === 0) {
                    this.currentX = this.targetX;
                    this.currentY = this.targetY;
                }
            }

            updatePosition(t) {
                this.currentX = lerp(this.currentX, this.targetX, 0.08); 
                this.currentY = lerp(this.currentY, this.targetY, 0.08); 
                
                const jumpHeight = sin(t * PI) * 10;
                return jumpHeight;
            }
            
            isAtTarget() {
                return dist(this.currentX, this.currentY, this.targetX, this.targetY) < 1;
            }
        }

        function setup() {
            const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            
            const container = document.getElementById('canvas-container');
            if (container) {
                 canvas.parent(container);
            } else {
                 console.error("Canvas container not found! P5 will attach to the body instead.");
            }
            
            if (typeof Tone !== 'undefined') {
                 synth = new Tone.Synth({
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.05, decay: 0.1, sustain: 0.2, release: 0.5 }
                }).toDestination();
                console.log("Tone.js initialized.");
            } else {
                console.error("Tone.js library is not loaded.");
            }

            calculateLayout();
            initializeCardActions();
            initializeGrid();

            noStroke();
            rectMode(CORNER);
            textAlign(CENTER, CENTER);
            angleMode(DEGREES); 
            textSize(22);
        }

        function calculateLayout() {
            TOTAL_GRID_WIDTH = GRID_SIZE_X * (CARD_WIDTH + PADDING) - PADDING;
            const TOTAL_GRID_HEIGHT = GRID_SIZE_Y * (CARD_WIDTH + PADDING) - PADDING;

            const REQUIRED_RIGHT_SPACE = BAR_WIDTH + PADDING * 4; 
            
            GRID_START_X = (CANVAS_WIDTH - TOTAL_GRID_WIDTH - REQUIRED_RIGHT_SPACE) / 2;
            GRID_START_Y = (CANVAS_HEIGHT - TOTAL_GRID_HEIGHT) / 2; 
            
            VOLUME_BAR_HEIGHT = TOTAL_GRID_HEIGHT;
            VOLUME_BAR_Y = GRID_START_Y;
        }

        function initializeCardActions() {
            let cardId = 0;
            
            volumeValues.forEach(v => {
                const R = map(v, 10, 100, 200, 0);
                const G = map(v, 10, 100, 100, 200);
                
                cardActions.push({ 
                    id: cardId++,
                    label: `${v}%`, 
                    action: v, 
                    pairs: 2,
                    color: color(R, G, 50) 
                });
            });

            for (let i = 0; i < 2; i++) {
                cardActions.push({ 
                    id: cardId++,
                    label: "🧨", 
                    action: 'bomb', 
                    color: color(200, 30, 30), 
                    pairs: 2 
                });
            }
        }

        function initializeGrid() {
            let initialCards = []; 
            let index = 0;

            cardActions.forEach(action => {
                for (let i = 0; i < action.pairs; i++) {
                    initialCards.push(new Card(action.id, action.label, action.action, action.color, index++));
                }
            });
            
            shuffleArray(initialCards);
            
            grid = initialCards.map((card, i) => {
                card.currentIndex = i; 
                card.calculateTargetPosition(i); 
                return card;
            });
            
            resetFlipAnimations();
        }
        
        function resetFlipAnimations() {
             flipAnimation = grid.map(() => ({ 
                targetAngle: 0, 
                currentAngle: 0, 
                currentW: CARD_WIDTH, 
                currentH: CARD_HEIGHT,
                isAnimating: false, 
                phase: 0, 
                currentX_offset: 0, 
                currentY_offset: 0 
            }));
        }

        function draw() {
            let shakeX = 0, shakeY = 0;
            if (isShaking) {
                shakeX = random(-5, 5);
                shakeY = random(-5, 5);
            }
            translate(shakeX, shakeY);

            background(255); 
            
            if (abs(displayVolume - volume) < 0.1) { 
                displayVolume = volume;
            } else {
                displayVolume = lerp(displayVolume, volume, 0.1); 
            }

            if (typeof Tone !== 'undefined' && Tone.Master) {
                Tone.Master.volume.value = Tone.gainToDb(max(0.01, displayVolume / 100)); 
            }


            if (bombAnimation.isAnimating) {
                updateBombAnimation();
            }

            if (shuffleState.isShuffling) {
                updateShuffleAnimation();
            }

            drawCards();
            drawVolumeBar();
            
            translate(-shakeX, -shakeY); 
        }

        function updateShuffleAnimation() {
            const elapsed = millis() - shuffleState.startTime;
            const t = constrain(elapsed / shuffleState.duration, 0, 1); 

            let allAtTarget = true;

            grid.forEach((card, i) => {
                const jumpHeight = card.updatePosition(t);
                card.currentY -= jumpHeight; 
                if (!card.isAtTarget()) {
                    allAtTarget = false;
                }
            });
            
            if (t === 1 || (allAtTarget && elapsed > 100)) { 
                shuffleState.isShuffling = false;
                isBusy = false;
                
                let newGrid = new Array(grid.length);
                grid.forEach(card => {
                    newGrid[card.targetIndex] = card;
                    card.currentIndex = card.targetIndex; 
                    card.currentX = card.targetX; 
                    card.currentY = card.targetY;
                });
                grid = newGrid;
                
                resetFlipAnimations();
                console.log("Shuffle animation finished. Game ready.");
            }
        }

        function triggerShuffleAnimation() {
            isBusy = true; 
            shuffleState.isShuffling = true;
            shuffleState.startTime = millis();
            shuffleState.newPositions = shuffle([...Array(grid.length).keys()]); 

            grid.forEach((card, i) => {
                const targetIndex = shuffleState.newPositions[i];
                card.targetIndex = targetIndex;
                card.calculateTargetPosition(targetIndex); 
                card.currentX = card.currentX; 
                card.currentY = card.currentY; 
                card.isFlipped = false; 
            });
            console.log("Shuffle animation started (2500ms).");
        }
        
        function updateBombAnimation() {
            const elapsed = millis() - bombAnimation.startTime;
            const t = constrain(elapsed / BOMB_ANIM_DURATION, 0, 1);
            const [idx1, idx2] = bombAnimation.cardIndices;
            
            const cardIndicesToAnimate = idx2 !== -1 ? [idx1, idx2] : [idx1]; 
            
            const PULSE_END_TIME = BOMB_ANIM_DURATION * 0.66; // 1000мс
            const SHAKE_END_TIME = BOMB_ANIM_DURATION * 0.88; // 1320мс (220мс тряски)
            
            if (elapsed < PULSE_END_TIME) {
                bombAnimation.phase = 1;
                isShaking = false;
                
                const pulseCycleDuration = 500;
                const pulseTime = elapsed % pulseCycleDuration; 
                const pulseAmount = 1.1; 
                
                let currentScale = 1;
                if (pulseTime < pulseCycleDuration / 2) {
                    currentScale = map(pulseTime, 0, pulseCycleDuration / 2, 1, pulseAmount);
                } else {
                    currentScale = map(pulseTime, pulseCycleDuration / 2, pulseCycleDuration, pulseAmount, 1);
                }
                
                cardIndicesToAnimate.forEach(index => {
                    const anim = flipAnimation[index];
                    anim.currentW = CARD_WIDTH * currentScale;
                    anim.currentH = CARD_HEIGHT * currentScale;
                    anim.currentX_offset = 0;
                    anim.currentY_offset = 0;
                });
            } 
            else if (elapsed < SHAKE_END_TIME) {
                bombAnimation.phase = 2;
                isShaking = true; 
                
                cardIndicesToAnimate.forEach(index => {
                    const anim = flipAnimation[index];
                    anim.currentW = CARD_WIDTH;
                    anim.currentH = CARD_HEIGHT;
                    anim.currentX_offset = random(-5, 5);
                    anim.currentY_offset = random(-5, 5);
                });
            }
            else if (elapsed < BOMB_ANIM_DURATION) {
                bombAnimation.phase = 3;
                isShaking = false; 
                
                cardIndicesToAnimate.forEach(index => {
                    const anim = flipAnimation[index];
                    anim.currentW = CARD_WIDTH;
                    anim.currentH = CARD_HEIGHT;
                    anim.currentX_offset = 0;
                    anim.currentY_offset = 0;
                });
                
            } else {
                bombAnimation.isAnimating = false;
                bombAnimation.phase = 0;
                isShaking = false;
                
                cardIndicesToAnimate.forEach(index => {
                    grid[index].isFlipped = true; 
                    startClosingAnimation(index); 
                });
                
                setTimeout(triggerShuffleAnimation, 500);
            }
        }
        
        function triggerBombAnimation(index1, index2 = -1) {
            bombAnimation.isAnimating = true;
            bombAnimation.startTime = millis();
            bombAnimation.cardIndices = [index1, index2]; 
            
            volume = 0; 
            playVolumeChangeSound(0);
            
            isBusy = true; 
            
            console.log("Bomb triggered! Volume set to 0%. Bomb animation started (1500ms).");
        }

        function drawCards() {
            const [idx1, idx2] = bombAnimation.cardIndices;
            
            for (let i = 0; i < grid.length; i++) {
                const card = grid[i];
                const anim = flipAnimation[i];
                
                let x = card.currentX + (anim.currentX_offset || 0);
                let y = card.currentY + (anim.currentY_offset || 0);

                if (anim.isAnimating) {
                    anim.currentAngle = lerp(anim.currentAngle, anim.targetAngle, 0.15);
                    anim.currentW = CARD_WIDTH * cos(anim.currentAngle - HALF_PI);
                    anim.currentW = abs(anim.currentW); 
                    
                    if (anim.phase === 1 && abs(anim.currentAngle - HALF_PI) < 0.1) {
                        card.isFlipped = true;
                        anim.targetAngle = PI; 
                        anim.phase = 2; 
                    } else if (anim.phase === 3 && abs(anim.currentAngle - HALF_PI) < 0.1) {
                        card.isFlipped = false;
                        anim.targetAngle = 0; 
                        anim.phase = 0; 
                    }
                    
                    if (abs(anim.currentAngle - anim.targetAngle) < 0.01 && anim.phase !== 1 && anim.phase !== 3) {
                         anim.currentAngle = anim.targetAngle;
                         anim.isAnimating = false;
                         anim.phase = card.isFlipped ? 2 : 0;
                         anim.currentW = CARD_WIDTH;
                         
                         if (anim.phase === 0 && !shuffleState.isShuffling && !bombAnimation.isAnimating) {
                            isBusy = false;
                         }
                    }
                }
                
                const currentW = anim.currentW;
                const currentH = anim.currentH || CARD_HEIGHT; 
                const x_offset_flip = (CARD_WIDTH - currentW) / 2;
                
                push();
                
                fill(70, 70, 150); 
                rect(x, y, CARD_WIDTH, CARD_HEIGHT, 10);
                
                let showFront = card.isFlipped;
                
                if (anim.currentAngle < HALF_PI && anim.isAnimating) {
                    showFront = false; 
                } else if (anim.currentAngle > HALF_PI && anim.isAnimating) {
                    showFront = true;
                }
                
                let faceColor = showFront ? card.color : color(50, 50, 150); 
                
                fill(faceColor);
                rect(x + x_offset_flip, y, currentW, currentH, 10);
                
                fill(255); 
                textSize(22); 
                
                const isBombAnimating = card.action === 'bomb' && bombAnimation.isAnimating && (i === idx1 || i === idx2);
                
                if (showFront && currentW > CARD_WIDTH / 3) { 
                    if (isBombAnimating) {
                        push();
                        textAlign(CENTER, CENTER);
                        textSize(CARD_WIDTH * 0.8); 
                        text('🧨', 
                             x + CARD_WIDTH / 2, 
                             y + CARD_HEIGHT / 2);
                        pop();
                    } else {
                        text(card.label, 
                             x + CARD_WIDTH / 2, 
                             y + CARD_HEIGHT / 2);
                    }
                }

                if (isBombAnimating && bombAnimation.phase === 3) {
                    
                    fill(0);
                    rect(x, y, CARD_WIDTH, CARD_HEIGHT, 10);
                        
                    push();
                    translate(x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
                    
                    stroke(255, 0, 0); 
                    strokeWeight(CARD_WIDTH / 20); 
                    
                    fill(255, 255, 0); 
                    star(0, 0, CARD_WIDTH * 0.3, CARD_WIDTH * 0.6, 12); 
                    pop();
                }
                
                pop();
            }
        }
        
        function star(x, y, radius1, radius2, npoints) {
            let angle = 360 / npoints;
            let halfAngle = angle / 2.0;
            beginShape();
            for (let a = 0; a < 360; a += angle) {
                let sx = x + cos(a) * radius2;
                let sy = y + sin(a) * radius2;
                vertex(sx, sy);
                sx = x + cos(a + halfAngle) * radius1;
                sy = y + sin(a + halfAngle) * radius1; 
                vertex(sx, sy);
            }
            endShape(CLOSE);
        }
        
        function drawVolumeBar() {
            const barX = GRID_START_X + TOTAL_GRID_WIDTH + PADDING * 2; 
            const barY = VOLUME_BAR_Y;
            const barH = VOLUME_BAR_HEIGHT; 
            
            fill(220);
            rect(barX, barY, BAR_WIDTH, barH, 15);
            
            const volumeLevel = map(displayVolume, 0, 100, 0, barH);
            const fillY = barY + barH - volumeLevel; 

            fill(0, 170, 0); 
            
            rect(barX, fillY, BAR_WIDTH, volumeLevel, 15);
            
            fill(50);
            textSize(24);
            text(`${nf(displayVolume, 1, 0)}%`, barX + BAR_WIDTH / 2, barY + barH + 40);
            
            textSize(20);
            fill(50); 
            text("VOLUME", barX + BAR_WIDTH / 2, barY - 30);
        }

        function mousePressed() {
            if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
                Tone.start().then(() => {
                    console.log("Audio Context Started.");
                });
            }
            
            if (isBusy) return; 

            const col = floor((mouseX - GRID_START_X) / (CARD_WIDTH + PADDING));
            const row = floor((mouseY - GRID_START_Y) / (CARD_HEIGHT + PADDING));
            const index = row * GRID_SIZE_X + col;
            
            if (col < 0 || col >= GRID_SIZE_X || row < 0 || row >= GRID_SIZE_Y) return;
            if (index < 0 || index >= grid.length) return;

            const card = grid[index];

            if (!card.isFlipped) {
                flipAnimation[index].isAnimating = true;
                flipAnimation[index].targetAngle = PI; 
                flipAnimation[index].phase = 1;

                flippedCards.push(index);

                if (card.action === 'bomb') {
                    flippedCards = [index]; 
                    
                    isBusy = true;
                    setTimeout(checkMatch, 500); 
                    return;
                }

                if (flippedCards.length === 2) {
                    isBusy = true; 
                    setTimeout(checkMatch, 1500); 
                }
            }
        }

        function checkMatch() {
            if (flippedCards.length === 1) {
                const index1 = flippedCards[0];
                const card1 = grid[index1];
                
                if (card1.action === 'bomb') {
                    triggerBombAnimation(index1); 
                } else {
                    grid[index1].isFlipped = false;
                    isBusy = false;
                }
            } 
            else if (flippedCards.length === 2) {
                const index1 = flippedCards[0];
                const index2 = flippedCards[1];
                const card1 = grid[index1];
                const card2 = grid[index2];
                
                if (card1.id !== card2.id) {
                    console.log("No match. Cards closing.");
                    startClosingAnimation(index1, index2);
                } 
                else if (typeof card1.action === 'number') {
                    console.log(`Volume Match found: ${card1.label}`);
                    volume = constrain(card1.action, 0, 100);
                    playVolumeChangeSound(volume);
                    
                    startClosingAnimation(index1, index2);
                    setTimeout(triggerShuffleAnimation, 500); 
                }
                else if (card1.action === 'bomb') {
                     triggerBombAnimation(index1, index2); 
                }
            }
            
            flippedCards = [];
        }

        function startClosingAnimation(index1, index2 = -1) {
            [index1, index2].filter(idx => idx !== -1).forEach(index => {
                if (flipAnimation[index].phase === 2 || grid[index].isFlipped) {
                    flipAnimation[index].isAnimating = true;
                    flipAnimation[index].targetAngle = HALF_PI;
                    flipAnimation[index].phase = 3; 
                }
            });
        }

        function playVolumeChangeSound(newVolume) {
            if (!synth || typeof Tone === 'undefined' || Tone.context.state !== 'running') return;

            const minFreq = 130; 
            const maxFreq = 660;
            const freq = map(newVolume, 0, 100, minFreq, maxFreq); 
            
            synth.triggerAttackRelease(freq, "4n"); 
        }

        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = floor(random(i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        function windowResized() {
            calculateLayout();
        }