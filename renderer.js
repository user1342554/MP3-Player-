// ===== DOM ELEMENTS =====
// Audio and controls
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const stopBtn = document.getElementById('stopBtn');
const trackTitle = document.getElementById('trackTitle');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const volumeSlider = document.getElementById('volumeSlider');

// UI controls
const playlistBtn = document.getElementById('playlistBtn');
const visualizerBtn = document.getElementById('visualizerBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const fileInput = document.getElementById('fileInput');

// Visualizer
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

// ===== VARIABLES =====
let playlist = [];
let currentIndex = -1;
let visualizerType = 0; // 0 = bars, 1 = waves, 2 = flame, 3 = xbox, 4 = plasma, 5 = particles, 6 = orbit
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationId = null;
let isDragging = false;

// Visualizer-specific variables
let particles = [];
let orbits = [];
let hue = 0;
let lastTime = Date.now();
let bass = 0;
let mid = 0;
let treble = 0;
let avgEnergy = 0;
let lastTimeBeat = 0;
let beatThreshold = 0.4; // Lower threshold for more chill beats
let beatDecay = 0.98;
let beatHoldTime = 300; // Longer hold time for smoother transitions

// ===== INITIALIZATION =====
// Set up canvas
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientHeight;

// Make window draggable
makePlayerDraggable();

// ===== EVENT LISTENERS =====

// Add this at the beginning of your renderer.js file with the other event listeners

// Handle files opened from Explorer or default app association
if (window.electronAPI) {
  window.electronAPI.onFileOpen((filePath) => {
    console.log("File opened from system:", filePath);
    addFileToPlaylist(filePath);
  });
}

// Add this function to your renderer.js file
function addFileToPlaylist(filePath) {
  // Extract file name from path
  const fileName = filePath.split('\\').pop().split('/').pop();
  
  // Add the file to playlist
  playlist.push({
    name: fileName,
    path: filePath
  });
  
  console.log(`Added to playlist: ${fileName}`);
  
  // If nothing is playing, start this track
  if (audioPlayer.paused) {
    currentIndex = playlist.length - 1;
    loadTrack(currentIndex);
    audioPlayer.play()
      .then(() => {
        playPauseBtn.textContent = "⏸";
        initializeVisualizer();
      })
      .catch(err => console.error("Error playing track:", err));
  }
}

// Window controls
minimizeBtn.addEventListener('click', () => {
  console.log("Minimize clicked");
  try {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    } else {
      // Direct IPC method as fallback
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('window-minimize');
    }
  } catch (error) {
    console.error("Error minimizing window:", error);
  }
});

closeBtn.addEventListener('click', () => {
  console.log("Close clicked");
  try {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    } else {
      // Direct IPC method as fallback
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('window-close');
    }
  } catch (error) {
    console.error("Error closing window:", error);
  }
});

// PLAY/PAUSE BUTTON
playPauseBtn.addEventListener('click', function() {
  console.log("Play/Pause clicked");
  
  if (playlist.length === 0) {
    // Open file selector if no tracks
    fileInput.click();
    return;
  }
  
  if (audioPlayer.paused) {
    // Play
    audioPlayer.play()
      .then(() => {
        console.log("Started playback");
        playPauseBtn.textContent = "⏸";
        // Initialize or resume the visualizer
        if (!audioContext) {
          initializeVisualizer();
        } else {
          startVisualizer(); // Just restart visualization if already initialized
        }
      })
      .catch(err => {
        console.error("Error playing:", err);
      });
  } else {
    // Pause
    audioPlayer.pause();
    console.log("Paused playback");
    playPauseBtn.textContent = "▶";
    stopVisualizer();
  }
});

// STOP BUTTON
stopBtn.addEventListener('click', function() {
  console.log("Stop clicked");
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  playPauseBtn.textContent = "▶";
  stopVisualizer();
  console.log("Playback stopped");
});

