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

        let colors = ["#1c80b4", "#fcad2a", "#f82f1d"]; 
        let grid = 8; 
        let boxes = [];
        let word = "BAUHAUSE"; 
        let lastInteractionTime = 0; 
        let fontReady = false; 
        
        let squareSize = 0;
        let offsetX = 0;
        let offsetY = 0;
        
        const GUTTER_SIZE = 10; 

        function setup() {
            let cnv = createCanvas(windowWidth, windowHeight);
            
            cnv.elt.setAttribute('tabindex', '0');
            cnv.elt.focus();
            window.focus();
            
            textAlign(CENTER, CENTER);
            
            let targetFont = "Saira Stencil One"; 

            document.fonts.load(`100px "${targetFont}"`).then(() => {
                textFont(targetFont); 
                textStyle(NORMAL); 
                fontReady = true;
                
                let loader = document.getElementById('loading');
                if(loader) loader.style.display = 'none';
                
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
            boxes = []; 
            
            let minDim = min(width, height);
            squareSize = minDim * 0.9;
            
            let totalGutterSpace = (grid - 1) * GUTTER_SIZE;
            
            let spaceForLetters = squareSize - totalGutterSpace;
            
            let letterCellSize = spaceForLetters / grid;
            
            offsetX = (width - squareSize) / 2;
            offsetY = (height - squareSize) / 2;

            let index = 0;

            for (let row = 0; row < grid; row++) {
                for (let col = 0; col < grid; col++) {
                    
                    let x = offsetX + 
                            (col * letterCellSize) + 
                            (col * GUTTER_SIZE) + 
                            (letterCellSize / 2);

                    let y = offsetY + 
                            (row * letterCellSize) + 
                            (row * GUTTER_SIZE) + 
                            (letterCellSize / 2);
                    
                    let c = colors[(index) % 3];
                    let char = word[index % word.length];
                    
                    boxes.push(new LetterBox(x, y, c, char, letterCellSize));
                    index++;
                }
            }
            
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

            if (millis() - lastInteractionTime > 15000) {
                if (frameCount % 120 === 0) {
                    triggerRandomAnimation();
                }
            }
        }
        
        function windowResized() {
            resizeCanvas(windowWidth, windowHeight);
            if (fontReady) {
                initializeGrid(); 
            }
        }

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

        function mousePressed() {
            lastInteractionTime = millis(); 
            
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

        function keyPressed() {
            lastInteractionTime = millis(); 
            triggerRandomAnimation();
        }

        class LetterBox {
            constructor(x, y, color, char, size) {
                this.x = x; 
                this.y = y; 
                this.color = color;
                this.char = char;
                this.cellSize = size; 
                this.size = size * 1.5; 
                
                this.offset = 0;       
                this.targetOffset = 0; 
                this.maxOffset = size / 4; 
                this.easing = 0.1;     
                
                this.scale = 1.0;
                this.targetScale = 1.0;
            }

            move() {
                let diff = this.targetOffset - this.offset;
                if (abs(diff) > 0.1) {
                    this.offset += diff * this.easing;
                } else {
                    this.offset = this.targetOffset;
                }
                
                let diffS = this.targetScale - this.scale;
                if (abs(diffS) > 0.001) {
                    this.scale += diffS * this.easing;
                } else {
                    this.scale = this.targetScale;
                }
            }

            show() {
                textSize(this.size * this.scale);
                
                fill("#0d0e08"); 
                let step = 1;    
                
                for (let i = 0; i < this.offset; i += step) {
                    text(this.char, this.x + i, this.y - i);
                }

                fill(this.color);
                text(this.char, this.x + this.offset, this.y - this.offset);
            }

            contains(px, py) {
                let half = this.cellSize / 2;
                return (px > this.x - half && px < this.x + half && 
                        py > this.y - half && py < this.y + half);
            }

            interact() {
                if (this.targetScale === 1.0) {
                    this.targetScale = 0.85; 
                } else {
                    this.targetScale = 1.0;  
                }

                let currentIdx = colors.indexOf(this.color);
                let nextIdx = (currentIdx + 1) % colors.length;
                this.color = colors[nextIdx];
                
                if (this.char === this.char.toUpperCase()) {
                    this.char = this.char.toLowerCase();
                } else {
                    this.char = this.char.toUpperCase();
                }
            }
        }