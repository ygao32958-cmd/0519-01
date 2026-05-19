let hands;
let detections = null;
let capture;
let gameState = 'WAITING'; // WAITING, COUNTDOWN, RESULT, ENDED
let countdownValue = 3;
let lastStateChange = 0;
let playerChoice = '';
let computerChoice = '';
let resultMsg = '';
let gestureHoldTime = 0;
let playerScore = 0;
let computerScore = 0;

// 手勢股架連結定義 (MediaPipe 節點索引)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // 拇指
  [0, 5], [5, 6], [6, 7], [7, 8], // 食指
  [5, 9], [9, 10], [10, 11], [11, 12], // 中指
  [9, 13], [13, 14], [14, 15], [15, 16], // 無名指
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17] // 小指與手掌底
];

let moveImages = {};

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 載入 SVG 圖片資源 (使用 Data URL 確保免外部檔案即可顯示)
  moveImages['石頭'] = loadImage('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyLDIuNUM2Ljg0LDIuNSwyLjUsNi44NCwyLjUsMTJTNi44NCwyMS41LDEyLDIxLjVTMjEuNSwxNy4xNiwyMS41LDEyUzE3LjE2LDIuNSwxMiwyLjVNMTEsMTZIOVYxNEg3VjEySDlWMTBIMTFWMTJIMTNWMTBIMTVWMTJIMTdWMTRIMTVWMTZIMTNaIiBmaWxsPSIjNDQ0Ii8+PC9zdmc+');
  moveImages['剪刀'] = loadImage('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTE5LDNMMTMsOUwxMSw3TDIyLDNMMTksM00xMiwxM0w5LDE2SDRWMTlINkw5LDE2SDEyVjEzTTExLDE0TDcsMThIM1YyMUg1TDksMThIMTFWMTRaIiBmaWxsPSIjNDQ0Ii8+PC9zdmc+');
  moveImages['布'] = loadImage('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTgsM0g5VjhIOFYzTTExLDNIMTJWOEgzVjExTTUuNSwyMUMzLjU3LDIxLDIsMTkuNDMsMiwxNy41VjhoMlYxNy41YzAsMC44MywwLjY3LDEuNSwxLjUsMS41czEuNS0wLjY3LDEuNS0xLjVWN2gydjEwLjVjMCwxLjkzLTEuNTcsMy41LTMuNSwzLjVaIiBmaWxsPSIjNDQ0Ii8+PC9zdmc+');

  // 初始化 MediaPipe Hands
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults((results) => {
    detections = results;
  });

  // 設定攝影機 (配合 p5.js)
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide();

  const camera = new Camera(capture.elt, {
    onFrame: async () => {
      await hands.send({ image: capture.elt });
    },
    width: 640,
    height: 480
  });
  camera.start();

  textAlign(CENTER, CENTER);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(30);

  // 繪製攝影機畫面 (鏡像處理)，直接使用 capture 確保畫面能即時顯示，不會因為等待 AI 而黑屏
  if (capture) {
    push();
    translate(width, 0);
    scale(-1, 1);
    image(capture, 0, 0, width, height);
    pop();
  }

  let currentGesture = 'NONE';
  if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length > 0) {
    currentGesture = getGesture(detections.multiHandLandmarks[0]);
  }

  if (gameState === 'WAITING') {
    push();
    fill(0, 180);
    rect(0, 0, width, height);
    fill(255);
    textSize(60);
    text("猜拳遊戲", width / 2, height * 0.3);
    
    let startProgress = constrain((millis() - gestureHoldTime) / 1000, 0, 1);
    drawMenuButton("☝️ 食指：開始遊戲", width / 2, height * 0.6, currentGesture === 'CONTINUE', startProgress);

    if (currentGesture === 'CONTINUE') {
      if (millis() - gestureHoldTime > 1000) startCountdown();
    } else {
      gestureHoldTime = millis();
    }
    pop();
  } else if (gameState === 'COUNTDOWN') {
    let elapsed = millis() - lastStateChange;
    if (elapsed < 3000) {
      countdownValue = 3 - floor(elapsed / 1000);
      fill(255, 204, 0);
      textSize(150);
      text(countdownValue, width / 2, height / 2);
    } else {
      playRound(currentGesture);
    }
  } else if (gameState === 'RESULT') {
    drawUI(currentGesture);
  } else if (gameState === 'ENDED') {
    fill(0, 150);
    rect(0, 0, width, height);
    fill(255);
    textSize(48);
    text("遊戲結束\n謝謝遊玩", width / 2, height / 2);
  }

  // 只要遊戲沒真正結束，就顯示記分板
  if (gameState !== 'ENDED') {
    drawScoreboard();
  }
}