// Other controls
playlistBtn.addEventListener('click', () => fileInput.click());
visualizerBtn.addEventListener('click', changeVisualizer);
volumeSlider.addEventListener('input', () => {
  audioPlayer.volume = volumeSlider.value;
});
progressContainer.addEventListener('click', seekToPosition);
fileInput.addEventListener('change', handleFileSelect);

// Audio events
audioPlayer.addEventListener('timeupdate', updateProgress);
audioPlayer.addEventListener('ended', () => {
  // When a track ends, go to the next track if available
  if (playlist.length > 0) {
    currentIndex = (currentIndex + 1) % playlist.length;
    loadTrack(currentIndex);
    audioPlayer.play()
      .then(() => {
        playPauseBtn.textContent = "⏸";
      })
      .catch(err => console.error("Error playing next track:", err));
  }
});

// Window resize event
window.addEventListener('resize', () => {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
});

// ===== FUNCTIONS =====

// Make the player window draggable
function makePlayerDraggable() {
  const container = document.querySelector('.player-container');
  let offsetX, offsetY;
  
  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('button, input') || e.target.closest('.progress-container')) return;
    
    isDragging = true;
    offsetX = e.clientX;
    offsetY = e.clientY;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - offsetX;
    const dy = e.clientY - offsetY;
    
    try {
      if (window.electronAPI) {
        window.electronAPI.sendWindowDrag({ dx, dy });
      } else {
        // Direct IPC method as fallback
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('window-drag', { dx, dy });
      }
    } catch (error) {
      console.error("Error during window drag:", error);
    }
    
    offsetX = e.clientX;
    offsetY = e.clientY;
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

// Load a track at the given index and update display
function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  
  const track = playlist[index];
  currentIndex = index;
  
  // Set the audio source
  audioPlayer.src = track.path;
  
  // Update the display
  trackTitle.textContent = track.name;
}

// Handle file selection from input
function handleFileSelect(event) {
  const files = event.target.files;
  if (!files.length) return;
  
  console.log(`Selected ${files.length} files`);
  
  // Add files to playlist
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type.startsWith('audio/')) {
      playlist.push({
        name: file.name,
        path: URL.createObjectURL(file)
      });
      console.log(`Added to playlist: ${file.name}`);
    }
  }
  
  // If nothing is playing, start the first track
  if (audioPlayer.paused && playlist.length > 0) {
    if (currentIndex === -1) {
      currentIndex = 0;
    }
    
    loadTrack(currentIndex);
    audioPlayer.play()
      .then(() => {
        playPauseBtn.textContent = "⏸";
        initializeVisualizer();
      })
      .catch(err => console.error("Error playing track:", err));
  }
}

// Update progress bar based on current playback position
function updateProgress() {
  if (!audioPlayer.duration) return;
  
  const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  progressBar.style.width = `${percent}%`;
}

// Seek to position when progress bar is clicked
function seekToPosition(event) {
  if (!audioPlayer.duration) return;
  
  const rect = progressContainer.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  audioPlayer.currentTime = percent * audioPlayer.duration;
}

function changeVisualizer() {
  visualizerType = (visualizerType + 1) % 7;
  console.log(`Changed visualizer type to: ${visualizerType}`);
  
  // Show notification
  const types = ["Bars", "Wave", "Flame", "Xbox", "Plasma", "Particles", "Orbit"];
  const originalText = trackTitle.textContent;
  trackTitle.textContent = `Visualizer: ${types[visualizerType]}`;
  
  // Reset any visualizer-specific variables
  particles = [];
  orbits = [];
  hue = 0;
  
  setTimeout(() => {
    trackTitle.textContent = originalText;
  }, 2000);
}

