const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const LEADERBOARD_KEY = "piecePerfectLeaderboardV1";
const USER_KEY = "piecePerfectUserV1";

const state = {
  image: null, imageURL: null, size: 3, pieces: [], originalPieces: [], selected: null,
  moves: 0, hints: 3, seconds: 0, timeLimit: 30, timerId: null, paused: false, sound: true, gameOver: false,
  stream: null, capturedURL: null, cameraImageReady: false, userName: "Guest"
};

const screens = ["loginScreen","homeScreen","setupScreen","gameScreen","resultScreen"];

cleanupLeaderboardStorage();

function updateUserBadge(){
  const badge = document.getElementById("userBadge");
  const logoutBtn = document.getElementById("logoutBtn");
  const activeUser = state.userName && state.userName !== "Guest" ? state.userName : "Guest";
  if(badge) badge.textContent = activeUser;
  if(logoutBtn) logoutBtn.hidden = activeUser === "Guest";
}

function logoutUser(){
  state.userName = "Guest";
  localStorage.removeItem(USER_KEY);
  updateUserBadge();
  document.getElementById("usernameInput").value = "";
  document.getElementById("passwordInput").value = "";
  showScreen("loginScreen");
  toast("Logged out successfully.");
}

function loadSavedUser(){
  const savedUser = localStorage.getItem(USER_KEY);
  if(savedUser){
    state.userName = savedUser.trim() || "Guest";
    updateUserBadge();
    showScreen("homeScreen");
  } else {
    state.userName = "Guest";
    updateUserBadge();
    showScreen("loginScreen");
  }
}

function cleanupLeaderboardStorage(){
  try{
    const raw = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    if(!Array.isArray(raw)) return;
    const cleaned = raw
      .filter(Boolean)
      .map(entry => ({
        player: entry.player || entry.name || "Guest",
        score: Number(entry.score) || 0,
        difficulty: entry.difficulty || "Easy",
        moves: Number(entry.moves) || 0,
        time: entry.time || "00:00"
      }))
      .sort((a,b)=>b.score-a.score)
      .slice(0,5);

    if(raw.some(entry => entry && typeof entry === "object" && ("player" in entry || "name" in entry)) || JSON.stringify(raw) !== JSON.stringify(cleaned)) {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(cleaned));
    }
  }catch{}
}

function getLeaderboard(){
  try{
    const raw = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    const cleaned = Array.isArray(raw)
      ? raw
          .filter(Boolean)
          .map(entry => ({
            player: entry.player || entry.name || "Guest",
            score: Number(entry.score) || 0,
            difficulty: entry.difficulty || "Easy",
            moves: Number(entry.moves) || 0,
            time: entry.time || "00:00"
          }))
          .sort((a,b)=>b.score-a.score)
          .slice(0,5)
      : [];

    if(JSON.stringify(cleaned) !== JSON.stringify(raw || [])) {
      try{ localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(cleaned)); }catch{}
    }
    return cleaned;
  }catch{
    return [];
  }
}

function renderLeaderboard(){
  const scoreLists = ["homeLeaderboard","resultLeaderboard"];
  const leaderboard = getLeaderboard();

  scoreLists.forEach(id => {
    const list = document.getElementById(id);
    if(!list) return;
    if(!leaderboard.length){
      list.innerHTML = '<li class="leaderboard-empty">No scores yet. Finish a puzzle to set the pace.</li>';
      return;
    }

    list.innerHTML = leaderboard.map((entry,index)=>`
      <li>
        <span>#${index+1}</span>
        <strong>${entry.player || "Guest"}</strong>
        <small>${entry.score}</small>
        <small>${entry.difficulty}</small>
        <small>${entry.moves} moves • ${entry.time}</small>
      </li>
    `).join("");
  });
}

