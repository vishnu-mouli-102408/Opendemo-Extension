import { MessageType, type RecordingSession, RecordingStatus } from "../types";

// Popup UI controller
class PopupController {
	private startButton: HTMLButtonElement;
	private stopButton: HTMLButtonElement;
	private playbackToggle: HTMLInputElement;
	private viewRecordingsButton: HTMLButtonElement;
	private statusText: HTMLElement;
	private statusDot: HTMLElement;
	private recordingInfo: HTMLElement;
	private recordingsSection: HTMLElement;
	private recordingsList: HTMLElement;
	private loginButton: HTMLButtonElement;
	private loginInfo: HTMLElement;

	private currentStatus: RecordingStatus = RecordingStatus.IDLE;
	private recordings: RecordingSession[] = [];
	private user: { id: string; name: string } | null = null;
	constructor() {
		// Get DOM elements
		this.startButton = document.getElementById(
			"startRecording",
		) as HTMLButtonElement;
		this.stopButton = document.getElementById(
			"stopRecording",
		) as HTMLButtonElement;
		this.playbackToggle = document.getElementById(
			"playbackToggle",
		) as HTMLInputElement;
		this.viewRecordingsButton = document.getElementById(
			"viewRecordings",
		) as HTMLButtonElement;
		this.statusText = document.getElementById("statusText") as HTMLElement;
		this.statusDot = document.getElementById("statusDot") as HTMLElement;
		this.recordingInfo = document.getElementById(
			"recordingInfo",
		) as HTMLElement;
		this.recordingsSection = document.getElementById(
			"recordingsSection",
		) as HTMLElement;
		this.recordingsList = document.getElementById(
			"recordingsList",
		) as HTMLElement;
		this.loginButton = document.getElementById("login") as HTMLButtonElement;
		this.loginInfo = document.getElementById("status") as HTMLElement;
		this.init();
	}

	private async init() {
		// Attach event listeners
		this.startButton.addEventListener("click", () => this.startRecording());
		this.stopButton.addEventListener("click", () => this.stopRecording());
		this.playbackToggle.addEventListener("change", () => this.togglePlayback());
		this.viewRecordingsButton.addEventListener("click", () =>
			this.toggleRecordingsList(),
		);
		this.loginButton.addEventListener("click", () => this.login());

		// Load initial state
		await this.loadState();
		await this.loadRecordings();
		await this.loadUser();
	}

	private async login() {
		const response = await chrome.runtime.sendMessage({
			type: MessageType.LOGIN,
		});

		if (response.success) {
			this.loginInfo.textContent = "Logged in successfully";
			this.loginButton.disabled = true;
			this.loginButton.textContent = "Logged in";
			this.loginButton.classList.add("btn-success");
		} else {
			this.loginInfo.textContent = "Failed to login";
			this.loginButton.disabled = false;
			this.loginButton.textContent = "Login";
			this.loginButton.classList.remove("btn-success");
		}
	}

	private async loadUser() {
		const data = await chrome.storage.local.get(["user"]);
		this.user = data.user || null;
		if (this.user) {
			this.loginInfo.textContent = "Logged in";
			this.loginButton.disabled = true;
			this.loginButton.textContent = "Logged in";
			this.loginButton.classList.add("btn-success");
		} else {
			this.loginButton.disabled = false;
			this.loginButton.textContent = "Login";
			this.loginButton.classList.remove("btn-success");
		}
	}

	private async loadState() {
		try {
			const response = await chrome.runtime.sendMessage({
				type: MessageType.GET_STATUS,
			});

			console.log("[Zordon Popup] LOAD STATE:", response);

			this.currentStatus = response.status;
			this.playbackToggle.checked = response.playbackEnabled;
			this.updateUI();
		} catch (error) {
			console.error("Error loading state:", error);
		}
	}

	private async loadRecordings() {
		try {
			const data = await chrome.storage.local.get(["recordings"]);
			this.recordings = data.recordings || [];
			this.renderRecordings();
		} catch (error) {
			console.error("Error loading recordings:", error);
		}
	}

	private async startRecording() {
		try {
			console.log("[Zordon Popup] Sending START_RECORDING message");

			const response = await chrome.runtime.sendMessage({
				type: MessageType.START_RECORDING,
			});

			console.log("[Zordon Popup] Response:", response);

			if (response?.success) {
				this.currentStatus = RecordingStatus.RECORDING;
				this.updateUI();
				console.log("[Zordon Popup] Recording started successfully");
			} else {
				this.showError(response?.error || "Failed to start recording");
			}
		} catch (error) {
			console.error("[Zordon Popup] Error starting recording:", error);
			this.showError(`Failed to start recording: ${(error as Error).message}`);
		}
	}

	private async stopRecording() {
		try {
			const response = await chrome.runtime.sendMessage({
				type: MessageType.STOP_RECORDING,
			});

			if (response.success) {
				this.currentStatus = RecordingStatus.IDLE;
				this.updateUI();
				await this.loadRecordings();
				this.showSuccess("Recording saved successfully!");
			}
		} catch (error) {
			console.error("Error stopping recording:", error);
			this.showError("Failed to stop recording");
		}
	}

	private async togglePlayback() {
		try {
			const enabled = this.playbackToggle.checked;
			await chrome.runtime.sendMessage({
				type: MessageType.TOGGLE_PLAYBACK,
				payload: { enabled },
			});
		} catch (error) {
			console.error("Error toggling playback:", error);
		}
	}

