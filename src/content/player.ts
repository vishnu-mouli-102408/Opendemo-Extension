import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import type { RecordingSession } from "../types";

// Player for replaying recordings
class DOMPlayer {
	private player: rrwebPlayer | null = null;
	private playerContainer: HTMLElement | null = null;

	constructor() {
		this.init();
	}

	private init() {
		console.log("[Zordon] Player script loaded");

		// Listen for playback requests
		window.addEventListener("message", (event) => {
			if (event.data.type === "ZORDON_PLAY") {
				this.playRecording(event.data.recording);
			}
		});
	}

	private playRecording(recording: RecordingSession) {
		console.log("[Zordon] Initializing player for:", recording.id);

		// Remove existing player if any
		this.cleanup();

		// Create player container
		this.playerContainer = document.createElement("div");
		this.playerContainer.id = "zordon-player-container";
		this.playerContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1000000;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
    `;

		// Create header
		const header = this.createHeader(recording);
		this.playerContainer.appendChild(header);

		// Create player wrapper
		const playerWrapper = document.createElement("div");
		playerWrapper.id = "zordon-player-wrapper";
		playerWrapper.style.cssText = `
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: auto;
    `;
		this.playerContainer.appendChild(playerWrapper);

		document.body.appendChild(this.playerContainer);

		// Initialize rrweb player
		try {
			this.player = new rrwebPlayer({
				target: playerWrapper,
				props: {
					events: recording.events,
					autoPlay: true,
					width: Math.min(1400, window.innerWidth - 100),
					height: Math.min(900, window.innerHeight - 150),
					showController: true,
					skipInactive: true,
					speed: 1,
					UNSAFE_replayCanvas: true,
				},
			});

			console.log("[Zordon] Player initialized successfully");
		} catch (error) {
			console.error("[Zordon] Error initializing player:", error);
			this.showError(
				"Failed to load recording. The recording may be corrupted or incomplete.",
			);
		}
	}

	private createHeader(recording: RecordingSession): HTMLElement {
		const header = document.createElement("div");
		header.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `;

		// Title section
		const titleSection = document.createElement("div");
		titleSection.innerHTML = `
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">
        🎬 ${recording.title || "Untitled Recording"}
      </div>
      <div style="font-size: 12px; opacity: 0.9;">
        ${new URL(recording.url).hostname} • ${this.formatDuration(recording.duration || 0)}
      </div>
    `;
		header.appendChild(titleSection);

		// Close button
		const closeButton = document.createElement("button");
		closeButton.textContent = "✕ Close";
		closeButton.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 8px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    `;
		closeButton.onmouseover = () => {
			closeButton.style.background = "rgba(255, 255, 255, 0.3)";
		};
		closeButton.onmouseout = () => {
			closeButton.style.background = "rgba(255, 255, 255, 0.2)";
		};
		closeButton.onclick = () => this.cleanup();
		header.appendChild(closeButton);

		return header;
	}

	private showError(message: string) {
		if (this.playerContainer) {
			const error = document.createElement("div");
			error.style.cssText = `
        color: white;
        text-align: center;
        padding: 40px;
        font-size: 16px;
      `;
			error.textContent = message;
			this.playerContainer.appendChild(error);
		}
	}

	private formatDuration(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	}

	private cleanup() {
		if (this.player) {
			// Clean up player instance
			this.player = null;
		}

		if (this.playerContainer) {
			this.playerContainer.remove();
			this.playerContainer = null;
		}
	}
}

// Initialize player
new DOMPlayer();
