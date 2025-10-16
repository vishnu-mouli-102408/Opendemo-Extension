import { record } from "rrweb";
import { MessageType, type RecordingSession } from "../types";

// Content script for recording DOM interactions
class DOMRecorder {
	private stopRecordingFn: any = null;
	private events: any[] = [];
	private sessionId: string | null = null;
	private isRecording: boolean = false;

	constructor() {
		this.init();
	}

	private init() {
		// Listen for messages from background script
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			this.handleMessage(message, sendResponse);
			return true;
		});

		console.log("[Zordon] Recorder content script loaded");
	}

	private async handleMessage(
		message: any,
		sendResponse: (response: any) => void,
	) {
		try {
			switch (message.type) {
				case MessageType.START_RECORDING:
					this.startRecording(message.payload.sessionId);
					sendResponse({ success: true });
					break;

				case MessageType.STOP_RECORDING: {
					const events = this.stopRecording();
					// Send events back to background
					chrome.runtime.sendMessage({
						type: "RECORDING_DATA",
						payload: { events },
					});
					sendResponse({ success: true });
					break;
				}

				case MessageType.PLAY_RECORDING:
					if (await this.isPlaybackEnabled()) {
						this.playRecording(message.payload.recording);
					}
					sendResponse({ success: true });
					break;

				default:
					sendResponse({ success: false, error: "Unknown message type" });
			}
		} catch (error) {
			console.error("[Zordon] Error handling message:", error);
			sendResponse({ success: false, error: (error as Error).message });
		}
	}

	private startRecording(sessionId: string) {
		if (this.isRecording) {
			console.warn("[Zordon] Already recording");
			return;
		}

		this.sessionId = sessionId;
		this.events = [];
		this.isRecording = true;

		console.log("[Zordon] Starting recording:", sessionId);

		// Start rrweb recording
		this.stopRecordingFn = record({
			emit: (event) => {
				this.events.push(event);
			},
			checkoutEveryNms: 10 * 60 * 1000, // Create checkpoint every 10 minutes
			recordCanvas: true,
			collectFonts: true,
			maskAllInputs: false, // Change to true for privacy
			maskTextSelector: "[data-sensitive]", // Mask specific elements
			inlineStylesheet: true,
			sampling: {
				// Mouse interaction sampling
				mousemove: true,
				mouseInteraction: true,
				scroll: 150, // Sample every 150ms
				input: "last", // Only record last input in a sequence
			},
			plugins: [],
		});

		// Show recording indicator
		this.showRecordingIndicator();
	}

	private stopRecording(): any[] {
		if (!this.isRecording) {
			console.warn("[Zordon] Not recording");
			return [];
		}

		console.log("[Zordon] Stopping recording");

		if (this.stopRecordingFn) {
			this.stopRecordingFn();
			this.stopRecordingFn = null;
		}

		this.isRecording = false;
		this.hideRecordingIndicator();

		return this.events;
	}

	private async isPlaybackEnabled(): Promise<boolean> {
		const data = await chrome.storage.local.get(["playbackEnabled"]);
		return data.playbackEnabled || false;
	}

	private async playRecording(recording: RecordingSession) {
		console.log(
			"[Zordon Recorder] Playing recording:",
			recording.id,
			"with",
			recording.events?.length || 0,
			"events",
		);

		if (!recording.events || recording.events.length === 0) {
			console.error("[Zordon Recorder] No events in recording");
			alert("This recording has no events to play back.");
			return;
		}

		// Check if player script is already loaded
		const existingScript = document.querySelector('script[src*="player.js"]');

		if (existingScript) {
			console.log(
				"[Zordon Recorder] Player already loaded, sending message directly",
			);
			window.postMessage(
				{
					type: "ZORDON_PLAY",
					recording: recording,
				},
				"*",
			);
		} else {
			console.log("[Zordon Recorder] Loading player script");
			// Inject player script
			const script = document.createElement("script");
			script.src = chrome.runtime.getURL("player.js");
			script.onload = () => {
				console.log(
					"[Zordon Recorder] Player script loaded, sending recording",
				);
				// Send recording data to player
				setTimeout(() => {
					window.postMessage(
						{
							type: "ZORDON_PLAY",
							recording: recording,
						},
						"*",
					);
				}, 100);
			};
			script.onerror = (error) => {
				console.error("[Zordon Recorder] Failed to load player script:", error);
				alert("Failed to load player. Please try again.");
			};
			document.head.appendChild(script);
		}
	}

	private showRecordingIndicator() {
		// Create a recording indicator
		const indicator = document.createElement("div");
		indicator.id = "zordon-recording-indicator";
		indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      animation: pulse 2s infinite;
    `;

		const dot = document.createElement("span");
		dot.style.cssText = `
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 50%;
      display: inline-block;
    `;

		indicator.appendChild(dot);
		indicator.appendChild(document.createTextNode("Recording..."));

		document.body.appendChild(indicator);

		// Add pulse animation
		const style = document.createElement("style");
		style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `;
		document.head.appendChild(style);
	}

	private hideRecordingIndicator() {
		const indicator = document.getElementById("zordon-recording-indicator");
		if (indicator) {
			indicator.remove();
		}
	}
}

// Initialize the recorder
new DOMRecorder();
