const fontsUrl = "https://fonts.googleapis.com/css2?family=Climate+Crisis&family=Plaster&family=Righteous&family=Saira+Stencil+One&display=swap";

        const preconnect1 = document.createElement('link');
        preconnect1.rel = 'preconnect';
        preconnect1.href = 'https://fonts.googleapis.com';
        document.head.appendChild(preconnect1);

        const preconnect2 = document.createElement('link');
        preconnect2.rel = 'preconnect';
        preconnect2.href = 'https://fonts.gstatic.com';
        preconnect2.crossOrigin = 'anonymous'; 
        document.head.appendChild(preconnect2);

        const fontLink = document.createElement('link');
        fontLink.href = fontsUrl;
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        let colors = ["#1c80b4", "#fcad2a", "#f82f1d"]; // Blue, Yellow, Red
        let grid = 8; 
        let boxes = [];
        let word = "BAUHAUSE"; 
        let lastInteractionTime = 0; // Tracks time for idle animation
        let fontReady = false; // Flag to check if font is loaded
        
        // Variables for Centering Logic
        let squareSize = 0;
        let offsetX = 0;
        let offsetY = 0;
        
        // New: Fixed spacing between cells
        const GUTTER_SIZE = 10; // 10 pixels as requested

        function setup() {
            // 1. MAKE CANVAS FULL SCREEN
            let cnv = createCanvas(windowWidth, windowHeight);
            
            // Add tabindex to canvas to make it focusable
            cnv.elt.setAttribute('tabindex', '0');
            cnv.elt.focus();
            window.focus();
            
            textAlign(CENTER, CENTER);
            
            // --- FONT LOADING LOGIC ---
            let targetFont = "Saira Stencil One"; 

            document.fonts.load(`100px "${targetFont}"`).then(() => {
                textFont(targetFont); 
                textStyle(NORMAL); 
                fontReady = true;
                
                let loader = document.getElementById('loading');
                if(loader) loader.style.display = 'none';
                
                // Initialize the grid layout only after the font is ready
                initializeGrid();

            }).catch(err => {
                console.error('Font failed to load:', err);
                textFont('Arial');
                fontReady = true;
                let loader = document.getElementById('loading');
                if(loader) loader.innerText = "Font Error (Using Arial)";
                initializeGrid();
            });
        }
        
        function initializeGrid() {
            boxes = []; // Clear existing boxes
            
            // 2. CENTER GRID LOGIC
            // Use 90% of the minimum dimension for the overall grid bounding box (to keep the previous margin)
            let minDim = min(width, height);
            squareSize = minDim * 0.9;
            
            // Calculate total fixed gutter space (8 cells means 7 gutters)
            let totalGutterSpace = (grid - 1) * GUTTER_SIZE;
            
            // Calculate the total space available for the 8 letters themselves
            let spaceForLetters = squareSize - totalGutterSpace;
            
            // Calculate the size of each letter's cell/bounding box
            let letterCellSize = spaceForLetters / grid;
            
            // Calculate offsets to center the *entire* square grid (including gutters) on the canvas
            offsetX = (width - squareSize) / 2;
            offsetY = (height - squareSize) / 2;

            let index = 0;

            // Create grid using explicit row/col iteration for robust centering
            for (let row = 0; row < grid; row++) {
                for (let col = 0; col < grid; col++) {
                    
                    // Calculate X position:
                    // Start of grid area (offsetX)
                    // + space covered by previous letters (col * letterCellSize)
                    // + space covered by previous gutters (col * GUTTER_SIZE)
                    // + offset to center the letter in its cell (letterCellSize / 2)
                    let x = offsetX + 
                            (col * letterCellSize) + 
                            (col * GUTTER_SIZE) + 
                            (letterCellSize / 2);

                    // Calculate Y position:
                    let y = offsetY + 
                            (row * letterCellSize) + 
                            (row * GUTTER_SIZE) + 
                            (letterCellSize / 2);
                    
                    // Pick color and character
                    let c = colors[(index) % 3];
                    let char = word[index % word.length];
                    
                    // Pass the calculated letterCellSize to LetterBox
                    boxes.push(new LetterBox(x, y, c, char, letterCellSize));
                    index++;
                }
            }
            
            // Initialize interaction timer
            lastInteractionTime = millis();
        }

        function draw() {
            background("#ffe7c1");
            
            if (!fontReady) {
                return;
            }
            
            let hovering = false;

            boxes.forEach((box) => {
                if (box.contains(mouseX, mouseY)) {
                    box.targetOffset = box.maxOffset;
                    hovering = true;
                } else {
                    if (box.targetScale === 1.0) {
                        box.targetOffset = 0;
                    }
                }
                
                box.move();
                box.show();
            });

            if (hovering) {
                cursor(HAND);
            } else {
                cursor(ARROW);
            }

            // Idle Animation Check
            if (millis() - lastInteractionTime > 15000) {
                if (frameCount % 120 === 0) {
                    triggerRandomAnimation();
                }
            }
        }
        
        // 3. ADD RESPONSIVENESS
        function windowResized() {
            resizeCanvas(windowWidth, windowHeight);
            if (fontReady) {
                initializeGrid(); // Recalculate and recenter the grid
            }
        }

        // Helper to run random animation logic
        function triggerRandomAnimation() {
            let count = floor(random(4, 10));
            for (let i = 0; i < count; i++) {
                let randomBox = random(boxes);
                
                randomBox.interact(); 
                
                if (randomBox.targetOffset === 0) {
                    randomBox.targetOffset = randomBox.maxOffset;
                } else {
                    randomBox.targetOffset = 0;
                }
            }
        }

        // Native p5 function that runs when mouse is clicked
        function mousePressed() {
            lastInteractionTime = millis(); // Reset idle timer
            
            if (typeof canvas !== 'undefined' && canvas.focus) canvas.focus();

            boxes.forEach(box => {
                if (box.contains(mouseX, mouseY)) {
                    box.interact();
                    
                    if (box.targetOffset === 0) {
                        box.targetOffset = box.maxOffset;
                    } else {
                        box.targetOffset = 0;
                    }
                }
            });
        }

        // Trigger random animations when any key is pressed
        function keyPressed() {
            lastInteractionTime = millis(); // Reset idle timer
            triggerRandomAnimation();
        }

        class LetterBox {
            constructor(x, y, color, char, size) {
                this.x = x; 
                this.y = y; 
                this.color = color;
                this.char = char;
                this.cellSize = size; // Store actual grid box size for collision
                // FONT SIZE: Keeping the large size (1.5 multiplier)
                this.size = size * 1.5; 
                
                this.offset = 0;       
                this.targetOffset = 0; 
                this.maxOffset = size / 4; 
                this.easing = 0.1;     
                
                // Scale Properties
                this.scale = 1.0;
                this.targetScale = 1.0;
            }

            move() {
                // 1. Offset Easing (Extrusion)
                let diff = this.targetOffset - this.offset;
                if (abs(diff) > 0.1) {
                    this.offset += diff * this.easing;
                } else {
                    this.offset = this.targetOffset;
                }
                
                // 2. Scale Easing (Size Change)
                let diffS = this.targetScale - this.scale;
                if (abs(diffS) > 0.001) {
                    this.scale += diffS * this.easing;
                } else {
                    this.scale = this.targetScale;
                }
            }

            show() {
                // Apply dynamic scaling
                textSize(this.size * this.scale);
                
                // 1. Shadow (Extrusion)
                fill("#0d0e08"); 
                let step = 1;    
                
                // The extrusion loop draws the shadow backwards from the current offset
                for (let i = 0; i < this.offset; i += step) {
                    text(this.char, this.x + i, this.y - i);
                }

                // 2. Face
                fill(this.color);
                text(this.char, this.x + this.offset, this.y - this.offset);
            }

            // Helper to check if mouse is inside this cell
            contains(px, py) {
                let half = this.cellSize / 2;
                return (px > this.x - half && px < this.x + half && 
                        py > this.y - half && py < this.y + half);
            }

            // Triggered on click or random event
            interact() {
                // 1. Toggle Size/Scale (kept as is)
                if (this.targetScale === 1.0) {
                    this.targetScale = 0.85; // Shrink slightly
                } else {
                    this.targetScale = 1.0;  // Reset
                }

                // 2. Change Color (Cycle to next color in array) (kept as is)
                let currentIdx = colors.indexOf(this.color);
                let nextIdx = (currentIdx + 1) % colors.length;
                this.color = colors[nextIdx];
                
                // 3. Toggle Case (NEW LOGIC)
                if (this.char === this.char.toUpperCase()) {
                    this.char = this.char.toLowerCase();
                } else {
                    this.char = this.char.toUpperCase();
                }
            }
        }