function drawScoreboard() {
  push();
  rectMode(CENTER);
  noStroke();
  fill(0, 120); // 半透明黑色背景
  rect(width / 2, 50, 350, 70, 15);
  
  fill(255, 204, 0); // 金黃色文字
  textSize(32);
  text(`玩家: ${playerScore}  |  電腦: ${computerScore}`, width / 2, 45);
  pop();
}

function startCountdown() {
  gameState = 'COUNTDOWN';
  lastStateChange = millis();
}

function playRound(gesture) {
  const options = ['石頭', '剪刀', '布'];
  computerChoice = options[floor(random(3))];
  playerChoice = (gesture === 'UNKNOWN' || gesture === 'NONE') ? '石頭' : gesture;

  if (playerChoice === computerChoice) {
    resultMsg = "平手！";
  }
  else if ((playerChoice === '石頭' && computerChoice === '剪刀') ||
           (playerChoice === '剪刀' && computerChoice === '布') ||
           (playerChoice === '布' && computerChoice === '石頭')) {
    resultMsg = "你贏了！✨";
    playerScore++; // 玩家得分
  }
  else {
    resultMsg = "你輸了...💀";
    computerScore++; // 電腦得分
  }

  gameState = 'RESULT';
}

function drawUI(gesture) {
  // 1. 背景全屏半透明遮罩
  push();
  rectMode(CORNER);
  noStroke();
  fill(0, 180);
  rect(0, 0, width, height);
  pop();
  
  // 2. 顯示對戰結果 (大字體 + 顏色區分)
  push();
  if (resultMsg.includes("贏")) fill(46, 204, 113); // 綠色
  else if (resultMsg.includes("輸")) fill(231, 76, 60); // 紅色
  else fill(255, 204, 0); // 黃色 (平手)
  
  textSize(80);
  text(resultMsg, width / 2, height * 0.15);
  pop();

  // 3. 繪製玩家與電腦的出拳卡片
  drawChoiceCard("玩家 (你)", playerChoice, width / 2 - 220, height * 0.45);
  drawChoiceCard("電腦 (AI)", computerChoice, width / 2 + 220, height * 0.45);

  push();
  textSize(60);
  fill(255, 204, 0);
  text("VS", width / 2, height * 0.45 + 40);
  pop();

  // 4. 下方選單按鈕與進度條
  let choiceProgress = constrain((millis() - gestureHoldTime) / 1000, 0, 1);

  drawMenuButton("☝️ 食指：繼續", width / 2 - 200, height * 0.85, gesture === 'CONTINUE', choiceProgress);
  drawMenuButton("👍 拇指：結束", width / 2 + 200, height * 0.85, gesture === 'EXIT', choiceProgress);

  // 5. 判斷選單選擇 (需停留 1 秒)
  if (gesture === 'CONTINUE' || gesture === 'EXIT') {
    if (millis() - gestureHoldTime > 1000) {
      if (gesture === 'CONTINUE') startCountdown();
      else gameState = 'ENDED';
    }
  } else {
    gestureHoldTime = millis();
  }
}

function drawMenuButton(label, x, y, isSelected, progress) {
  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  
  // 按鈕背景框
  stroke(255);
  strokeWeight(2);
  if (isSelected) {
    fill(255, 100);
  } else {
    fill(0, 100);
  }
  rect(x, y, 280, 70, 15);
  
  // 被選中時的綠色進度條
  if (isSelected) {
    noStroke();
    fill(46, 204, 113, 200);
    rectMode(CORNER);
    // 進度條長度隨時間增加
    rect(x - 140, y + 25, 280 * progress, 8, 0, 0, 5, 5);
  }

  // 按鈕文字
  noStroke();
  fill(255);
  textSize(28);
  text(label, x, y);
  pop();
}

