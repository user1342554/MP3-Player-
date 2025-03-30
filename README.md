# Jonas MP3 Player

<div align="center">
  <h3>✨ A retro-inspired, stylish MP3 player with trippy visualizers ✨</h3>
  
  <p>
    <img src="https://img.shields.io/badge/platform-windows-blue.svg" alt="Platform - Windows">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License - MIT">
    <img src="https://img.shields.io/badge/electron-v25.0.0-teal.svg" alt="Electron v25.0.0">
  </p>
  
  <hr>
</div>

## About

Jonas MP3 Player is a desktop application built with Electron that brings back the nostalgic feel of early 2000s media players with a modern twist. This lightweight yet visually appealing music player features multiple audio visualizers, playlist management, and a custom interface designed with a retro aesthetic.

## Features

- **Stylish Retro Interface** - Designed with a nostalgic early 2000s aesthetic
- **Multiple Audio Visualizers** - 7 different visualizer types:
  - Bars: Classic audio spectrum visualization
  - Wave: Oscilloscope-style waveform display
  - Flame: Dynamic flame effect that reacts to music
  - Xbox: Inspired by Xbox dashboard visuals
  - Plasma: Psychedelic plasma patterns
  - Particles: Particle system that reacts to music
  - Orbit: Orbital visualization with elements that follow the beat
- **Audio Controls**
  - Play/Pause, Stop
  - Volume adjustment
  - Progress bar with seek functionality

- **System Integration**
  - File association for audio files
  - Custom window chrome (frameless window)
  - Drag and drop support
- **Audio Format Support**
  - MP3, WAV, OGG, FLAC, M4A

## Technologies Used

- **Electron** - Cross-platform desktop app framework
- **HTML/CSS/JavaScript** - Front-end development
- **Web Audio API** - For audio analysis and visualization
- **Canvas API** - For rendering audio visualizations
- **Electron Store** - For settings persistence

## 📥 Installation

<div align="center">
  <table>
    <tr>
      <th>Prerequisites</th>
      <th>Setup</th>
    </tr>
    <tr>
      <td>
        <ul>
          <li><a href="https://nodejs.org/">Node.js</a> (v14 or higher)</li>
          <li>npm (included with Node.js)</li>
        </ul>
      </td>
      <td>
        <ol>
          <li>
            Clone the repository
            <pre><code>git clone https://github.com/yourusername/jonas-mp3-player.git
cd jonas-mp3-player</code></pre>
          </li>
          <li>
            Install dependencies
            <pre><code>npm install</code></pre>
          </li>
          <li>
            Start the application
            <pre><code>npm start</code></pre>
          </li>
        </ol>
      </td>
    </tr>
  </table>
</div>

### 🚀 Building for Distribution

<div align="center">
  <h4>For Windows</h4>
  <pre><code>npm run dist-win</code></pre>
  This will create a distributable Windows application in the <code>dist</code> folder.
</div>

## 🎮 Usage

<div align="center">
  <table>
    <tr>
      <th width="33%">Basic Controls</th>
      <th width="33%">Adding Music</th>
      <th width="33%">Changing Visualizers</th>
    </tr>
    <tr valign="top">
      <td>
        <ul>
          <li><b>Play/Pause</b> - Click the top circular button (▶/⏸)</li>
          <li><b>Stop</b> - Click the bottom circular button (■)</li>
          <li><b>Volume</b> - Adjust using the slider at the bottom</li>
          <li><b>Seek</b> - Click anywhere on the progress bar</li>
        </ul>
      </td>
      <td>
        <ul>
          <li>Click the playlist button (📋) on the left side</li>
          <li>Click "+ Add Files" to browse your computer</li>
          <li>Select audio files to add to your playlist</li>
        </ul>
      </td>
      <td>
        <ul>
          <li>Click the visualizer button (🌈) on the right side</li>
          <li>The visualizer will cycle through different types</li>
          <li>A notification will display the current visualizer</li>
        </ul>
      </td>
    </tr>
  </table>
</div>

## 💻 Development

<div align="center">
  <h3>Project Structure</h3>
  
  <table>
    <tr>
      <th>File</th>
      <th>Description</th>
    </tr>
    <tr>
      <td><code>main.js</code></td>
      <td>Main Electron process</td>
    </tr>
    <tr>
      <td><code>preload.js</code></td>
      <td>Secure bridge between renderer and main process</td>
    </tr>
    <tr>
      <td><code>renderer.js</code></td>
      <td>Renderer process for the player UI</td>
    </tr>
    <tr>
      <td><code>index.html</code></td>
      <td>Main application window</td>
    </tr>
    <tr>
      <td><code>playlist.html/js/css</code></td>
      <td>Playlist management window</td>
    </tr>
  </table>
</div>

### 🔮 Adding New Visualizers

<div align="center">
  <div style="display: inline-block; text-align: left; padding: 20px; background-color: #f6f8fa; border-radius: 6px;">
    <h4>To add a new visualizer:</h4>
    <ol>
      <li>Increment the visualizer type count in <code>renderer.js</code></li>
      <li>Add a new visualizer drawing function</li>
      <li>Update the visualizer names array in the <code>changeVisualizer()</code> function</li>
    </ol>
  </div>
</div>

## 📜 License

<div align="center">
  This project is licensed under the <b>MIT License</b> - see the LICENSE file for details.
</div>

## 🙏 Acknowledgments

<div align="center">
  <p>Inspired by classic media players like Winamp and Windows Media Player</p>
  <p>Special thanks to the Electron community for their excellent documentation and examples</p>
  
  <br>
  <hr>
  <p>
    <i>Created with ❤️ by Jonas, 2025</i>
  </p>
</div>