function saveScoreToLeaderboard(score){
  const entry = {
    player: state.userName && state.userName !== "Guest" ? state.userName : "Guest",
    score,
    difficulty: getDifficultyName(),
    moves: state.moves,
    time: formatTime(state.seconds)
  };
  const leaderboard = getLeaderboard();
  leaderboard.push(entry);
  leaderboard.sort((a,b)=>b.score-a.score);

  const topScores = leaderboard.slice(0,5);
  try{ localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topScores)); }catch{}
  renderLeaderboard();
}
function showScreen(id){
  screens.forEach(x=>$("#"+x).classList.toggle("active",x===id));
  document.body.classList.toggle("game-playing", id === "gameScreen");
  window.scrollTo({top:0,behavior:"smooth"});
}
function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>t.classList.remove("show"),2200);
}
function beep(freq=520,duration=.07){
  if(!state.sound) return;
  try{
    const C=window.AudioContext||window.webkitAudioContext, c=new C(),o=c.createOscillator(),g=c.createGain();
    o.frequency.value=freq;o.type="sine";g.gain.value=.035;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration);
  }catch(e){}
}
function formatTime(sec){return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function startTimer(){
  clearInterval(state.timerId);
  state.timerId=setInterval(()=>{
    if(state.paused || state.gameOver) return;
    state.seconds--;
    $("#timer").textContent=formatTime(Math.max(0,state.seconds));
    updateTimerWarning();
    if(state.seconds<=0){
      state.seconds=0;
      $("#timer").textContent="00:00";
      timeUp();
    }
  },1000);
}
function stopTimer(){clearInterval(state.timerId);state.timerId=null}
function updateTimerWarning(){
  const timer=$("#timer");
  timer.classList.remove("warning","danger");
  if(state.seconds<=10) timer.classList.add("danger");
  else if(state.seconds<=20) timer.classList.add("warning");
}
function timeUp(){
  if(state.gameOver) return;
  state.gameOver=true;
  stopTimer();
  $("#timeoutTitle").textContent="Time's Up! ⏰";
  $("#timeoutMessage").textContent="The time limit ended before the puzzle was completed.";
  $("#timeoutImage").src=state.imageURL;
  $("#timeoutModal").classList.add("open");
  beep(180,.3);
}
function updateStats(){
  $("#moves").textContent=state.moves;$("#hints").textContent=state.hints;
  $("#pieceCount").textContent=state.size*state.size;$("#timer").textContent=formatTime(state.seconds);
}
function getDifficultyName(){return ({3:"Easy",4:"Medium",5:"Hard",6:"Expert"})[state.size]}
function getTimeLimit(){return ({3:30,4:45,5:60,6:90})[state.size]}

$("#loginForm").onsubmit=e=>{
  e.preventDefault();
  const username = $("#usernameInput").value.trim();
  const password = $("#passwordInput").value.trim();
  if(!username){toast("Please enter a username.");return}
  if(!password){toast("Please enter a password.");return}
  state.userName=username;
  localStorage.setItem(USER_KEY, username);
  updateUserBadge();
  $("#passwordInput").value="";
  $("#usernameInput").value=username;
  showScreen("homeScreen");
  toast(`Welcome, ${username}!`);
};
$("#togglePassword").onclick=()=>{
  const input = $("#passwordInput");
  const btn = $("#togglePassword");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "Hide" : "Show";
  btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
};
$("#logoutBtn").onclick=()=>logoutUser();
$("#startBtn").onclick=()=>showScreen("setupScreen");
$("#howBtn").onclick=()=>$("#howModal").classList.add("open");
$("#closeHow").onclick=()=>$("#howModal").classList.remove("open");
$("#uploadBtn").onclick=()=>$("#fileInput").click();
$("#fileInput").onchange=e=>{const f=e.target.files?.[0];if(f) loadImageFile(f)};
$("#removeImage").onclick=()=>clearImage();
$("#beginBtn").onclick=()=>startGame();
$$(".difficulty").forEach(btn=>btn.onclick=()=>{
  $$(".difficulty").forEach(x=>x.classList.remove("selected"));btn.classList.add("selected");
  state.size=+btn.dataset.size;
});
$$(".back-btn").forEach(b=>b.onclick=()=>showScreen(b.dataset.target));
$("#changeImageBtn").onclick=()=>{stopTimer();showScreen("setupScreen")};
$("#newImageBtn").onclick=()=>{stopTimer();showScreen("setupScreen")};
$("#homeBtn").onclick=()=>{stopTimer();showScreen("homeScreen")};
$("#againBtn").onclick=()=>startGame();
$("#shuffleBtn").onclick=()=>{shufflePieces();toast("Puzzle shuffled");beep(380)};
$("#restartBtn").onclick=()=>restartGame();
$("#hintBtn").onclick=()=>useHint();
$("#pauseBtn").onclick=()=>pauseGame();
$("#resumeBtn").onclick=()=>resumeGame();
$("#quitBtn").onclick=()=>{stopTimer();state.gameOver=true;$("#pauseModal").classList.remove("open");showScreen("setupScreen")};
$("#retryTimeoutBtn").onclick=()=>{ $("#timeoutModal").classList.remove("open"); startGame(); };
$("#timeoutNewImageBtn").onclick=()=>{ $("#timeoutModal").classList.remove("open"); showScreen("setupScreen"); };

$("#previewBtn").onclick=()=>{if(state.imageURL){$("#previewModalImage").src=state.imageURL;$("#previewModal").classList.add("open")}};
$("#closePreview").onclick=()=>$("#previewModal").classList.remove("open");
$("#soundBtn").onclick=()=>{state.sound=!state.sound;$("#soundBtn").textContent=state.sound?"🔊":"🔇";if(state.sound)beep()};

function loadImageFile(file){
  const supportedTypes = ["image/jpeg","image/png","image/webp","image/gif","image/bmp","image/x-ms-bmp","image/heic","image/heif"];
  const isSupported = file.type ? supportedTypes.includes(file.type) || file.type.startsWith("image/") : true;
  if(!isSupported || file.type === "image/svg+xml"){toast("Please choose a JPG, PNG, WEBP, GIF, BMP, or another common image format.");return}
  if(file.size>12*1024*1024){toast("Image is too large. Please use an image under 12 MB.");return}
  const reader=new FileReader();
  reader.onload=e=>setImage(e.target.result);
  reader.readAsDataURL(file);
}
function setImage(src){
  const img=new Image();
  img.onload=()=>{
    state.image=img;
    if(state.imageURL && state.imageURL.startsWith("blob:")) URL.revokeObjectURL(state.imageURL);
    state.imageURL=src;
    $("#previewImage").src=src;$("#previewWrap").classList.remove("empty");$("#removeImage").hidden=false;$("#beginBtn").disabled=false;
    toast("Image ready! Choose a difficulty.");
  };
  img.onerror=()=>toast("Could not read that image.");
  img.src=src;
}
function clearImage(){
  state.image=null;state.imageURL=null;$("#previewImage").removeAttribute("src");$("#previewWrap").classList.add("empty");$("#removeImage").hidden=true;$("#beginBtn").disabled=true;$("#fileInput").value="";
}

$("#cameraBtn").onclick=async()=>{
  $("#cameraModal").classList.add("open");$("#cameraError").hidden=true;$("#captureBtn").hidden=false;$("#retakeBtn").hidden=true;$("#usePhotoBtn").hidden=true;
  try{
    state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
    $("#cameraVideo").srcObject=state.stream;
  }catch(err){
    $("#cameraError").textContent="Camera access was unavailable. Please allow camera permission and try again. If you opened the file directly, run the project through localhost/HTTPS.";
    $("#cameraError").hidden=false;
  }
};
function stopCamera(){if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null}$("#cameraVideo").srcObject=null}
$("#closeCamera").onclick=()=>{stopCamera();$("#cameraModal").classList.remove("open")};
$("#captureBtn").onclick=()=>{
  const v=$("#cameraVideo"),c=$("#cameraCanvas");c.width=v.videoWidth||1280;c.height=v.videoHeight||720;
  const ctx=c.getContext("2d");ctx.drawImage(v,0,0,c.width,c.height);
  state.capturedURL=c.toDataURL("image/jpeg",.92);$("#cameraVideo").style.display="none";$("#captureBtn").hidden=true;$("#retakeBtn").hidden=false;$("#usePhotoBtn").hidden=false;$("#cameraError").hidden=true;beep(650,.12);
};
$("#retakeBtn").onclick=()=>{$("#cameraVideo").style.display="block";$("#captureBtn").hidden=false;$("#retakeBtn").hidden=true;$("#usePhotoBtn").hidden=true};
$("#usePhotoBtn").onclick=()=>{setImage(state.capturedURL);stopCamera();$("#cameraModal").classList.remove("open");$("#cameraVideo").style.display="block"};

