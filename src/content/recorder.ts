// import { record } from "rrweb"; // TODO: Integrate rrweb if needed
import { MessageType, type RecordingSession } from "../types";

const EVENT_TYPES = [
	"click",
	"dblclick",
	"mousedown",
	"mouseup",
	"contextmenu",
	"keydown",
	"keyup",
	"input",
	"change",
	"submit",
	"scroll",
	"focus",
	"blur",
	"touchstart",
	"touchend",
];

// Chrome DevTools Recorder compatible event structure
type RecordedStep = {
	type:
		| "click"
		| "change"
		| "keyDown"
		| "keyUp"
		| "scroll"
		| "navigate"
		| "waitForElement"
		| "assertElement";
	target?: {
		selectors: string[][];
	};
	offsetX?: number;
	offsetY?: number;
	button?: "primary" | "secondary" | "middle";
	key?: string;
	value?: string;
	url?: string;
	assertedEvents?: Array<{
		type: string;
		title?: string;
		url?: string;
	}>;
	timeout?: number;
	frame?: number[];
};

type RecordedEvent = {
	type: string;
	selector: string | null;
	value?: string | null;
	key?: string;
	button?: number;
	scrollX?: number;
	scrollY?: number;
	url?: string;
	timestamp: number;
	step?: RecordedStep; // Chrome DevTools compatible step
};

// Content script for recording DOM interactions
class DOMRecorder {
	private stopRecordingFn: (() => void) | null = null;
	private events: RecordedEvent[] = [];
	private sessionId: string | null = null;
	private isRecording: boolean = false;
	private eventListeners: Map<string, (event: Event) => void> = new Map();

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

	private getUniqueSelector(el: Element | null): string | null {
		if (!el) return null;
		if (el.id) return `#${el.id}`;
		if (el.className && typeof el.className === "string") {
			const classes = el.className.trim().split(/\s+/).join(".");
			return `${el.tagName.toLowerCase()}.${classes}`;
		}
		return el.tagName.toLowerCase();
	}

	// Generate Chrome DevTools compatible selectors
	private generateSelectors(element: Element): string[][] {
		const selectors: string[][] = [];

		// Try different selector strategies
		const strategies = [
			() => (element.id ? [`#${element.id}`] : null),
			() => {
				if (element.className && typeof element.className === "string") {
					const classes = element.className.trim().split(/\s+/);
					if (classes.length > 0) {
						return [`${element.tagName.toLowerCase()}.${classes.join(".")}`];
					}
				}
				return null;
			},
			() => {
				// Generate CSS selector path
				const path: string[] = [];
				let current: Element | null = element;

				while (current && current !== document.body) {
					let selector = current.tagName.toLowerCase();

					if (current.id) {
						selector = `#${current.id}`;
						path.unshift(selector);
						break;
					}

					// Add nth-child if needed for uniqueness
					const parent = current.parentElement;
					if (parent) {
						const siblings = Array.from(parent.children).filter(
							(child) => child.tagName === current!.tagName,
						);
						if (siblings.length > 1 && current) {
							const index = siblings.indexOf(current) + 1;
							selector += `:nth-child(${index})`;
						}
					}

					path.unshift(selector);
					current = current.parentElement;
				}

				return path.length > 0 ? path : null;
			},
			() => {
				// Fallback: use attributes
				const attrs: string[] = [];
				if (element.getAttribute("data-testid")) {
					attrs.push(`[data-testid="${element.getAttribute("data-testid")}"]`);
				}
				if (element.getAttribute("name")) {
					attrs.push(`[name="${element.getAttribute("name")}"]`);
				}
				if (element.getAttribute("type")) {
					attrs.push(`[type="${element.getAttribute("type")}"]`);
				}
				return attrs.length > 0
					? [element.tagName.toLowerCase() + attrs.join("")]
					: null;
			},
		];

		for (const strategy of strategies) {
			const result = strategy();
			if (result) {
				selectors.push(result);
			}
		}

		// Always include a basic selector as fallback
		if (selectors.length === 0) {
			selectors.push([element.tagName.toLowerCase()]);
		}

		return selectors;
	}

