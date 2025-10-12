import { RecordingStatus, MessageType, RecordingSession, StorageData } from '../types';

// Background service worker for managing extension state
class BackgroundService {
  private currentRecording: RecordingSession | null = null;
  private recordingStatus: RecordingStatus = RecordingStatus.IDLE;
  private playbackEnabled: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    // Initialize storage
    this.loadState();

    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && this.recordingStatus === RecordingStatus.RECORDING) {
        this.notifyContentScript(tabId);
      }
    });
  }

  private async loadState() {
    const data = await chrome.storage.local.get(['playbackEnabled', 'recordingStatus']);
    this.playbackEnabled = data.playbackEnabled || false;
    this.recordingStatus = data.recordingStatus || RecordingStatus.IDLE;
  }

  private async saveState() {
    await chrome.storage.local.set({
      playbackEnabled: this.playbackEnabled,
      recordingStatus: this.recordingStatus,
      currentRecording: this.currentRecording
    });
  }

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
    try {
      switch (message.type) {
        case MessageType.START_RECORDING:
          // Get active tab if not provided (e.g., when called from popup)
          let tabId = sender.tab?.id;
          if (!tabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            tabId = tabs[0]?.id;
          }
          await this.startRecording(tabId);
          sendResponse({ success: true, status: this.recordingStatus });
          break;

        case MessageType.STOP_RECORDING:
          const recording = await this.stopRecording();
          sendResponse({ success: true, recording });
          break;

        case MessageType.GET_STATUS:
          sendResponse({
            status: this.recordingStatus,
            playbackEnabled: this.playbackEnabled,
            currentRecording: this.currentRecording
          });
          break;

        case MessageType.TOGGLE_PLAYBACK:
          this.playbackEnabled = message.payload.enabled;
          await this.saveState();
          sendResponse({ success: true, enabled: this.playbackEnabled });
          break;

        case MessageType.PLAY_RECORDING:
          // Get active tab if not provided
          let playbackTabId = sender.tab?.id;
          if (!playbackTabId) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            playbackTabId = tabs[0]?.id;
          }
          await this.playRecording(message.payload.recordingId, playbackTabId);
          sendResponse({ success: true });
          break;

        case 'RECORDING_DATA':
          // Receive recording data from content script
          if (this.currentRecording) {
            this.currentRecording.events = message.payload.events;
            await this.saveRecording(this.currentRecording);
          }
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async startRecording(tabId?: number) {
    if (!tabId) {
      throw new Error('No active tab found');
    }

    try {
      const tab = await chrome.tabs.get(tabId);
      
      this.currentRecording = {
        id: `rec_${Date.now()}`,
        url: tab.url || '',
        startTime: Date.now(),
        events: [],
        title: tab.title || 'Untitled Recording'
      };

      this.recordingStatus = RecordingStatus.RECORDING;
      await this.saveState();

      console.log('[Zordon Background] Starting recording on tab:', tabId);

      // Send message to content script to start recording
      await chrome.tabs.sendMessage(tabId, {
        type: MessageType.START_RECORDING,
        payload: { sessionId: this.currentRecording.id }
      });
      
      console.log('[Zordon Background] Recording started successfully');
    } catch (error) {
      console.error('[Zordon Background] Error starting recording:', error);
      this.recordingStatus = RecordingStatus.IDLE;
      this.currentRecording = null;
      throw error;
    }
  }

  private async stopRecording(): Promise<RecordingSession | null> {
    if (!this.currentRecording) {
      return null;
    }

    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      // Request final data from content script
      await chrome.tabs.sendMessage(tabs[0].id, {
        type: MessageType.STOP_RECORDING
      });
    }

    this.currentRecording.endTime = Date.now();
    this.currentRecording.duration = this.currentRecording.endTime - this.currentRecording.startTime;

    await this.saveRecording(this.currentRecording);

    const recording = this.currentRecording;
    this.currentRecording = null;
    this.recordingStatus = RecordingStatus.IDLE;
    await this.saveState();

    return recording;
  }

  private async saveRecording(recording: RecordingSession) {
    const data = await chrome.storage.local.get(['recordings']);
    const recordings = data.recordings || [];
    
    // Update or add recording
    const index = recordings.findIndex((r: RecordingSession) => r.id === recording.id);
    if (index >= 0) {
      recordings[index] = recording;
    } else {
      recordings.push(recording);
    }

    await chrome.storage.local.set({ recordings });
  }

  private async playRecording(recordingId: string, tabId?: number) {
    console.log('[Zordon Background] Playing recording:', recordingId, 'on tab:', tabId);
    
    if (!tabId) {
      throw new Error('No active tab');
    }

    const data = await chrome.storage.local.get(['recordings']);
    const recordings = data.recordings || [];
    const recording = recordings.find((r: RecordingSession) => r.id === recordingId);

    if (!recording) {
      throw new Error('Recording not found');
    }

    console.log('[Zordon Background] Found recording:', recording.id, 'with', recording.events?.length || 0, 'events');

    if (!recording.events || recording.events.length === 0) {
      throw new Error('Recording has no events');
    }

    try {
      // Send recording to content script for playback
      await chrome.tabs.sendMessage(tabId, {
        type: MessageType.PLAY_RECORDING,
        payload: { recording }
      });
      
      console.log('[Zordon Background] Playback message sent successfully');
    } catch (error) {
      console.error('[Zordon Background] Error sending playback message:', error);
      throw new Error('Failed to communicate with page. Try refreshing the page.');
    }
  }

  private async notifyContentScript(tabId: number) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'TAB_UPDATED'
      });
    } catch (error) {
      console.error('Error notifying content script:', error);
    }
  }
}

// Initialize the service
new BackgroundService();

