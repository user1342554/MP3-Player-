const { ipcRenderer } = require('electron');

// DOM Elements
const playlistItems = document.getElementById('playlistItems');
const searchInput = document.getElementById('searchInput');
const addFilesBtn = document.getElementById('addFilesBtn');
const clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const visualizerOptions = document.querySelectorAll('.viz-option');

// State
let playlist = [];
let currentTrackIndex = -1;
let searchFilter = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  makeWindowDraggable();
  setupEventListeners();
});

// Make window draggable
function makeWindowDraggable() {
  const container = document.querySelector('.playlist-container');
  let offsetX, offsetY, isDragging = false;
  
  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('button, input') || e.target.closest('.playlist-items') || e.target.closest('.visualizer-options')) {
      return;
    }
    
    isDragging = true;
    offsetX = e.clientX;
    offsetY = e.clientY;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - offsetX;
    const dy = e.clientY - offsetY;
    
    // Send window position to main process
    ipcRenderer.send('playlist-drag', { dx, dy });
    
    offsetX = e.clientX;
    offsetY = e.clientY;
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

// Setup event listeners
function setupEventListeners() {
  // Window controls
  minimizeBtn.addEventListener('click', () => ipcRenderer.send('playlist-minimize'));
  closeBtn.addEventListener('click', () => ipcRenderer.send('playlist-close'));
  
  // Playlist controls
  addFilesBtn.addEventListener('click', openFileDialog);
  clearPlaylistBtn.addEventListener('click', clearPlaylist);
  searchInput.addEventListener('input', filterPlaylist);
  
  // Visualizer options
  visualizerOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      const vizType = e.target.getAttribute('data-viz');
      setActiveVisualizer(vizType);
      ipcRenderer.send('set-visualizer', vizType);
    });
  });
  
  // Receive playlist updates from main window
  ipcRenderer.on('update-playlist', (_, newPlaylist, activeIndex) => {
    playlist = newPlaylist || [];
    currentTrackIndex = activeIndex !== undefined ? activeIndex : currentTrackIndex;
    renderPlaylist();
  });
}

// Open file dialog
async function openFileDialog() {
  try {
    const filePaths = await ipcRenderer.invoke('open-file-dialog');
    if (filePaths && filePaths.length > 0) {
      ipcRenderer.send('add-tracks', filePaths);
    }
  } catch (error) {
    console.error('Error opening file dialog:', error);
  }
}

// Clear playlist
function clearPlaylist() {
  if (playlist.length === 0) return;
  
  // Send message to main window
  ipcRenderer.send('clear-playlist');
  
  playlist = [];
  currentTrackIndex = -1;
  renderPlaylist();
}

// Filter playlist by search term
function filterPlaylist() {
  searchFilter = searchInput.value.trim().toLowerCase();
  renderPlaylist();
}

// Set active visualizer
function setActiveVisualizer(type) {
  visualizerOptions.forEach(option => {
    if (option.getAttribute('data-viz') === type) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
}

// Render playlist
function renderPlaylist() {
  // Clear playlist container
  playlistItems.innerHTML = '';
  
  if (playlist.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'playlist-empty';
    emptyMessage.textContent = 'No tracks added yet';
    playlistItems.appendChild(emptyMessage);
    return;
  }
  
  // Filter playlist if search is active
  const filteredPlaylist = searchFilter 
    ? playlist.filter(track => {
        return (
          track.title.toLowerCase().includes(searchFilter) || 
          track.artist.toLowerCase().includes(searchFilter)
        );
      })
    : playlist;
  
  if (filteredPlaylist.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'playlist-empty';
    emptyMessage.textContent = 'No tracks match your search';
    playlistItems.appendChild(emptyMessage);
    return;
  }
  
  // Add each track to the playlist
  filteredPlaylist.forEach((track, index) => {
    const actualIndex = playlist.indexOf(track);
    
    // Create playlist item
    const item = document.createElement('div');
    item.className = 'playlist-item';
    if (actualIndex === currentTrackIndex) {
      item.classList.add('active');
    }
    
    // Number
    const number = document.createElement('div');
    number.className = 'playlist-item-number';
    number.textContent = (index + 1).toString().padStart(2, '0');
    
    // Info container
    const info = document.createElement('div');
    info.className = 'playlist-item-info';
    
    // Title
    const title = document.createElement('div');
    title.className = 'playlist-item-title';
    title.textContent = track.title;
    
    // Artist
    const artist = document.createElement('div');
    artist.className = 'playlist-item-artist';
    artist.textContent = track.artist;
    
    // Add title and artist to info
    info.appendChild(title);
    info.appendChild(artist);
    
    // Duration
    const duration = document.createElement('div');
    duration.className = 'playlist-item-duration';
    duration.textContent = track.duration ? formatTime(track.duration) : '--:--';
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'playlist-item-actions';
    
    // Play button
    const playBtn = document.createElement('button');
    playBtn.className = 'item-action play-action';
    playBtn.textContent = '▶';
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ipcRenderer.send('play-track', actualIndex);
    });
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'item-action remove-action';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ipcRenderer.send('remove-track', actualIndex);
    });
    
    // Add buttons to actions
    actions.appendChild(playBtn);
    actions.appendChild(removeBtn);
    
    // Add all elements to item
    item.appendChild(number);
    item.appendChild(info);
    item.appendChild(duration);
    item.appendChild(actions);
    
    // Add click event to play track
    item.addEventListener('click', () => {
      ipcRenderer.send('play-track', actualIndex);
    });
    
    // Add item to playlist
    playlistItems.appendChild(item);
  });
}

// Format time in seconds to MM:SS
function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}