	private async handleMessage(
		message: { type: string; payload?: any },
		sendResponse: (response: { success: boolean; error?: string }) => void,
	) {
		try {
			switch (message.type) {
				case MessageType.START_RECORDING:
					await this.startRecording(message.payload.sessionId);
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

	private async startRecording(sessionId: string): Promise<void> {
		if (this.isRecording) {
			console.warn("[Zordon] Already recording");
			return;
		}

		this.sessionId = sessionId;
		this.events = [];
		this.isRecording = true;

		console.log("[Zordon] Starting recording:", sessionId);

		// Add navigation event as first step
		this.recordNavigationStep();

		// Set up event listeners
		this.addListeners();

		// Show recording indicator
		this.showRecordingIndicator();

		console.log("[Zordon] Recording started successfully");
	}

	// Record navigation step (Chrome DevTools format)
	private recordNavigationStep(): void {
		const navigationEvent: RecordedEvent = {
			type: "navigate",
			selector: null,
			url: window.location.href,
			timestamp: Date.now(),
			step: {
				type: "navigate",
				url: window.location.href,
				assertedEvents: [
					{
						type: "navigation",
						url: window.location.href,
						title: document.title,
					},
				],
			},
		};

		this.events.push(navigationEvent);
		console.log("[Zordon] Recorded navigation:", navigationEvent);
	}

	// Handle individual events during recording
	private handleRecordedEvent(event: Event): void {
		if (!this.isRecording) return;

		const target = event.target as Element;
		if (!target) return;

		const eventData = this.createEventData(event, target);
		if (eventData) {
			this.events.push(eventData);
			console.log("[Zordon] Recorded event:", eventData);
		}
	}

	// Create event data in Chrome DevTools format
	private createEventData(event: Event, target: Element): RecordedEvent | null {
		const selector = this.getUniqueSelector(target);
		const selectors = this.generateSelectors(target);
		const timestamp = Date.now();

		const baseEvent: RecordedEvent = {
			type: event.type,
			selector,
			timestamp,
		};

		// Handle different event types
		switch (event.type) {
			case "click": {
				const mouseEvent = event as MouseEvent;
				const rect = target.getBoundingClientRect();

				baseEvent.button = mouseEvent.button;
				baseEvent.step = {
					type: "click",
					target: { selectors },
					offsetX: mouseEvent.clientX - rect.left,
					offsetY: mouseEvent.clientY - rect.top,
					button:
						mouseEvent.button === 0
							? "primary"
							: mouseEvent.button === 1
								? "middle"
								: "secondary",
				};
				break;
			}

			case "input":
			case "change": {
				const inputElement = target as HTMLInputElement;
				baseEvent.value = inputElement.value;
				baseEvent.step = {
					type: "change",
					target: { selectors },
					value: inputElement.value,
				};
				break;
			}

			case "keydown": {
				const keyEvent = event as KeyboardEvent;
				baseEvent.key = keyEvent.key;
				baseEvent.step = {
					type: "keyDown",
					target: { selectors },
					key: keyEvent.key,
				};
				break;
			}

			case "keyup": {
				const keyEvent = event as KeyboardEvent;
				baseEvent.key = keyEvent.key;
				baseEvent.step = {
					type: "keyUp",
					target: { selectors },
					key: keyEvent.key,
				};
				break;
			}

			case "scroll": {
				baseEvent.scrollX = window.scrollX;
				baseEvent.scrollY = window.scrollY;
				baseEvent.step = {
					type: "scroll",
					target: { selectors },
				};
				break;
			}

			default:
				// For other events, create a basic step
				baseEvent.step = {
					type: "click", // Default fallback
					target: { selectors },
				};
		}

		return baseEvent;
	}

	private addListeners(): void {
		// Clear existing listeners first
		this.removeListeners();

		EVENT_TYPES.forEach((eventType) => {
			const handler = (event: Event) => this.handleRecordedEvent(event);
			this.eventListeners.set(eventType, handler);
			window.addEventListener(eventType, handler, true);
		});

		// Track SPA navigations
		const originalPushState = history.pushState;
		const originalReplaceState = history.replaceState;

		history.pushState = (...args) => {
			const result = originalPushState.apply(history, args);
			this.recordNavigationStep();
			return result;
		};

		history.replaceState = (...args) => {
			const result = originalReplaceState.apply(history, args);
			this.recordNavigationStep();
			return result;
		};

		// Listen for popstate (back/forward)
		const popstateHandler = () => this.recordNavigationStep();
		this.eventListeners.set("popstate", popstateHandler);
		window.addEventListener("popstate", popstateHandler);
	}

	private removeListeners(): void {
		this.eventListeners.forEach((handler, eventType) => {
			window.removeEventListener(eventType, handler, true);
		});
		this.eventListeners.clear();
	}

	private stopRecording(): RecordedEvent[] {
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
		this.removeListeners();
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