function drawChoiceCard(label, move, x, y, isPlayer, hasGlow) {
  push();
  // 卡片背景
  rectMode(CENTER);
  noStroke();
  fill(0, 100); // 框框底色
  rect(x, y + 40, 300, 420, 25);

  // 如果是玩家卡片，畫入攝影機畫面
  if (isPlayer && capture) {
    push();
    // 1. 建立圓角剪裁路徑 (讓攝影機畫面符合框框形狀)
    translate(x, y + 40);
    drawingContext.beginPath();
    // roundRect 是原生畫布 API
    drawingContext.roundRect(-150, -210, 300, 420, 25);
    drawingContext.clip();

    // 2. 繪製攝影機影像 (Cover 填充模式並鏡像)
    scale(-1, 1); // 鏡像
    let s = max(300 / capture.width, 420 / capture.height);
    imageMode(CENTER);
    image(capture, 0, 0, capture.width * s, capture.height * s);

    // 3. 繪製手勢股架 (只在有偵測到手時)
    if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length > 0) {
      let landmarks = detections.multiHandLandmarks[0];
      let handedness = detections.multiHandedness[0].label; // "Left" or "Right"
      let vw = capture.width * s;
      let vh = capture.height * s;

      // 設定顏色：根據左右手區分 (與你的 ml5 範例邏輯一致)
      // 註：MediaPipe 的 Left/Right 是以人的視角，且攝影機有鏡像，所以會根據畫面呈現調整
      if (handedness === "Left") stroke(255, 0, 255); // 左手：桃紅
      else stroke(255, 255, 0); // 右手：黃色

      strokeWeight(4);
      noFill();

      // 畫線 (骨頭)
      for (const edge of HAND_CONNECTIONS) {
        let start = landmarks[edge[0]];
        let end = landmarks[edge[1]];
        line((start.x - 0.5) * vw, (start.y - 0.5) * vh, (end.x - 0.5) * vw, (end.y - 0.5) * vh);
      }

      // 畫點 (關節)
      fill(255);
      noStroke();
      for (let pt of landmarks) {
        circle((pt.x - 0.5) * vw, (pt.y - 0.5) * vh, 8);
      }
    }
    pop();

    // 覆蓋一層淡淡的黑色，讓文字和圖標更明顯
    fill(0, 50);
    rect(x, y + 40, 300, 420, 25);
  }

  // 如果獲勝，加上金色光芒特效
  if (hasGlow) {
    push();
    drawingContext.shadowBlur = 50; // 光芒範圍
    drawingContext.shadowColor = 'gold'; // 光芒顏色
    stroke(255, 215, 0); // 金色邊框
    strokeWeight(8);
    noFill();
    rect(x, y + 40, 300, 420, 25);
    pop();
  }

  // 繪製卡片邊框
  else stroke(255, 150);
  
  strokeWeight(3);
  noFill();
  rect(x, y + 40, 300, 420, 25);
  
  // 文字標籤
  noStroke();
  fill(255);
  textSize(36);
  text(label, x, y - 120);
  
  // 繪製圖片
  imageMode(CENTER);
  if (moveImages[move]) {
    image(moveImages[move], x, y + 40, 240, 240);
  }
  pop();
}

function getGesture(landmarks) {
  const upCount = [8, 12, 16, 20].filter(i => landmarks[i].y < landmarks[i - 2].y).length;
  const isThumbUp = landmarks[4].y < landmarks[2].y;
  const isIndexUp = landmarks[8].y < landmarks[6].y;

  if (gameState === 'RESULT' || gameState === 'WAITING') {
    if (isThumbUp && upCount === 0) return 'EXIT';
    if (isIndexUp && upCount === 1) return 'CONTINUE';
  }
  if (upCount >= 4) return '布';
  if (upCount === 2 && isIndexUp && landmarks[12].y < landmarks[10].y) return '剪刀';
  if (upCount === 0) return '石頭';
  return 'UNKNOWN';
}