function initializeVisualizer() {
  if (audioContext) {
    // If already initialized, just resume the AudioContext if it's suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log("AudioContext resumed");
        startVisualizer();
      });
    } else {
      startVisualizer();
    }
    return;
  }
  
  try {
    // Create audio context and analyzer
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    
    // Connect audio element to analyzer
    const source = audioContext.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // Configure analyzer with balanced sensitivity
    analyser.fftSize = 512; 
    analyser.smoothingTimeConstant = 0.7; // Higher for smoother transitions (default is 0.8)
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    console.log("Audio analyzer initialized");
    startVisualizer();
    
  } catch (error) {
    console.error("Error initializing audio analyzer:", error);
  }
}

// Function to analyze audio for frequency bands (bass, mid, treble)
function analyzeAudio() {
  if (!analyser) return;
  
  analyser.getByteFrequencyData(dataArray);
  
  // Calculate bass, mid, and treble levels
  const bins = dataArray.length;
  
  // Define frequency ranges (bass: 0-10%, mid: 10-30%, treble: 30-60%)
  const bassRange = Math.floor(bins * 0.1);
  const midRange = Math.floor(bins * 0.3);
  const trebleRange = Math.floor(bins * 0.6);
  
  let bassSum = 0;
  let midSum = 0;
  let trebleSum = 0;
  let totalSum = 0;
  
  // Calculate sums for each range
  for (let i = 0; i < bassRange; i++) {
    bassSum += dataArray[i];
  }
  
  for (let i = bassRange; i < midRange; i++) {
    midSum += dataArray[i];
  }
  
  for (let i = midRange; i < trebleRange; i++) {
    trebleSum += dataArray[i];
  }
  
  for (let i = 0; i < dataArray.length; i++) {
    totalSum += dataArray[i];
  }
  
  // Normalize values (0-1 range) with more balanced scaling
  bass = Math.pow(bassSum / (bassRange * 255), 1.5) * 1.8; // More moderate scaling
  mid = Math.pow(midSum / ((midRange - bassRange) * 255), 1.5) * 1.8;
  treble = Math.pow(trebleSum / ((trebleRange - midRange) * 255), 1.5) * 1.8;
  avgEnergy = Math.pow(totalSum / (dataArray.length * 255), 1.5) * 1.8;
  
  // Clamp values to 0-1 range
  bass = Math.min(1, bass);
  mid = Math.min(1, mid);
  treble = Math.min(1, treble);
  avgEnergy = Math.min(1, avgEnergy);
  
  // Beat detection (mostly using bass)
  const now = Date.now();
  if (bass > beatThreshold && now - lastTimeBeat > beatHoldTime) {
    lastTimeBeat = now;
    return true; // Beat detected
  }
  
  return false; // No beat
}

// Start the visualizer animation
function startVisualizer() {
  if (!analyser) {
    console.log("Cannot start visualizer: Analyzer not initialized");
    return;
  }
  
  // If there's already an animation running, no need to start another
  if (animationId) {
    console.log("Visualizer animation already running");
    return;
  }
  
  console.log("Starting visualizer animation");
  
  function draw() {
    animationId = requestAnimationFrame(draw);
    
    // Analyze audio and check for beats
    const beat = analyzeAudio();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw based on current visualizer type
    switch (visualizerType) {
      case 0: drawBarsVisualizer(); break;
      case 1: drawWaveVisualizer(); break;
      case 2: drawFlameVisualizer(); break;
      case 3: drawXboxVisualizer(); break;
      case 4: drawPlasmaVisualizer(); break;
      case 5: drawParticlesVisualizer(beat); break;
      case 6: drawOrbitVisualizer(beat); break;
    }
  }
  
  draw();
}

