// comfy cakes web - logica del juego

(() => {
  'use strict';

  // -- ingredientes y nombres --
  const ATTRIBUTES = {
    // 4 Formas (el doble de las 2 iniciales)
    shape: {
      round: 'Redondo',
      rectangle: 'Cuadrado',
      heart: 'Corazón',
      rectangular: 'Rectangular'
    },
    // 8 Sabores de bizcocho (el doble de los 4 iniciales)
    flavor: {
      chocolate: 'Chocolate',
      vanilla: 'Vainilla',
      strawberry: 'Fresa',
      lemon: 'Limón',
      arequipe: 'Arequipe',
      cafe: 'Café',
      maracuya: 'Maracuyá',
      mora: 'Mora'
    },
    // 8 Cubiertas y melados (el doble de las 4 iniciales)
    icing: {
      'white-cream': 'Crema de Chantilly',
      'chocolate-fudge': 'Chocolate',
      caramel: 'Arequipe',
      'pink-glaze': 'Guayaba',
      'maracuya-glaze': 'Maracuyá',
      'mora-glaze': 'Mora',
      chantilly: 'Merengue',
      'burnt-caramel': 'Panela'
    },
    // 8 Adornos de encima (el doble de los 4 iniciales)
    topping: {
      cherry: 'Cereza',
      berries: 'Fresa',
      sprinkles: 'Chispas',
      candle: 'Vela',
      barquillo: 'Barquillo',
      cookie: 'Galleta',
      melocoton: 'Melocotón',
      almonds: 'Almendras'
    }
  };

  const GAME_CONFIG = {
    INITIAL_LIVES: 3,
    BASE_POINTS: 100,
    TIME_BONUS_MULT: 5,
    CAKES_PER_LVL: 5,
    // segs por nivel
    BASE_TIMES_BY_LEVEL: {
      1: 30,
      2: 25,
      3: 20,
      4: 16,
      5: 12
    },
    MIN_TIME: 10
  };

  // -- guardar récord en localStorage --
  const StorageManager = {
    isAvailable: (() => {
      try {
        const testKey = '__comfy_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        console.warn('localStorage no disponible. Operando en modo memoria temporal.');
        return false;
      }
    })(),

    memoryStore: {
      highScore: 0,
      theme: 'light',
      isMuted: false
    },

    getHighScore() {
      if (this.isAvailable) {
        try {
          return parseInt(localStorage.getItem('comfy_high_score') || '0', 10);
        } catch (e) {
          return this.memoryStore.highScore;
        }
      }
      return this.memoryStore.highScore;
    },

    setHighScore(score) {
      this.memoryStore.highScore = score;
      if (this.isAvailable) {
        try {
          localStorage.setItem('comfy_high_score', score.toString());
        } catch (e) {}
      }
    },

    checkAndUpdateHighScore(newScore) {
      const currentHigh = this.getHighScore();
      if (newScore > currentHigh) {
        this.setHighScore(newScore);
        return true; // Es nuevo récord
      }
      return false;
    },

    getSetting(key, defaultValue) {
      if (this.isAvailable) {
        try {
          const val = localStorage.getItem(`comfy_setting_${key}`);
          return val !== null ? JSON.parse(val) : defaultValue;
        } catch (e) {}
      }
      return this.memoryStore[key] !== undefined ? this.memoryStore[key] : defaultValue;
    },

    setSetting(key, value) {
      this.memoryStore[key] = value;
      if (this.isAvailable) {
        try {
          localStorage.setItem(`comfy_setting_${key}`, JSON.stringify(value));
        } catch (e) {}
      }
    }
  };

  // -- sonidos del juego --
  const SoundManager = {
    audioCtx: null,
    isMuted: StorageManager.getSetting('isMuted', false),

    init() {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
    },

    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
      if (this.isMuted) return;
      try {
        this.init();
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gainNode.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) {}
    },

    playSelect() {
      this.playTone(520, 'sine', 0.08, 0.06);
    },

    playSuccess() {
      if (this.isMuted) return;
      setTimeout(() => this.playTone(523.25, 'triangle', 0.12, 0.1), 0);   // Do
      setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.1), 100); // Mi
      setTimeout(() => this.playTone(783.99, 'triangle', 0.25, 0.12), 200); // Sol
    },

    playError() {
      if (this.isMuted) return;
      setTimeout(() => this.playTone(280, 'sawtooth', 0.15, 0.12), 0);
      setTimeout(() => this.playTone(190, 'sawtooth', 0.25, 0.12), 120);
    },

    playLevelUp() {
      if (this.isMuted) return;
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 'sine', 0.15, 0.1), idx * 90);
      });
    },

    // sonido de game over
    playGameOver() {
      if (this.isMuted) return;
      setTimeout(() => this.playTone(320, 'sawtooth', 0.2, 0.12), 0);
      setTimeout(() => this.playTone(260, 'sawtooth', 0.2, 0.12), 150);
      setTimeout(() => this.playTone(200, 'sawtooth', 0.4, 0.14), 300);
    },

    toggleMute() {
      this.isMuted = !this.isMuted;
      StorageManager.setSetting('isMuted', this.isMuted);
      return this.isMuted;
    }
  };

  // -- estado global --
  const State = {
    screen: 'start', // 'start', 'game', 'gameover'
    score: 0,
    highScore: StorageManager.getHighScore(),
    lives: GAME_CONFIG.INITIAL_LIVES,
    level: 1,
    correctCakesInLevel: 0,
    totalCorrectCakes: 0,
    orderNumber: 0,

    currentOrder: null, // { shape, flavor, icing, topping }
    previousOrder: null,

    playerCake: {
      shape: null,
      flavor: null,
      icing: null,
      topping: null
    },

    // Temporizador
    timeLeft: 30,
    maxTime: 30,
    timerInterval: null,
    isPaused: false,
    isEvaluating: false
  };

  // -- elementos del DOM --
  const DOM = {
    // Pantallas
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    pauseModal: document.getElementById('pause-modal'),
    toastContainer: document.getElementById('toast-container'),

    // Botones globales
    btnSoundToggle: document.getElementById('btn-sound-toggle'),
    soundIcon: document.getElementById('sound-icon'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    btnStartGame: document.getElementById('btn-start-game'),
    btnPlayAgain: document.getElementById('btn-play-again'),
    btnGoMenu: document.getElementById('btn-go-menu'),
    btnPause: document.getElementById('btn-pause'),
    btnResumeGame: document.getElementById('btn-resume-game'),
    btnPauseMenu: document.getElementById('btn-pause-menu'),
    btnRestartGame: document.getElementById('btn-restart-game'),

    // HUD
    hudLevelVal: document.getElementById('hud-level-val'),
    hudScoreVal: document.getElementById('hud-score-val'),
    hudRecordVal: document.getElementById('hud-record-val'),
    livesContainer: document.getElementById('lives-container'),
    timerSeconds: document.getElementById('timer-seconds'),
    timerBarFill: document.getElementById('timer-bar-fill'),

    // Inicio y Estadísticas
    startHighScore: document.getElementById('start-high-score'),

    // Pedido
    orderNumber: document.getElementById('order-number'),
    orderCakeVisual: document.getElementById('order-cake-visual'),
    orderSpecShape: document.querySelector('#order-spec-shape .spec-value'),
    orderSpecFlavor: document.querySelector('#order-spec-flavor .spec-value'),
    orderSpecIcing: document.querySelector('#order-spec-icing .spec-value'),
    orderSpecTopping: document.querySelector('#order-spec-topping .spec-value'),

    // Cinta y pastel del jugador
    conveyorCart: document.getElementById('conveyor-cart'),
    playerCakeVisual: document.getElementById('player-cake-visual'),
    feedbackBanner: document.getElementById('game-feedback-banner'),
    feedbackIcon: document.getElementById('feedback-icon'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackDesc: document.getElementById('feedback-desc'),

    // Chips de estado
    chipShape: document.getElementById('chip-shape'),
    chipFlavor: document.getElementById('chip-flavor'),
    chipIcing: document.getElementById('chip-icing'),
    chipTopping: document.getElementById('chip-topping'),

    // Acciones del pastel
    btnDiscardCake: document.getElementById('btn-discard-cake'),
    btnSubmitCake: document.getElementById('btn-submit-cake'),

    // Selectores
    optionButtons: document.querySelectorAll('.option-btn'),

    // Pantalla de Game Over
    finalScoreVal: document.getElementById('final-score-val'),
    finalRecordVal: document.getElementById('final-record-val'),
    finalLevelVal: document.getElementById('final-level-val'),
    finalCakesVal: document.getElementById('final-cakes-val'),
    newRecordBadge: document.getElementById('new-record-badge')
  };

  // -- toasts / notificaciones --
  function showToast(message, type = 'warning', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = `<svg class="svg-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`;
    if (type === 'danger') {
      icon = `<svg class="svg-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>`;
    }
    if (type === 'success') {
      icon = `<svg class="svg-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
    }

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // -- cambiar pantallas --
  function switchScreen(screenName) {
    State.screen = screenName;
    DOM.startScreen.classList.remove('active');
    DOM.gameScreen.classList.remove('active');
    DOM.gameOverScreen.classList.remove('active');

    if (screenName === 'start') {
      DOM.startScreen.classList.add('active');
      DOM.startHighScore.textContent = State.highScore;
    } else if (screenName === 'game') {
      DOM.gameScreen.classList.add('active');
    } else if (screenName === 'gameover') {
      DOM.gameOverScreen.classList.add('active');
      renderGameOverStats();
    }
  }

  function renderGameOverStats() {
    DOM.finalScoreVal.textContent = State.score;
    DOM.finalRecordVal.textContent = State.highScore;
    DOM.finalLevelVal.textContent = State.level;
    DOM.finalCakesVal.textContent = State.totalCorrectCakes;

    const isNew = StorageManager.checkAndUpdateHighScore(State.score);
    if (isNew && State.score > 0) {
      DOM.newRecordBadge.classList.remove('hidden');
      State.highScore = State.score;
    } else {
      DOM.newRecordBadge.classList.add('hidden');
    }
  }

  // -- generar pedidos --
  function generateNewOrder() {
    const shapes = Object.keys(ATTRIBUTES.shape);
    const flavors = Object.keys(ATTRIBUTES.flavor);
    const icings = Object.keys(ATTRIBUTES.icing);
    const toppings = Object.keys(ATTRIBUTES.topping);

    let newOrder;
    let isIdentical = true;

    // no repetir pedido
    // no repetir pedido anterior
    while (isIdentical) {
      newOrder = {
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        flavor: flavors[Math.floor(Math.random() * flavors.length)],
        icing: icings[Math.floor(Math.random() * icings.length)],
        topping: toppings[Math.floor(Math.random() * toppings.length)]
      };

      if (!State.previousOrder) {
        isIdentical = false;
      } else {
        const prev = State.previousOrder;
        if (
          newOrder.shape !== prev.shape ||
          newOrder.flavor !== prev.flavor ||
          newOrder.icing !== prev.icing ||
          newOrder.topping !== prev.topping
        ) {
          isIdentical = false;
        }
      }
    }

    State.previousOrder = newOrder;
    State.currentOrder = newOrder;
    State.orderNumber++;

    renderOrderSpecs();
    resetTimer();
  }

  function renderOrderSpecs() {
    const o = State.currentOrder;
    DOM.orderNumber.textContent = State.orderNumber;

    DOM.orderSpecShape.textContent = ATTRIBUTES.shape[o.shape];
    DOM.orderSpecFlavor.textContent = ATTRIBUTES.flavor[o.flavor];
    DOM.orderSpecIcing.textContent = ATTRIBUTES.icing[o.icing];
    DOM.orderSpecTopping.textContent = ATTRIBUTES.topping[o.topping];

    applyCakeVisualClasses(DOM.orderCakeVisual, o);
  }

  function applyCakeVisualClasses(element, cake) {
    element.className = 'cake-assembly';

    if (cake.shape) element.classList.add(`shape-${cake.shape}`);
    if (cake.flavor) element.classList.add(`flavor-${cake.flavor}`);
    if (cake.icing) {
      element.classList.add('has-icing', `icing-${cake.icing}`);
    }
    if (cake.topping) {
      element.classList.add('has-topping', `topping-${cake.topping}`);
    }
  }

  // -- armar el pastel --
  function handleOptionSelect(button) {
    if (State.isPaused || State.isEvaluating) return;

    const category = button.parentElement.dataset.category;
    const value = button.dataset.value;

    const siblingButtons = button.parentElement.querySelectorAll('.option-btn');
    siblingButtons.forEach(btn => btn.classList.remove('selected'));

    button.classList.add('selected');
    State.playerCake[category] = value;

    SoundManager.playSelect();
    renderPlayerCake();
  }

  function renderPlayerCake() {
    const cake = State.playerCake;
    applyCakeVisualClasses(DOM.playerCakeVisual, cake);

    const emptyHint = DOM.playerCakeVisual.querySelector('.empty-cake-hint');
    if (emptyHint) {
      emptyHint.style.display = cake.shape ? 'none' : 'block';
    }

    updateChipStatus(DOM.chipShape, 'Forma', cake.shape ? ATTRIBUTES.shape[cake.shape] : null);
    updateChipStatus(DOM.chipFlavor, 'Bizcocho', cake.flavor ? ATTRIBUTES.flavor[cake.flavor] : null);
    updateChipStatus(DOM.chipIcing, 'Cubierta', cake.icing ? ATTRIBUTES.icing[cake.icing] : null);
    updateChipStatus(DOM.chipTopping, 'Adorno', cake.topping ? ATTRIBUTES.topping[cake.topping] : null);
  }

  function updateChipStatus(chipElement, label, value) {
    if (value) {
      chipElement.innerHTML = `${label}: <strong>${value}</strong>`;
      chipElement.classList.add('filled');
    } else {
      chipElement.innerHTML = `${label}: <em>Vacío</em>`;
      chipElement.classList.remove('filled');
    }
  }

  function discardCurrentCake(silent = false) {
    if (State.isEvaluating) return;

    State.playerCake = {
      shape: null,
      flavor: null,
      icing: null,
      topping: null
    };

    DOM.optionButtons.forEach(btn => btn.classList.remove('selected'));
    renderPlayerCake();

    if (!silent) {
      SoundManager.playSelect();
      showToast('Pastel descartado. ¡Empieza de nuevo!', 'warning', 1800);
    }
  }

  // -- calificar entrega --
  function submitCake() {
    if (State.isPaused || State.isEvaluating) return;

    const cake = State.playerCake;
    const order = State.currentOrder;

    // revisar que no falte nada
    const missing = [];
    if (!cake.shape) missing.push('Forma');
    if (!cake.flavor) missing.push('Bizcocho');
    if (!cake.icing) missing.push('Cubierta');
    if (!cake.topping) missing.push('Adorno');

    if (missing.length > 0) {
      SoundManager.playError();
      showToast(`Falta seleccionar: ${missing.join(', ')}.`, 'danger', 3000);
      DOM.conveyorCart.classList.add('cart-shake');
      setTimeout(() => DOM.conveyorCart.classList.remove('cart-shake'), 400);
      return;
    }

    State.isEvaluating = true;

    const errors = [];
    if (cake.shape !== order.shape) errors.push('Forma');
    if (cake.flavor !== order.flavor) errors.push('Bizcocho');
    if (cake.icing !== order.icing) errors.push('Cubierta');
    if (cake.topping !== order.topping) errors.push('Adorno');

    if (errors.length === 0) {
      handleSuccess();
    } else {
      handleError(errors);
    }
  }

  function handleSuccess() {
    const timeBonus = Math.round(State.timeLeft * GAME_CONFIG.TIME_BONUS_MULT);
    const earnedPoints = GAME_CONFIG.BASE_POINTS + timeBonus;

    State.score += earnedPoints;
    State.totalCorrectCakes++;
    State.correctCakesInLevel++;

    if (State.score > State.highScore) {
      State.highScore = State.score;
      StorageManager.setHighScore(State.highScore);
    }

    updateHUD();
    SoundManager.playSuccess();

    DOM.conveyorCart.classList.add('cart-deliver');
    showFeedbackBanner('success', '¡Perfecto!', `+${earnedPoints} pts (+${timeBonus} por tiempo)`);

    setTimeout(() => {
      checkLevelUp();
      discardCurrentCake(true);
      generateNewOrder();

      DOM.conveyorCart.classList.remove('cart-deliver');
      DOM.conveyorCart.classList.add('cart-enter');

      setTimeout(() => {
        DOM.conveyorCart.classList.remove('cart-enter');
        State.isEvaluating = false;
      }, 500);
    }, 700);
  }

  function handleError(failedAttributes) {
    State.lives--;
    updateHUD();
    SoundManager.playError();

    DOM.conveyorCart.classList.add('cart-shake');
    showFeedbackBanner(
      'error',
      '¡Incorrecto!',
      `Falló en: ${failedAttributes.join(', ')} (-1 vida)`
    );

    setTimeout(() => {
      DOM.conveyorCart.classList.remove('cart-shake');

      if (State.lives <= 0) {
        gameOver();
      } else {
        State.isEvaluating = false;
      }
    }, 600);
  }

  function showFeedbackBanner(type, title, desc) {
    DOM.feedbackBanner.className = `feedback-banner ${type}`;
    DOM.feedbackIcon.innerHTML = type === 'success' 
      ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`
      : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>`;
    DOM.feedbackTitle.textContent = title;
    DOM.feedbackDesc.textContent = desc;
    DOM.feedbackBanner.classList.remove('hidden');

    setTimeout(() => {
      DOM.feedbackBanner.classList.add('hidden');
    }, 2800);
  }

  // -- timer y niveles --
  function calculateMaxTimeForLevel(lvl) {
    return GAME_CONFIG.BASE_TIMES_BY_LEVEL[lvl] || GAME_CONFIG.MIN_TIME;
  }

  function resetTimer() {
    clearInterval(State.timerInterval);
    State.maxTime = calculateMaxTimeForLevel(State.level);
    State.timeLeft = State.maxTime;
    updateTimerVisuals();

    State.timerInterval = setInterval(() => {
      if (!State.isPaused && !State.isEvaluating) {
        State.timeLeft--;
        updateTimerVisuals();

        if (State.timeLeft <= 0) {
          handleTimeOut();
        }
      }
    }, 1000);
  }

  function updateTimerVisuals() {
    DOM.timerSeconds.textContent = `${State.timeLeft}s`;
    const percentage = Math.max(0, (State.timeLeft / State.maxTime) * 100);
    DOM.timerBarFill.style.width = `${percentage}%`;

    DOM.timerBarFill.classList.remove('warning', 'danger');
    if (percentage <= 25) {
      DOM.timerBarFill.classList.add('danger');
    } else if (percentage <= 50) {
      DOM.timerBarFill.classList.add('warning');
    }
  }

  function handleTimeOut() {
    // se acabó el tiempo
    clearInterval(State.timerInterval);
    SoundManager.playError();
    State.lives--;
    updateHUD();

    showFeedbackBanner('error', '¡Tiempo agotado!', 'El cliente se fue (-1 vida)');
    showToast('¡Tiempo agotado! Pierde una vida.', 'danger', 2500);

    if (State.lives <= 0) {
      gameOver();
    } else {
      discardCurrentCake(true);
      generateNewOrder();
    }
  }

  function checkLevelUp() {
    if (State.correctCakesInLevel >= GAME_CONFIG.CAKES_PER_LVL) {
      State.level++;
      State.correctCakesInLevel = 0;
      SoundManager.playLevelUp();
      showToast(`¡Nivel ${State.level}! El tiempo será más corto.`, 'success', 3500);
      updateHUD();
    }
  }

  function updateHUD() {
    DOM.hudLevelVal.textContent = State.level;
    DOM.hudScoreVal.textContent = State.score;
    DOM.hudRecordVal.textContent = State.highScore;

    const hearts = DOM.livesContainer.querySelectorAll('.heart');
    hearts.forEach((heart, idx) => {
      if (idx < State.lives) {
        heart.classList.remove('lost');
      } else {
        heart.classList.add('lost');
      }
    });
  }

  // -- flujo del juego --
  function startNewGame() {
    clearInterval(State.timerInterval);
    State.score = 0;
    State.lives = GAME_CONFIG.INITIAL_LIVES;
    State.level = 1;
    State.correctCakesInLevel = 0;
    State.totalCorrectCakes = 0;
    State.orderNumber = 0;
    State.isPaused = false;
    State.isEvaluating = false;
    State.previousOrder = null;

    DOM.pauseModal.classList.add('hidden');
    discardCurrentCake(true);
    updateHUD();
    switchScreen('game');
    generateNewOrder();
  }

  function togglePause() {
    State.isPaused = !State.isPaused;
    if (State.isPaused) {
      DOM.pauseModal.classList.remove('hidden');
    } else {
      DOM.pauseModal.classList.add('hidden');
    }
  }

  function confirmRestart() {
    const wantsRestart = confirm('¿Reiniciar partida? Se perderá el puntaje actual.');
    if (wantsRestart) {
      startNewGame();
    }
  }

  function gameOver() {
    clearInterval(State.timerInterval);
    SoundManager.playGameOver();
    switchScreen('gameover');
  }

  // -- tema claro/oscuro --
  function initTheme() {
    const savedTheme = StorageManager.getSetting('theme', 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    StorageManager.setSetting('theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    DOM.themeIcon.innerHTML = theme === 'dark'
      ? `<svg class="svg-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
      : `<svg class="svg-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.3 2a10 10 0 0 0-1.9 19.8 10 10 0 0 0 11.5-11.5A10 10 0 0 1 12.3 2z"/></svg>`;
  }

  function updateSoundIcon() {
    DOM.soundIcon.innerHTML = SoundManager.isMuted
      ? `<svg class="svg-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h3.5l5 4c.66.53 1.5.06 1.5-.78v-4.93l4.24 4.24c-.73.57-1.55 1.01-2.45 1.28v2.06c1.44-.39 2.76-1.12 3.86-2.09L20.73 22 22 20.73 4.27 3zM12 4v3.18L7.82 11.36 12 15.54V4z"/></svg>`
      : `<svg class="svg-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5-1.23L6.5 6H3c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h3.5l5 4c.66.53 1.5.06 1.5-.78V2.78c0-.84-.84-1.31-1.5-.78zm-1 3.41v13.18L7.09 15H4V9h3.09L10.5 5.41zM14 8.78v6.44c1.17-.49 2-1.63 2-3.22s-.83-2.73-2-3.22z"/></svg>`;
  }

  // -- init --
  function bindEvents() {
    DOM.optionButtons.forEach(btn => {
      btn.addEventListener('click', () => handleOptionSelect(btn));
    });

    DOM.btnDiscardCake.addEventListener('click', () => discardCurrentCake(false));
    DOM.btnSubmitCake.addEventListener('click', submitCake);

    DOM.btnStartGame.addEventListener('click', startNewGame);
    DOM.btnPlayAgain.addEventListener('click', startNewGame);
    DOM.btnGoMenu.addEventListener('click', () => switchScreen('start'));

    DOM.btnPause.addEventListener('click', togglePause);
    DOM.btnResumeGame.addEventListener('click', togglePause);
    DOM.btnPauseMenu.addEventListener('click', () => {
      DOM.pauseModal.classList.add('hidden');
      clearInterval(State.timerInterval);
      switchScreen('start');
    });
    DOM.btnRestartGame.addEventListener('click', confirmRestart);

    DOM.btnThemeToggle.addEventListener('click', toggleTheme);
    DOM.btnSoundToggle.addEventListener('click', () => {
      SoundManager.toggleMute();
      updateSoundIcon();
    });

    window.addEventListener('keydown', (e) => {
      if (State.screen === 'game') {
        if (e.key === 'p' || e.key === 'P') {
          togglePause();
        }
      }
    });
  }

  function init() {
    initTheme();
    updateSoundIcon();
    switchScreen('start');
    bindEvents();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