function makeCanvasPiece(r,c,size){
  const src=state.image;
  const canvas=document.createElement("canvas"), ctx=canvas.getContext("2d");
  const max=1200, ratio=src.width/src.height;
  let w,h;
  if(ratio>=1){w=max;h=Math.round(max/ratio)}else{h=max;w=Math.round(max*ratio)}
  canvas.width=w;canvas.height=h;
  ctx.drawImage(src,0,0,w,h);
  const pw=w/size,ph=h/size;
  const out=document.createElement("canvas");out.width=Math.ceil(pw);out.height=Math.ceil(ph);
  out.getContext("2d").drawImage(canvas,c*pw,r*ph,pw,ph,0,0,out.width,out.height);
  return out.toDataURL("image/jpeg",.9);
}
function startGame(){
  if(!state.image){toast("Choose an image first.");return}
  state.moves=0;state.hints=3;state.timeLimit=getTimeLimit();state.seconds=state.timeLimit;state.paused=false;state.gameOver=false;
  $("#gameTitle").textContent=getDifficultyName()+" Puzzle";updateStats();
  buildPieces();showScreen("gameScreen");startTimer();updateTimerWarning();beep(520);
}
function buildPieces(){
  const n=state.size;state.pieces=[];state.originalPieces=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const id=r*n+c;const data=makeCanvasPiece(r,c,n);
    const p={id,correct:id,data,current:id};
    state.pieces.push(p);state.originalPieces.push({...p});
  }
  shufflePieces(true);renderBoard();
}
function shufflePieces(initial=false){
  const arr=[...state.originalPieces];
  // Fisher-Yates with guaranteed non-solved arrangement
  do{
    for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}
  }while(arr.every((p,i)=>p.correct===i) && arr.length>1);
  state.pieces=arr.map((p,i)=>({...p,current:i}));
  if(!initial)renderBoard();
}
function renderBoard(){
  const board=$("#puzzleBoard");board.innerHTML="";board.style.gridTemplateColumns=`repeat(${state.size},1fr)`;
  state.pieces.forEach((p,index)=>{
    const el=document.createElement("div");el.className="piece";el.draggable=true;el.dataset.index=index;el.dataset.id=p.id;
    el.style.backgroundImage=`url("${p.data}")`;el.style.backgroundSize=`${state.size*100}% ${state.size*100}%`;
    const row=Math.floor(p.correct/state.size),col=p.correct%state.size;
    el.style.backgroundPosition=`${col*(100/(state.size-1))}% ${row*(100/(state.size-1))}%`;
    // Each piece is its own cropped image, so full background is appropriate.
    el.style.backgroundSize="100% 100%";el.style.backgroundPosition="center";
    addDragEvents(el,index);
    board.appendChild(el);
  });
}
function addDragEvents(el,index){
  el.addEventListener("dragstart",e=>{state.selected=index;el.classList.add("dragging");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(index));});
  el.addEventListener("dragend",()=>el.classList.remove("dragging"));
  el.addEventListener("dragover",e=>{e.preventDefault();el.classList.add("target")});
  el.addEventListener("dragleave",()=>el.classList.remove("target"));
  el.addEventListener("drop",e=>{e.preventDefault();el.classList.remove("target");const from=+e.dataTransfer.getData("text/plain");swapPieces(from,index)});
  // Pointer-based mobile drag
  el.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse")return;
    state.selected=index;el.classList.add("dragging");el.setPointerCapture(e.pointerId);
    const move=ev=>{
      const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest(".piece");
      $$(".piece").forEach(x=>x.classList.remove("target"));
      if(target&&target!==el)target.classList.add("target");
    };
    const up=ev=>{
      el.classList.remove("dragging");$$(".piece").forEach(x=>x.classList.remove("target"));
      const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest(".piece");
      if(target&&target!==el)swapPieces(index,+target.dataset.index);
      el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",up);
    };
    el.addEventListener("pointermove",move);el.addEventListener("pointerup",up,{once:true});
  });
}
function swapPieces(a,b){
  if(state.gameOver || state.seconds<=0 || a===b)return;
  [state.pieces[a],state.pieces[b]]=[state.pieces[b],state.pieces[a]];
  state.pieces[a].current=a;state.pieces[b].current=b;state.moves++;updateStats();renderBoard();beep(460);
  if(isSolved())finishGame();
}
function isSolved(){return state.pieces.every((p,i)=>p.correct===i)}
function useHint(){
  if(state.gameOver){return}
  if(state.hints<=0){toast("No hints left.");return}
  const wrong=state.pieces.findIndex((p,i)=>p.correct!==i);
  if(wrong<0)return;
  const correctIndex=state.pieces.findIndex(p=>p.correct===wrong);
  if(correctIndex>=0){[state.pieces[wrong],state.pieces[correctIndex]]=[state.pieces[correctIndex],state.pieces[wrong]];state.pieces[wrong].current=wrong;state.pieces[correctIndex].current=correctIndex}
  state.hints--;state.moves++;updateStats();renderBoard();toast("Hint placed one correct piece.");beep(760,.1);
  if(isSolved())finishGame();
}
function restartGame(){
  state.moves=0;state.timeLimit=getTimeLimit();state.seconds=state.timeLimit;state.hints=3;state.paused=false;state.gameOver=false;
  $("#pauseModal").classList.remove("open");shufflePieces();updateStats();updateTimerWarning();startTimer();toast("Puzzle restarted");
}
function pauseGame(){if(state.gameOver)return;state.paused=true;$("#pauseModal").classList.add("open")}
function resumeGame(){state.paused=false;$("#pauseModal").classList.remove("open")}
function finishGame(){
  if(state.gameOver)return;
  state.gameOver=true;
  stopTimer();state.paused=false;const base={3:1000,4:1800,5:3000,6:5000}[state.size];
  const timeBonus=Math.max(0,Math.round((300-state.seconds)*3));const movePenalty=Math.max(0,(state.moves-state.size*state.size)*8);const hintPenalty=(3-state.hints)*80;
  const score=Math.max(100,base+timeBonus-movePenalty-hintPenalty);
  $("#finalTime").textContent=formatTime(state.seconds);$("#finalMoves").textContent=state.moves;$("#finalScore").textContent=score;
  $("#resultImage").src=state.imageURL;saveScoreToLeaderboard(score);showScreen("resultScreen");beep(880,.2);setTimeout(()=>beep(1040,.25),130);confetti();
}
function confetti(){
  for(let i=0;i<55;i++){const d=document.createElement("i");d.style.position="fixed";d.style.left=(50+Math.random()*20-10)+"%";d.style.top="20%";d.style.width="7px";d.style.height="12px";d.style.background=`hsl(${Math.random()*360},85%,65%)`;d.style.zIndex=60;d.style.borderRadius="2px";document.body.appendChild(d);const x=(Math.random()*2-1)*420,y=window.innerHeight*(.7+Math.random()*.5),rot=Math.random()*900-450;d.animate([{transform:"translate(0,0) rotate(0deg)",opacity:1},{transform:`translate(${x}px,${y}px) rotate(${rot}deg)`,opacity:0}],{duration:1200+Math.random()*1100,easing:"cubic-bezier(.1,.8,.2,1)"}).onfinish=()=>d.remove()}
}

// Close modals by clicking backdrop
["howModal","previewModal","cameraModal"].forEach(id=>$("#"+id).addEventListener("click",e=>{if(e.target.id===id){if(id==="cameraModal")stopCamera();$("#"+id).classList.remove("open")}}));

// Keyboard shortcut: H for hint, Space for pause
document.addEventListener("keydown",e=>{
  if(!$("#gameScreen").classList.contains("active"))return;
  if(e.key.toLowerCase()==="h")useHint();
  if(e.code==="Space"){e.preventDefault();if(!state.gameOver)state.paused?resumeGame():pauseGame()}
});