// Stop the visualizer animation
function stopVisualizer() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// Draw bars visualizer (blue bars)
function drawBarsVisualizer() {
  const width = canvas.width;
  const height = canvas.height;
  const barWidth = width / dataArray.length;
  const amplification = 1.2; // More moderate response
  
  // Create gradient based on energy
  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, `rgba(0, 120, 255, ${0.9})`);
  gradient.addColorStop(0.5, `rgba(80, 180, 255, ${0.9})`);
  gradient.addColorStop(1.0, `rgba(200, 240, 255, ${0.9})`);
  
  ctx.fillStyle = gradient;
  
  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (Math.pow(dataArray[i] / 255, 1.5) * height * amplification); // More gentle curve
    const x = i * barWidth;
    const y = height - barHeight;
    
    ctx.fillRect(x, y, barWidth - 1, barHeight);
    
    // Add subtle glow on peaks
    if (dataArray[i] > 220) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00AAFF';
      ctx.fillRect(x, y, barWidth - 1, barHeight);
      ctx.shadowBlur = 0;
    }
  }
}

// Draw wave visualizer (pink oscilloscope)
function drawWaveVisualizer() {
  const width = canvas.width;
  const height = canvas.height;
  const sliceWidth = width / dataArray.length;
  const amplification = 1.3; // More moderate response
  
  ctx.lineWidth = 2 + avgEnergy * 3; // More subtle line width changes
  
  // Create gradient based on energy
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#FF00FF');
  gradient.addColorStop(0.5, '#FF80FF');
  gradient.addColorStop(1.0, '#FF00FF');
  
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  
  let x = 0;
  
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * height / 2) * amplification;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    x += sliceWidth;
  }
  
  // Add subtle glow effect based on energy
  ctx.shadowBlur = 5 + avgEnergy * 10;
  ctx.shadowColor = '#FF00FF';
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// Draw flame visualizer (green flame effect)
function drawFlameVisualizer() {
  const width = canvas.width;
  const height = canvas.height;
  
  // Fade effect (more transparent for more active trails)
  ctx.fillStyle = `rgba(0, 0, 0, ${0.15 - avgEnergy * 0.05})`;
  ctx.fillRect(0, 0, width, height);
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, '#00FF00');
  gradient.addColorStop(0.5, `rgba(255, 255, 0, ${0.6 + 0.3 * avgEnergy})`);
  gradient.addColorStop(1, `rgba(0, 255, 0, ${avgEnergy * 0.8})`);
  
  // Draw flame shape
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, height);
  
  const sliceWidth = width / dataArray.length;
  let x = 0;
  
  for (let i = 0; i < dataArray.length; i++) {
    // More moderate amplification
    const amplification = 1.2 + mid * 1.0;
    const value = Math.pow(dataArray[i] / 255, 1.5); // More gentle curve
    const y = height - (value * height * amplification);
    
    // Add some subtle fluctuation for natural effect
    const fluctuation = Math.sin(i * 0.1 + Date.now() * 0.001) * 3 * avgEnergy;
    
    ctx.lineTo(x, y + fluctuation);
    x += sliceWidth;
  }
  
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
  
  // Add subtle glow effect based on energy
  if (avgEnergy > 0.7) {
    ctx.shadowBlur = avgEnergy * 20;
    ctx.shadowColor = '#00FF00';
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// Draw Xbox-inspired green energy visualizer
function drawXboxVisualizer() {
  const width = canvas.width;
  const height = canvas.height;
  
  // Create a black background with variable fade for trail effect
  ctx.fillStyle = `rgba(0, 0, 0, ${0.2 - avgEnergy * 0.05})`;
  ctx.fillRect(0, 0, width, height);
  
  // Create central point for energy lines
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Calculate beat impact - for pulsing effects
  const timeSinceLastBeat = Date.now() - lastTimeBeat;
  const beatImpact = Math.max(0, 1 - (timeSinceLastBeat / 700)); // Slower decay
  
  // Number of energy lines based on intensity - more balanced
  const baseLines = 8;
  const extraLines = Math.floor(avgEnergy * 20); // Fewer extra lines
  const numLines = baseLines + extraLines;
  
  // Draw energy lines
  for (let i = 0; i < numLines; i++) {
    // Calculate line properties
    const angle = (i / numLines) * Math.PI * 2;
    const baseBounce = Math.sin(Date.now() * 0.0007 * (1 + i * 0.1)) * 0.15; // Slower, subtler bouncing
    const energyFactor = Math.pow(avgEnergy, 1.5) * 2 + beatImpact * 1.5 + baseBounce; // More gentle energy curve
    const length = 30 + energyFactor * 120;
    const curve = 50 + energyFactor * 100;
    
    // Line intensity based on frequency values with some randomization
    const freqIndex = Math.floor((i / numLines) * dataArray.length);
    const rawIntensity = dataArray[freqIndex] / 255;
    const lineIntensity = Math.pow(rawIntensity, 1.5) * 1.2; // More gentle curve
    
    // Line color - Xbox green with varying brightness
    const green = Math.floor(150 + lineIntensity * 105);
    ctx.strokeStyle = `rgba(${20 + beatImpact * 30}, ${green}, ${20 + beatImpact * 20}, ${0.4 + lineIntensity * 0.6})`;
    ctx.lineWidth = 1 + lineIntensity * 3 + beatImpact * 2; // Thinner lines
    
    // Start drawing the energy line
    ctx.beginPath();
    
    // Calculate control points for bezier curve
    const startX = centerX;
    const startY = centerY;
    const endX = centerX + Math.cos(angle) * length;
    const endY = centerY + Math.sin(angle) * length;
    
    // Make curves more dynamic with audio reactivity
    const curveOffset = 0.3 + avgEnergy * 0.3; // Less extreme curves
    const controlX1 = centerX + Math.cos(angle + curveOffset) * curve;
    const controlY1 = centerY + Math.sin(angle + curveOffset) * curve;
    const controlX2 = centerX + Math.cos(angle - curveOffset) * curve;
    const controlY2 = centerY + Math.sin(angle - curveOffset) * curve;
    
    // Draw the bezier curve
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
    
    // Add subtle glow effect proportional to energy
    ctx.shadowBlur = 5 + lineIntensity * 15 + beatImpact * 15; // Less intense glow
    ctx.shadowColor = '#00ff00';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  // Draw central energy orb - more subtle pulsing
  const basePulse = 1 + Math.sin(Date.now() * 0.003) * 0.15; // Slower, subtler pulse
  const orbSize = (20 + avgEnergy * 30 + beatImpact * 20) * basePulse;
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, orbSize
  );
  
  // Make the orb colors more subtle
  gradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 + avgEnergy * 0.2})`);
  gradient.addColorStop(0.2, `rgba(${150 + beatImpact * 75}, 255, ${150 + beatImpact * 75}, ${0.6 + avgEnergy * 0.3})`);
  gradient.addColorStop(0.4, `rgba(0, ${200 + bass * 55}, 0, ${0.4 + avgEnergy * 0.4})`);
  gradient.addColorStop(1, `rgba(0, ${30 + bass * 30}, 0, 0)`);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, orbSize, 0, Math.PI * 2);
  
  // Add moderate glow effect
  ctx.shadowBlur = 15 + avgEnergy * 25 + beatImpact * 20; // Less intense glow
  ctx.shadowColor = '#00ff00';
  ctx.fill();
  ctx.shadowBlur = 0;
}

// Draw plasma-like visualizer (Windows Media Player inspired)
function drawPlasmaVisualizer() {
  const width = canvas.width;
  const height = canvas.height;
  
  // Calculate time for animation - with smoother speed changes
  const timeScale = 0.0008 * (1 + avgEnergy * 1.5); // Slower base animation
  const time = Date.now() * timeScale;
  
  // Shift hue based on time and audio energy - more subtle
  const hueShift = avgEnergy * 3 + bass * 5; // Less dramatic shifts
  hue = (hue + hueShift) % 360;
  
  // Create gradient background with more subtle colors
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  const saturation = 70 + avgEnergy * 20; // Less extreme saturation
  const lightness = 20 + avgEnergy * 20; // Less extreme lightness
  
  gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
  gradient.addColorStop(0.5, `hsl(${(hue + 60) % 360}, ${saturation}%, ${lightness + 15}%)`);
  gradient.addColorStop(1, `hsl(${(hue + 180) % 360}, ${saturation}%, ${lightness}%)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Draw multiple electric plasma lines based on different frequency bands
  const timeSinceLastBeat = Date.now() - lastTimeBeat;
  const beatImpact = Math.max(0, 1 - (timeSinceLastBeat / 700)); // Slower decay
  
  // Draw bass-driven line
  drawPlasmaLine(width, height, time, bass * 1.2 + beatImpact * 0.8, 0, (hue + 180) % 360);
  
  // Draw mid-driven line
  drawPlasmaLine(width, height, time * 1.2, mid * 1.2, 0.33, (hue + 120) % 360);
  
  // Draw treble-driven line
  drawPlasmaLine(width, height, time * 0.6, treble * 1.2, 0.66, (hue + 60) % 360);
  
  // Draw electric nodes - now they pulse with the beat and move with the music
  for (let i = 0; i < 3; i++) {
    const bandEnergy = i === 0 ? bass : i === 1 ? mid : treble;
    const xOffset = Math.sin(time * (i + 1) * 0.4) * width * 0.15 * bandEnergy; // Less movement
    const yOffset = Math.cos(time * (i + 0.5) * 0.4) * height * 0.15 * bandEnergy;
    
    const x = width * (0.25 + i * 0.25) + xOffset;
    const y = height * 0.5 + yOffset;
    
    // Size based on energy and beat - more moderate
    const pulseEffect = 1 + Math.sin(time * 7) * 0.15 * bandEnergy; // Slower, subtler pulse
    const size = (10 + bandEnergy * 35 + beatImpact * 20) * pulseEffect;
    
    const nodeGradient = ctx.createRadialGradient(
      x, y, 0,
      x, y, size
    );
    
    // More subtle colors
    nodeGradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 + beatImpact * 0.1})`);
    nodeGradient.addColorStop(0.2, `hsla(${(hue + i * 30) % 360}, 100%, ${70 + bandEnergy * 20}%, ${0.7 + beatImpact * 0.2})`);
    nodeGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
    
    ctx.fillStyle = nodeGradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    
    // Add moderate glow effect
    ctx.shadowBlur = 15 + bandEnergy * 20 + beatImpact * 15; // Less intense glow
    ctx.shadowColor = `hsl(${(hue + i * 30) % 360}, 100%, 50%)`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// Helper function for plasma visualizer
function drawPlasmaLine(width, height, time, energy, yOffset, hue) {
  const lineWidth = 2 + energy * 6; // Thinner line
  
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = `hsl(${hue}, 100%, ${70 + energy * 20}%)`;
  ctx.globalAlpha = 0.6 + energy * 0.3;
  
  // Make wave more complex but less extreme
  ctx.beginPath();
  for (let x = 0; x < width; x += width / 250) {
    // Create more complex wave with multiple frequencies but less extreme amplitude
    const yPos = height * (0.3 + yOffset) + 
      Math.sin(x * 0.01 + time) * height * 0.12 * energy +
      Math.sin(x * 0.02 - time * 1.5) * height * 0.08 * energy +
      Math.sin(x * 0.005 + time * 0.5) * height * 0.15 * energy;
    
    if (x === 0) {
      ctx.moveTo(x, yPos);
    } else {
      ctx.lineTo(x, yPos);
    }
  }
  
  // Add subtle glow effect
  ctx.shadowBlur = 8 + energy * 20; // Less intense glow
  ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// Draw particles visualizer
function drawParticlesVisualizer(beat) {
  const width = canvas.width;
  const height = canvas.height;
  
  // Create dark background with variable fade for trail effect
  ctx.fillStyle = `rgba(0, 0, 0, ${0.15 - avgEnergy * 0.05})`;
  ctx.fillRect(0, 0, width, height);
  
  // Create new particles based on energy - more moderate counts
  const baseParticles = Math.floor(avgEnergy * 3);
  const beatParticles = beat ? 12 : 0;
  const particleCount = baseParticles + beatParticles;
  
  for (let i = 0; i < particleCount; i++) {
    const freqIndex = Math.floor(Math.random() * dataArray.length);
    const freqValue = dataArray[freqIndex] / 255;
    const freqEnergy = Math.pow(freqValue, 1.5) * 1.5; // More gentle curve
    
    // Determine color based on frequency band
    let particleHue;
    if (freqIndex < dataArray.length * 0.2) {
      particleHue = 350; // Bass - red
    } else if (freqIndex < dataArray.length * 0.5) {
      particleHue = 60; // Mid - yellow
    } else {
      particleHue = 180; // Treble - cyan
    }
    
    // Randomize the hue slightly
    particleHue = (particleHue + Math.random() * 40 - 20) % 360;
    
    // Speed based on energy and frequency - more moderate
    const speedMultiplier = 3 + avgEnergy * 8;
    
    particles.push({
      x: width / 2,
      y: height / 2,
      size: 1 + Math.random() * 3 + (beat ? 2 : 0), // Smaller particles
      color: `hsl(${particleHue}, 100%, 70%)`,
      speedX: (Math.random() - 0.5) * speedMultiplier * freqEnergy,
      speedY: (Math.random() - 0.5) * speedMultiplier * freqEnergy,
      life: 1.0
    });
  }
  
  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    
    // Update position with more moderate acceleration
    p.x += p.speedX * (1 + avgEnergy * 0.7);
    p.y += p.speedY * (1 + avgEnergy * 0.7);
    p.life -= 0.01 + avgEnergy * 0.005; // Slower fade
    
    // Remove dead particles
    if (p.life <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
      particles.splice(i, 1);
      continue;
    }
    
    // Draw particle with subtle glow effect
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    
    // Add subtle glow on high energy
    if (avgEnergy > 0.6) {
      ctx.shadowBlur = 5 * avgEnergy;
      ctx.shadowColor = p.color;
    }
    
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  ctx.globalAlpha = 1.0;
  
  // Limit the number of particles for performance
  if (particles.length > 600) {
    particles.splice(0, 150);
  }
}

// Draw orbiting visualizer
function drawOrbitVisualizer(beat) {
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Create background with gradient and variable fade
  ctx.fillStyle = `rgba(0, 0, 0, ${0.15 - avgEnergy * 0.05})`;
  ctx.fillRect(0, 0, width, height);
  
  // Get current time for animation
  const now = Date.now();
  const elapsed = now - lastTime;
  lastTime = now;
  
  // Create new orbits based on beats/energy - more moderate
  if ((beat || avgEnergy > 0.8) && Math.random() > 0.5 && orbits.length < 25) {
    const freqIndex = Math.floor(Math.random() * (dataArray.length / 2));
    const freqValue = dataArray[freqIndex] / 255;
    const energy = Math.pow(freqValue, 1.5) * 1.5; // More gentle curve
    
    // Color based on frequency
    let orbitHue;
    if (freqIndex < dataArray.length * 0.2) {
      orbitHue = 280; // Bass - purple
    } else if (freqIndex < dataArray.length * 0.5) {
      orbitHue = 200; // Mid - blue
    } else {
      orbitHue = 160; // Treble - cyan
    }
    
    // Randomize the hue slightly
    orbitHue = (orbitHue + Math.random() * 40 - 20) % 360;
    
    orbits.push({
      radius: 20 + Math.random() * 120,
      angle: Math.random() * Math.PI * 2,
      speed: (0.0005 + Math.random() * 0.002 + avgEnergy * 0.001) * (Math.random() > 0.5 ? 1 : -1),
      color: `hsl(${orbitHue}, 100%, 70%)`,
      size: 5 + Math.random() * 10 * energy + (beat ? 5 : 0), // Smaller orbits
      life: 1.0,
      pulse: 0.5 + Math.random() * 0.3
    });
  }
  
  // Draw center sphere - more subtle
  const timeSinceLastBeat = Date.now() - lastTimeBeat;
  const beatImpact = Math.max(0, 1 - (timeSinceLastBeat / 700)); // Slower decay
  
  const basePulse = 1 + Math.sin(now * 0.002) * 0.15; // Slower, gentler pulse
  const centerSize = (20 + avgEnergy * 35 + beatImpact * 25) * basePulse;
  
  const centerGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, centerSize
  );
  
  // Shift hue based on overall energy
  const centerHue = (now * 0.03) % 360; // Slower hue rotation
  
  centerGradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 + beatImpact * 0.1})`);
  centerGradient.addColorStop(0.3, `hsla(${centerHue}, 80%, ${70 + avgEnergy * 20}%, ${0.7 + avgEnergy * 0.2})`);
  centerGradient.addColorStop(1, `hsla(${centerHue + 30}, 100%, 50%, 0)`);
  
  ctx.fillStyle = centerGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerSize, 0, Math.PI * 2);
  
  // Add moderate glow effect
  ctx.shadowBlur = 15 + avgEnergy * 25 + beatImpact * 25; // Less intense glow
  ctx.shadowColor = `hsl(${centerHue}, 100%, 70%)`;
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Draw orbital paths - more subtle
  ctx.strokeStyle = `rgba(100, 150, 255, ${0.08 + avgEnergy * 0.12})`;
  ctx.lineWidth = 1 + avgEnergy;
  
  for (let orbit of orbits) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbit.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Update and draw orbiting objects
  for (let i = orbits.length - 1; i >= 0; i--) {
    const orbit = orbits[i];
    
    // Update position with smoother speed changes
    if (elapsed) {
      orbit.angle += orbit.speed * elapsed * (1 + avgEnergy * 1.2);
    }
    orbit.life -= 0.002 + avgEnergy * 0.0007; // Slower fade
    
    // Pulse effect - more subtle
    const pulseRate = 0.004 * orbit.pulse;
    const pulseFactor = 1 + Math.sin(now * pulseRate) * 0.2 * avgEnergy;
    
    // Remove dead orbits
    if (orbit.life <= 0) {
      orbits.splice(i, 1);
      continue;
    }
    
    // Calculate position
    const x = centerX + Math.cos(orbit.angle) * orbit.radius;
    const y = centerY + Math.sin(orbit.angle) * orbit.radius;
    
    // Draw orbiting object with moderate glow
    ctx.globalAlpha = orbit.life;
    
    // Create glow effect
    const objSize = orbit.size * pulseFactor;
    const objGradient = ctx.createRadialGradient(
      x, y, 0,
      x, y, objSize
    );
    
    objGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    objGradient.addColorStop(0.3, orbit.color);
    objGradient.addColorStop(1, 'rgba(0, 0, 100, 0)');
    
    ctx.fillStyle = objGradient;
    ctx.beginPath();
    ctx.arc(x, y, objSize, 0, Math.PI * 2);
    
    // Add subtle glow effect
    ctx.shadowBlur = 8 + avgEnergy * 12;
    ctx.shadowColor = orbit.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw orbit trail - more subtle
    const trailLength = 8 + avgEnergy * 12;
    const trailWidth = 1 + avgEnergy * 2 + (beat ? 1 : 0);
    
    ctx.strokeStyle = orbit.color;
    ctx.lineWidth = trailWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbit.radius, 
            orbit.angle - orbit.speed * elapsed * trailLength, 
            orbit.angle);
    
    // Subtle glow effect on trail
    ctx.shadowBlur = 3 + avgEnergy * 7;
    ctx.shadowColor = orbit.color;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  ctx.globalAlpha = 1.0;
}