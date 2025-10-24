import type { ChromeDevToolsStep, RecordingSession } from "../types";

class DOMPlayer {
	private playerContainer: HTMLElement | null = null;
	private isPlaying: boolean = false;
	private currentStepIndex: number = 0;
	private steps: ChromeDevToolsStep[] = [];
	private playbackSpeed: number = 1;
	private playbackInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.init();
	}

	private init() {
		console.log("[Zordon] Custom Player script loaded");

		// Listen for playback requests
		window.addEventListener("message", (event) => {
			if (event.data.type === "ZORDON_PLAY") {
				this.playRecording(event.data.recording);
			}
		});
	}

	private playRecording(recording: RecordingSession) {
		console.log("[Zordon] Starting playback for:", recording.id);

		// Remove existing player if any
		this.cleanup();

		// Extract steps from recording
		this.steps = recording.steps || [];
		this.currentStepIndex = 0;

		if (this.steps.length === 0) {
			console.error("[Zordon] No steps found in recording");
			alert("This recording has no steps to play back.");
			return;
		}

		// Create player UI
		this.createPlayerUI(recording);

		// Start playback
		this.startPlayback();
	}

	private createPlayerUI(recording: RecordingSession) {
		// Create minimal player container - just for completion message
		this.playerContainer = document.createElement("div");
		this.playerContainer.id = "zordon-player-container";
		this.playerContainer.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			width: 300px;
			z-index: 1000000;
			background: rgba(0, 0, 0, 0.8);
			border-radius: 8px;
			padding: 15px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			color: white;
			display: none;
		`;

		// Simple status message
		this.playerContainer.innerHTML = `
			<div style="display: flex; align-items: center; gap: 10px;">
				<div style="font-size: 16px;">🎬</div>
				<div>
					<div style="font-weight: 600; margin-bottom: 2px;">Playing Recording</div>
					<div style="font-size: 12px; opacity: 0.7;">${recording.title || "Untitled"}</div>
				</div>
			</div>
		`;

		document.body.appendChild(this.playerContainer);
	}

	private startPlayback() {
		if (this.steps.length === 0) return;

		this.isPlaying = true;
		this.executeNextStep();
	}

	private executeNextStep() {
		if (!this.isPlaying || this.currentStepIndex >= this.steps.length) {
			this.isPlaying = false;
			this.showCompletionMessage();
			return;
		}

		const step = this.steps[this.currentStepIndex];
		this.executeStep(step);

		this.currentStepIndex++;

		// Schedule next step
		const delay = Math.max(500, 1000 / this.playbackSpeed); // Minimum 500ms delay
		this.playbackInterval = setTimeout(() => {
			this.executeNextStep();
		}, delay);
	}

	private executeStep(step: ChromeDevToolsStep) {
		console.log("[Zordon Player] Executing step:", step);

		try {
			switch (step.type) {
				case "navigate":
					this.executeNavigate(step);
					break;
				case "click":
					this.executeClick(step);
					break;
				case "change":
					this.executeChange(step);
					break;
				case "keyDown":
				case "keyUp":
					this.executeKeyPress(step);
					break;
				case "scroll":
					this.executeScroll(step);
					break;
				default:
					console.log("[Zordon Player] Unsupported step type:", step.type);
			}
		} catch (error) {
			console.error("[Zordon Player] Error executing step:", error);
		}
	}

	private executeNavigate(step: ChromeDevToolsStep) {
		// For navigation, just log it - don't actually navigate
		if (step.url && step.url !== window.location.href) {
			console.log("[Zordon Player] Navigate to:", step.url);
		}
	}

	private executeClick(step: ChromeDevToolsStep) {
		const element = this.findElement(step.target?.selectors);
		if (element) {
			this.highlightElement(element);

			// Simulate click
			setTimeout(() => {
				const rect = element.getBoundingClientRect();
				const event = new MouseEvent("click", {
					bubbles: true,
					cancelable: true,
					clientX: rect.left + (step.offsetX || rect.width / 2),
					clientY: rect.top + (step.offsetY || rect.height / 2),
					button:
						step.button === "primary" ? 0 : step.button === "middle" ? 1 : 2,
				});
				element.dispatchEvent(event);
			}, 200);
		}
	}

	private executeChange(step: ChromeDevToolsStep) {
		const element = this.findElement(
			step.target?.selectors,
		) as HTMLInputElement;
		if (element && step.value !== undefined) {
			this.highlightElement(element);

			setTimeout(() => {
				element.value = step.value || "";
				element.dispatchEvent(new Event("input", { bubbles: true }));
				element.dispatchEvent(new Event("change", { bubbles: true }));
			}, 200);
		}
	}

	private executeKeyPress(step: ChromeDevToolsStep) {
		const element = this.findElement(step.target?.selectors);
		if (element && step.key) {
			this.highlightElement(element);

			setTimeout(() => {
				const event = new KeyboardEvent(
					step.type === "keyDown" ? "keydown" : "keyup",
					{
						key: step.key,
						bubbles: true,
						cancelable: true,
					},
				);
				element.dispatchEvent(event);
			}, 200);
		}
	}

	private executeScroll(_step: ChromeDevToolsStep) {
		// For scroll, scroll the window
		window.scrollTo({
			top: window.scrollY + 100, // Scroll down a bit
			behavior: "smooth",
		});
	}

	private findElement(selectors?: string[][]): Element | null {
		if (!selectors || selectors.length === 0) return null;

		// Try each selector strategy
		for (const selectorArray of selectors) {
			for (const selector of selectorArray) {
				try {
					const element = document.querySelector(selector);
					if (element) return element;
				} catch {}
			}
		}

		return null;
	}

	private highlightElement(element: Element) {
		// Add highlight effect
		const originalStyle = element.getAttribute("style") || "";
		element.setAttribute(
			"style",
			originalStyle +
				"; outline: 3px solid #ff6b6b; outline-offset: 2px; transition: outline 0.3s;",
		);

		setTimeout(() => {
			element.setAttribute("style", originalStyle);
		}, 1000);
	}

	private showCompletionMessage() {
		if (this.playerContainer) {
			this.playerContainer.style.display = "block";
			this.playerContainer.innerHTML = `
				<div style="display: flex; align-items: center; gap: 10px;">
					<div style="font-size: 16px;">✅</div>
					<div>
						<div style="font-weight: 600; margin-bottom: 2px;">Playback Complete!</div>
						<div style="font-size: 12px; opacity: 0.7;">All steps executed successfully</div>
					</div>
				</div>
			`;

			// Auto-hide after 3 seconds
			setTimeout(() => {
				this.cleanup();
			}, 3000);
		}
	}

	private cleanup() {
		if (this.playbackInterval) {
			clearTimeout(this.playbackInterval);
			this.playbackInterval = null;
		}

		this.isPlaying = false;
		this.currentStepIndex = 0;
		this.steps = [];

		if (this.playerContainer) {
			this.playerContainer.remove();
			this.playerContainer = null;
		}
	}
}

// Initialize player
new DOMPlayer();
