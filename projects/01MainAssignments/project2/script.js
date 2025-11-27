// *** ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ***
        let grid = [];
        let flippedCards = [];
        let volume = 0; 
        let displayVolume = 0; 
        let isBusy = false;
        let flipAnimation = []; 
        let matchesCount = 0; 
        
        let lastTime = 0;
        let isGameOver = false;
        
        let shuffleState = { 
            isShuffling: false, 
            startTime: 0, 
            duration: 1800, 
            initialPositions: [], 
            randomOffsets: [],
            explosionCenter: { x: 0, y: 0 }, 
            distances: [], 
            maxDistance: 1
        }; 

        let pulseOffset = 0;
        let pulseTime = 0;

        // *** TONE.JS ***
        let synth;
        let explosionPlayer; 
        let flipPlayer; 
        
        // URL загруженных MP3-файлов
        const EXPLOSION_URL = 'loud-explosion-425457.mp3'; 
        const FLIP_SOUND_URL = 'flipcard-91468.mp3'; 
        
        // --- PRELOAD ФУНКЦИЯ p5.js ---
        function preload() {
            // Оставляем пустой
        }
        // ------------------------------------------

        function setupAudio() {
            // Здесь мы ждем, пока Tone.js будет определен
            if (typeof Tone !== 'undefined') {
                console.log("Tone.js успешно загружен. Инициализация аудио.");
                
                // 1. Инициализация игрока Tone.js для загруженной бомбы
                explosionPlayer = new Tone.Player(EXPLOSION_URL).toDestination();
                explosionPlayer.volume.value = -3; 
                explosionPlayer.onload = () => { console.log('Explosion sound loaded successfully!'); };
                explosionPlayer.onerror = (e) => { console.error('Explosion sound failed to load:', e); };
                
                // 2. Инициализация игрока Tone.js для звука перелистывания
                flipPlayer = new Tone.Player(FLIP_SOUND_URL).toDestination();
                flipPlayer.volume.value = -8; 
                flipPlayer.onload = () => { console.log('Flip sound loaded successfully!'); };
                flipPlayer.onerror = (e) => { console.error('Flip sound failed to load:', e); };
                
                // 3. Основной синтезатор для совпадений
                synth = new Tone.Synth({
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 }
                }).toDestination(); 
                
            } else {
                // Это сообщение не должно появляться после исправления
                console.error("ОШИБКА: Tone.js не загружен. Аудио будет недоступно. Возможно, проблема с CDN.");
            }
        }
        // -------------------------------------------------------------

        // --- КОНСТАНТЫ РАЗМЕРА ---
        const CANVAS_WIDTH = 900; 
        const CANVAS_HEIGHT = 800; 
        const GRID_SIZE_X = 8; 
        const GRID_SIZE_Y = 6; 

        const BASE_CARD_WIDTH = 50;
        const BASE_CARD_HEIGHT = 50;
        const SCALE_FACTOR = 1.5; 
        const PADDING = 10; 
        const LABEL_VERTICAL_OFFSET = 10; 
        const FIXED_TOP_OFFSET = 20; 

        const CARD_WIDTH = BASE_CARD_WIDTH * SCALE_FACTOR; 
        const CARD_HEIGHT = BASE_CARD_HEIGHT * SCALE_FACTOR; 
        
        const BAR_WIDTH = 25 * SCALE_FACTOR;
        let GRID_START_X;
        let GRID_START_Y;
        let TOTAL_GRID_WIDTH;
        let VOLUME_BAR_HEIGHT;
        let VOLUME_BAR_Y;

        const cardActions = []; 

        function setup() {
            const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.parent(document.body); 

            if (cardActions.length === 0) {
                 // Числовые карты: 5% до 80% (16 уровней = 16 пар = 32 карты)
                for (let v = 5; v <= 80; v += 5) {
                    const R = map(v, 0, 100, 255, 0); 
                    const G = map(v, 0, 100, 0, 255);
                    
                    cardActions.push({ 
                        label: `${v}%`, 
                        action: v, 
                        pairs: 1, 
                        color: [R, G, 0] 
                    });
                }

                // Специальные карты: ТОЛЬКО БОМБА (8 пар = 16 карт)
                cardActions.push({ 
                    label: "💣", 
                    action: 'shuffle', 
                    pairs: 8, 
                    color: [255, 180, 0] // Желто-оранжевый
                });
            }
            
            calculateLayout();
            // *** ИСПРАВЛЕНИЕ: Откладываем инициализацию аудио ***
            // Это дает внешней библиотеке Tone.js время на загрузку
            setTimeout(setupAudio, 0); 
            
            initializeGrid();
            
            noStroke();
            rectMode(CORNER);
            
            textAlign(CENTER, CENTER);
            textSize(20); 
            
            lastTime = millis();
        }

        function calculateLayout() {
            const GRID_WIDTH = GRID_SIZE_X * (CARD_WIDTH + PADDING) - PADDING;
            const GRID_HEIGHT = GRID_SIZE_Y * (CARD_HEIGHT + PADDING) - PADDING;

            TOTAL_GRID_WIDTH = GRID_WIDTH;
            // Общая ширина, которую занимают сетка и шкала громкости, включая промежутки
            const TOTAL_WIDTH_NEEDED = GRID_WIDTH + PADDING + BAR_WIDTH + PADDING; 
            
            // Расчет начальной X-позиции для центрирования всей игровой области
            GRID_START_X = (CANVAS_WIDTH - TOTAL_WIDTH_NEEDED) / 2;
            
            const GLOBAL_START_Y = FIXED_TOP_OFFSET; 
            
            // Расчет начальной Y-позиции для центрирования сетки
            GRID_START_Y = GLOBAL_START_Y + (CANVAS_HEIGHT - FIXED_TOP_OFFSET - GRID_HEIGHT) / 2; 
            
            VOLUME_BAR_HEIGHT = GRID_HEIGHT;
            VOLUME_BAR_Y = GRID_START_Y; 
        }

        function initializeGrid() {
            let cardId = 0;
            grid = []; 
            flippedCards = []; // Очищаем открытые карты
            flipAnimation = []; 
            shuffleState.initialPositions = []; 

            cardActions.forEach(action => {
                for (let i = 0; i < action.pairs; i++) {
                    grid.push({ id: cardId, label: action.label, action: action.action, color: color(action.color), isFlipped: false, isMatched: false });
                    grid.push({ id: cardId, label: action.label, action: action.action, color: color(action.color), isFlipped: false, isMatched: false });
                    cardId++;
                }
            });
            
            shuffleArray(grid);
            
             for(let i = 0; i < grid.length; i++) {
                flipAnimation[i] = { targetAngle: 0, currentAngle: 0, currentW: CARD_WIDTH, isAnimating: false, phase: 0 }; 
                shuffleState.initialPositions[i] = getCardBasePosition(i);
                // Усиление случайного разброса для реалистичного взрыва
                shuffleState.randomOffsets[i] = createVector(random(-1, 1) * 600, random(-1, 1) * 600);
            }
            
            volume = 0;
            displayVolume = 0;
            matchesCount = 0;
            isGameOver = false;
            isBusy = false;
        }
        
        function getCardBasePosition(index) {
            const row = floor(index / GRID_SIZE_X); 
            const col = index % GRID_SIZE_X;
            const x_base = GRID_START_X + col * (CARD_WIDTH + PADDING);
            const y_base = GRID_START_Y + row * (CARD_HEIGHT + PADDING);
            return { x: x_base, y: y_base };
        }

        function draw() {
            const now = millis();
            let deltaTime = (now - lastTime) / 1000;
            lastTime = now;
            
            pulseTime = (millis() / 1000) * 4; 
            pulseOffset = sin(pulseTime) * 2; 
            
            background(240);
            drawCards();
            drawVolumeBar();
            drawGameStatus(); 
        }
        
        function drawGameStatus() {
            if (volume === 100) {
                 fill(0, 0, 0, 150);
                 rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                 
                 fill(255, 255, 0); 
                 textSize(50);
                 
                 let message = "ПОБЕДА! ГРОМКОСТЬ 100%";
                 
                 text(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                 
                 fill(255);
                 textSize(25);
                 text("Нажмите для начала новой игры.", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);

                 isGameOver = true;
            }
            
             textAlign(CENTER, CENTER);
        }
        
        // --- Анимация взрыва и перемешивания (С ВОЛНОЙ) ---
        function getShuffleOffset(index) {
            if (!shuffleState.isShuffling) return { x: 0, y: 0 };
            
            const elapsed = millis() - shuffleState.startTime;
            const distance = shuffleState.distances[index]; // Нормализованная дистанция
            
            // Время начала движения: чем дальше, тем позже (задержка до 50% длительности)
            const startDelay = distance * (shuffleState.duration * 0.5); 
            
            // Если время еще не пришло, карта не двигается
            if (elapsed < startDelay) return { x: 0, y: 0 };
            
            // Нормализованное время (t) для конкретной карты, учитывая задержку
            const effectiveElapsed = elapsed - startDelay;
            const effectiveDuration = shuffleState.duration - startDelay; 
            
            let t = constrain(effectiveElapsed / effectiveDuration, 0, 1);
            
            let moveFraction = sin(t * PI); // От 0 до 1 и обратно к 0
            
            const explosionX = shuffleState.explosionCenter.x;
            const explosionY = shuffleState.explosionCenter.y;
            
            const basePos = shuffleState.initialPositions[index];
            
            // Вектор от центра карты до центра взрыва (направление разлета)
            const directionVector = createVector(basePos.x - explosionX, basePos.y - explosionY);
            
            directionVector.normalize().mult(150); // Базовая сила разлета
            
            // Смешиваем направленный вектор с случайным вектором
            const finalOffsetX = (directionVector.x * 0.4 + shuffleState.randomOffsets[index].x * 0.6) * moveFraction;
            const finalOffsetY = (directionVector.y * 0.4 + shuffleState.randomOffsets[index].y * 0.6) * moveFraction;

            if (t === 1 && elapsed >= shuffleState.duration) {
                // Финальная точка анимации (наступает позже для дальних карт)
                shuffleState.isShuffling = false;
                isBusy = false;
                
                // --- ФИНАЛЬНОЕ ПЕРЕМЕШИВАНИЕ ---
                shuffleArray(grid);
                
                grid.forEach((card, i) => {
                    if (!card.isMatched) {
                        card.isFlipped = false;
                        flipAnimation[i] = { targetAngle: 0, currentAngle: 0, currentW: CARD_WIDTH, isAnimating: false, phase: 0 }; 
                    }
                });
                
                flippedCards = [];
                return { x: 0, y: 0 };
            }
            
            return { x: finalOffsetX, y: finalOffsetY };
        }
        // ------------------------------------------

        // --- Функция отрисовки карты БОМБЫ (Использует эмодзи) ---
        function drawBombEmoji(x, y, w, h) {
             fill(255);
             textSize(30); 
             // Использование эмодзи гарантирует отображение без ошибок загрузки
             text('💣', x + w / 2, y + h / 2 + 3); 
        }

        function drawCards() {
            for (let i = 0; i < grid.length; i++) {
                const card = grid[i];
                const anim = flipAnimation[i];
                
                const basePos = shuffleState.initialPositions[i] || getCardBasePosition(i);
                
                const x_base = basePos.x;
                const y_base = basePos.y;
                
                const offset = getShuffleOffset(i);
                
                let currentW = anim.currentW;
                let currentH = CARD_HEIGHT;
                let x_offset_flip = (CARD_WIDTH - currentW) / 2;
                let y_offset_pulse = 0;

                // --- Анимация пульсации ---
                if (card.action === 'shuffle' && !card.isFlipped && !card.isMatched && !shuffleState.isShuffling) {
                    currentW = CARD_WIDTH + pulseOffset;
                    currentH = CARD_HEIGHT + pulseOffset;
                    x_offset_flip = (CARD_WIDTH - currentW) / 2;
                    y_offset_pulse = (CARD_HEIGHT - currentH) / 2;
                }

                const x = x_base + offset.x + x_offset_flip;
                const y = y_base + offset.y + y_offset_pulse;


                // --- Анимация вращения "Дверца" в 2D ---
                if (anim.isAnimating) {
                    // Анимация вращения
                    anim.currentAngle = lerp(anim.currentAngle, anim.targetAngle, 0.15);
                    
                    currentW = CARD_WIDTH * cos(anim.currentAngle - HALF_PI);
                    currentW = abs(currentW); 
                    
                    x_offset_flip = (CARD_WIDTH - currentW) / 2;

                    // Фаза 1: Карта идет к 90 градусам (HALF_PI)
                    if (anim.phase === 1) {
                        // Точно в середине, когда currentAngle проходит HALF_PI, воспроизводим звук
                        if (abs(anim.currentAngle - HALF_PI) < 0.1) {
                            playFlipSound(); 
                            card.isFlipped = true;
                            anim.targetAngle = PI; 
                            anim.phase = 2; // Переход ко второй половине вращения
                        } 
                    } 
                    // Фаза 3: Карта закрывается (идет от isFlipped=true к isFlipped=false)
                    else if (anim.phase === 3) {
                        // Точно в середине, когда currentAngle проходит HALF_PI, воспроизводим звук
                         if (abs(anim.currentAngle - HALF_PI) < 0.1) {
                            playFlipSound(); 
                            card.isFlipped = false;
                            anim.targetAngle = 0; 
                            anim.phase = 4; // Переход ко второй половине вращения
                        } 
                    } 
                    
                    // Завершение анимации
                    if (abs(anim.currentAngle - anim.targetAngle) < 0.01) {
                        anim.currentAngle = anim.targetAngle;
                        anim.isAnimating = false;
                        anim.phase = (anim.targetAngle === 0) ? 0 : 2; 
                        
                        currentW = CARD_WIDTH;
                        currentH = CARD_HEIGHT;
                        x_offset_flip = 0;
                    }
                }
                
                
                push();
                
                if (!card.isMatched) { 
                    
                    // Задняя сторона карты
                    fill(100, 100, 200); 
                    rect(x, y, currentW, currentH, 5);
                    
                    let showFront = card.isFlipped;
                    
                    if (anim.currentAngle < HALF_PI) {
                        showFront = false; 
                    } else {
                        showFront = true;
                    }

                    // --- Лицевая сторона карты ---
                    if (showFront) {
                        fill(card.color);
                        rect(x, y, currentW, currentH, 5);
                        
                        fill(255);
                        textSize(20); 

                        if (card.action === 'shuffle') {
                            // Использование функции отрисовки эмодзи
                            drawBombEmoji(x, y, currentW, currentH);
                        } else if (currentW > CARD_WIDTH / 3) { 
                            let cardLabel = card.label;
                            textSize(20);
                            text(cardLabel, x + currentW / 2, y + currentH / 2 + 3); 
                        }
                    } else {
                        // Задняя сторона
                        fill(100, 100, 200);
                        rect(x, y, currentW, currentH, 5);
                        
                        fill(255);
                        textSize(25);
                        if (currentW > CARD_WIDTH / 3) { 
                            text('?', x + currentW / 2, y + currentH / 2 + 3);
                        }
                    }
                } else {
                    // Совпавшая (исчезнувшая) карточка - фон
                    fill(220, 220, 220, 150); 
                    rect(x_base, y_base, CARD_WIDTH, CARD_HEIGHT, 5);
                }
                
                pop();
            }
        }

        function drawVolumeBar() {
            // Исправлено: BAR_WIDTH + PADDING - это промежуток между сеткой и шкалой
            const barX = GRID_START_X + TOTAL_GRID_WIDTH + PADDING; 
            const barY = VOLUME_BAR_Y;
            const barH = VOLUME_BAR_HEIGHT; 
            
            fill(180);
            rect(barX, barY, BAR_WIDTH, barH, 5);
            
            displayVolume = lerp(displayVolume, volume, 0.05); 
            
            if (abs(displayVolume - volume) < 0.01) {
                displayVolume = volume;
            }

            const volumeLevel = map(displayVolume, 0, 100, 0, barH);
            const fillY = barY + barH - volumeLevel; 

            const R_visual = map(displayVolume, 0, 100, 255, 0);
            const G_visual = map(displayVolume, 0, 100, 0, 255);
            fill(R_visual, G_visual, 0);
            
            rect(barX, fillY, BAR_WIDTH, volumeLevel, 5);
            
            fill(50);
            textSize(14); 
            
            text('100%', barX + BAR_WIDTH / 2, barY - LABEL_VERTICAL_OFFSET);
            text('0%', barX + BAR_WIDTH / 2, barY + barH + LABEL_VERTICAL_OFFSET);
            
            textSize(20);
            text(`${nf(displayVolume, 1, 0)}%`, barX + BAR_WIDTH / 2, barY + barH / 2); 
            textSize(20); 
        }

        function mousePressed() {
            // Активация аудио контекста Tone.js при первом клике
            if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
                Tone.start().then(() => {
                    console.log("Audio Context Started.");
                });
            }
            
            if (isGameOver) {
                 if (!isBusy) {
                    initializeGrid(); 
                    return; 
                 }
            }

            if (isBusy || shuffleState.isShuffling) return; 

            const col = floor((mouseX - GRID_START_X) / (CARD_WIDTH + PADDING));
            const row = floor((mouseY - GRID_START_Y) / (CARD_HEIGHT + PADDING));
            const index = row * GRID_SIZE_X + col;
            
            if (index < 0 || index >= grid.length || grid.length !== GRID_SIZE_X * GRID_SIZE_Y) return;

            if (index >= 0 && index < grid.length && !grid[index].isFlipped && !grid[index].isMatched) {
                
                flipAnimation[index].isAnimating = true;
                flipAnimation[index].targetAngle = HALF_PI;
                flipAnimation[index].phase = 1;

                const card = grid[index]; 

                // --- НЕМЕДЛЕННАЯ АКТИВАЦИЯ БОМБЫ ---
                if (card.action === 'shuffle') {
                    flippedCards.push(index); 
                    handleShuffleBomb(index, true); 
                    return; 
                }
                // ------------------------------------

                flippedCards.push(index);

                if (flippedCards.length === 2) {
                    isBusy = true;
                    // Оставляем небольшую задержку для просмотра второй карты
                    setTimeout(checkMatch, 1500); 
                }
            }
        }

        /**
         * Активирует эффект "бомбы" при открытии карты BOMB.
         */
        function handleShuffleBomb(index, instant = false) {
            if (isBusy || shuffleState.isShuffling) return; 

            volume = 0;
            playBombSound(); 
            isBusy = true; 
            grid[index].isMatched = true; // Бомба исчезает

            // 1. Установка центра взрыва
            const bombPos = getCardBasePosition(index);
            shuffleState.explosionCenter = { 
                x: bombPos.x + CARD_WIDTH / 2, 
                y: bombPos.y + CARD_HEIGHT / 2 
            };

            // 2. Расчет дистанции для эффекта волны
            let maxDist = 0;
            shuffleState.distances = grid.map((card, i) => {
                const pos = getCardBasePosition(i);
                const dx = pos.x - shuffleState.explosionCenter.x;
                const dy = pos.y - shuffleState.explosionCenter.y;
                const dist = sqrt(dx * dx + dy * dy);
                maxDist = max(maxDist, dist);
                return dist;
            });
            shuffleState.maxDistance = maxDist;

            // 3. Нормализация дистанций (0 - центр, 1 - край)
            shuffleState.distances = shuffleState.distances.map(d => d / shuffleState.maxDistance);
            
            // Анимация закрытия всех несовпавших открытых карт
            grid.forEach((card, i) => {
                if (card.isFlipped && !card.isMatched) { 
                    flipAnimation[i].isAnimating = true;
                    flipAnimation[i].targetAngle = HALF_PI;
                    flipAnimation[i].phase = 3; 
                }
            });

            // Запускаем анимацию взрыва немедленно
            if (instant) {
                flippedCards = []; 
                triggerShuffleAnimation(); 
            } else {
                 setTimeout(() => {
                    flippedCards = []; 
                    triggerShuffleAnimation(); 
                }, 1000); 
            }
        }

        function triggerShuffleAnimation() {
            if (shuffleState.isShuffling) return; 

            // Сбрасываем все анимации, чтобы они начали с 0
            shuffleState.randomOffsets.forEach((v, i) => {
                shuffleState.randomOffsets[i] = createVector(random(-1, 1) * 600, random(-1, 1) * 600);
            });

            isBusy = true; 
            shuffleState.isShuffling = true;
            shuffleState.startTime = millis();
        }


        function checkMatch() {
            const index1 = flippedCards[0];
            const index2 = flippedCards[1];
            const card1 = grid[index1];
            const card2 = grid[index2];
            
            if (!card1 || !card2) {
                isBusy = false;
                flippedCards = [];
                return;
            }


            if (card1.id === card2.id) {
                
                handleAction(card1.action); 
                playMatchSound(card1.action); 
                
                matchesCount++;

                card1.isMatched = true;
                card2.isMatched = true;
                
                setTimeout(() => {
                    isBusy = false;
                }, 500); 
                
                if (volume === 100) {
                    isGameOver = true;
                }

            } else {
                playNegativeSound();
                // Несовпадение: запускаем анимацию закрытия
                flipAnimation[index1].isAnimating = true;
                flipAnimation[index1].targetAngle = HALF_PI;
                flipAnimation[index1].phase = 3;

                flipAnimation[index2].isAnimating = true;
                flipAnimation[index2].targetAngle = HALF_PI;
                flipAnimation[index2].phase = 3;
                
                setTimeout(() => {
                    if (!shuffleState.isShuffling) { 
                        isBusy = false;
                    }
                }, 1000); 
            }

            flippedCards = [];
        }
        
        /**
         * Воспроизводит загруженный MP3 звук перелистывания.
         */
        function playFlipSound() {
             if (typeof Tone === 'undefined' || Tone.context.state !== 'running' || !flipPlayer) return;

             // Воспроизводим загруженный трек, сбрасывая его, с гарантией, что он загружен
             if (flipPlayer.loaded) {
                flipPlayer.start(Tone.now()); 
             } else {
                 console.warn("Flip sound not loaded, using fallback.");
                 // FALLBACK (синтезированный звук, если MP3 не загружен)
                 const flipNoise = new Tone.NoiseSynth({
                    noise: { type: 'white' }, 
                    envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.01 }
                 }).toDestination();
                 flipNoise.volume.value = -12; 
                 flipNoise.triggerAttackRelease(0.06); 
             }
        }

        function playNegativeSound() {
             if (!synth || typeof Tone === 'undefined' || Tone.context.state !== 'running') return;
             
             const noise = new Tone.NoiseSynth({
                noise: { type: 'pink' },
                envelope: { attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.05 }
            }).toDestination();
            noise.triggerAttackRelease("4n", Tone.now(), 0.5); 
        }
        
        /**
         * Воспроизводит загруженный MP3 звук взрыва.
         */
        function playBombSound() {
            if (typeof Tone === 'undefined' || Tone.context.state !== 'running' || !explosionPlayer) return;
            
            // Воспроизводим загруженный трек, с гарантией, что он загружен
            if (explosionPlayer.loaded) {
                explosionPlayer.start(Tone.now());
            } else {
                 console.warn("Explosion player not loaded yet, using fallback sound.");
                 // FALLBACK (На случай, если загрузка не завершится)
                 const boom = new Tone.MembraneSynth().toDestination();
                 boom.triggerAttackRelease("C1", 0.5);
            }
        }


        function playMatchSound(action) {
            if (!synth || typeof Tone === 'undefined' || Tone.context.state !== 'running') return;

            if (typeof action === 'number') {
                const freq = map(action, 0, 100, 250, 900); 
                synth.triggerAttackRelease(freq, "8n");
            } else if (action === 'shuffle') {
                synth.triggerAttackRelease("C4", "8n");
            } 
        }

        function handleAction(action) {
            if (typeof action === 'number') {
                volume = constrain(action, 0, 100); 
            }
        }

        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = floor(random(i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        function windowResized() {
            // В вашем коде p5.js canvas имеет фиксированный размер 900x800.
            // Если бы размер был динамическим, здесь нужно было бы вызвать resizeCanvas()
            // и calculateLayout().
            calculateLayout();
        }