	private toggleRecordingsList() {
		const isVisible = this.recordingsSection.style.display !== "none";
		this.recordingsSection.style.display = isVisible ? "none" : "block";
	}

	private renderRecordings() {
		if (this.recordings.length === 0) {
			this.recordingsList.innerHTML =
				'<div class="empty-state">No recordings yet</div>';
			return;
		}

		this.recordingsList.innerHTML = "";

		// Sort by most recent first
		const sortedRecordings = [...this.recordings].sort(
			(a, b) => b.startTime - a.startTime,
		);

		sortedRecordings.forEach((recording) => {
			const item = document.createElement("div");
			item.className = "recording-item";

			const info = document.createElement("div");
			const stepsCount = recording.steps?.length || 0;
			const eventsCount = recording.events?.length || 0;

			info.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 2px;">${recording.title || "Untitled"}</div>
        <div style="opacity: 0.7; font-size: 12px;">
          ${new Date(recording.startTime).toLocaleString()} • ${this.formatDuration(recording.duration || 0)}
        </div>
        <div style="opacity: 0.6; font-size: 11px; margin-top: 2px;">
          ${stepsCount} steps • ${eventsCount} events
        </div>
      `;

			const actions = document.createElement("div");
			actions.style.cssText = "display: flex; gap: 4px;";

			const playButton = document.createElement("button");
			playButton.textContent = "▶️ Play";
			playButton.className = "btn-primary";
			playButton.onclick = () => this.playRecording(recording.id);

			const exportButton = document.createElement("button");
			exportButton.textContent = "📥";
			exportButton.className = "btn-secondary";
			exportButton.title = "Export as Chrome DevTools format";
			exportButton.onclick = () => this.exportRecording(recording);

			const deleteButton = document.createElement("button");
			deleteButton.textContent = "🗑️";
			deleteButton.className = "btn-danger";
			deleteButton.onclick = () => this.deleteRecording(recording.id);

			actions.appendChild(playButton);
			actions.appendChild(exportButton);
			actions.appendChild(deleteButton);

			item.appendChild(info);
			item.appendChild(actions);
			this.recordingsList.appendChild(item);
		});
	}

	private async playRecording(recordingId: string) {
		try {
			console.log("[Zordon Popup] Playing recording:", recordingId);

			// Get current tab
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			if (!tabs[0]?.id) {
				throw new Error("No active tab found");
			}

			const response = await chrome.runtime.sendMessage({
				type: MessageType.PLAY_RECORDING,
				payload: { recordingId },
			});

			console.log("[Zordon Popup] Playback response:", response);

			if (response?.success) {
				this.showSuccess("Playing recording...");
				// Close popup to show playback
				setTimeout(() => window.close(), 500);
			} else {
				this.showError(response?.error || "Failed to play recording");
			}
		} catch (error) {
			console.error("[Zordon Popup] Error playing recording:", error);
			this.showError(`Failed to play recording: ${(error as Error).message}`);
		}
	}

	private exportRecording(recording: RecordingSession) {
		try {
			// Create Chrome DevTools Recorder compatible format
			const chromeDevToolsFormat = {
				title: recording.title || "Untitled Recording",
				steps: recording.steps || [],
			};

			// Create downloadable file
			const blob = new Blob([JSON.stringify(chromeDevToolsFormat, null, 2)], {
				type: "application/json",
			});

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${recording.title || "recording"}-${recording.id}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			this.showSuccess("Recording exported successfully!");
		} catch (error) {
			console.error("Error exporting recording:", error);
			this.showError("Failed to export recording");
		}
	}

	private async deleteRecording(recordingId: string) {
		if (!confirm("Are you sure you want to delete this recording?")) {
			return;
		}

		try {
			const data = await chrome.storage.local.get(["recordings"]);
			const recordings = data.recordings || [];
			const filtered = recordings.filter(
				(r: RecordingSession) => r.id !== recordingId,
			);

			await chrome.storage.local.set({ recordings: filtered });
			await this.loadRecordings();
			this.showSuccess("Recording deleted");
		} catch (error) {
			console.error("Error deleting recording:", error);
			this.showError("Failed to delete recording");
		}
	}

	private updateUI() {
		switch (this.currentStatus) {
			case RecordingStatus.RECORDING:
				this.startButton.disabled = true;
				this.stopButton.disabled = false;
				this.statusText.textContent = "Recording in progress...";
				this.statusDot.classList.add("recording");
				this.recordingInfo.textContent = "🔴 Recording active on this page";
				break;

			case RecordingStatus.IDLE:
			default:
				this.startButton.disabled = false;
				this.stopButton.disabled = true;
				this.statusText.textContent = "Ready to record";
				this.statusDot.classList.remove("recording");
				this.recordingInfo.textContent = "";
				break;
		}
	}

	private formatDuration(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	}

	private showError(message: string) {
		// Simple error display - you can enhance this
		alert(`Error: ${message}`);
	}

	private showSuccess(message: string) {
		// Simple success display - you can enhance this
		this.recordingInfo.textContent = `✅ ${message}`;
		setTimeout(() => {
			if (this.currentStatus === RecordingStatus.IDLE) {
				this.recordingInfo.textContent = "";
			}
		}, 3000);
	}
}

// Initialize popup controller when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => new PopupController());
} else {
	new PopupController();
}
