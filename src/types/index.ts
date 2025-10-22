// Core types for the recording system
export enum RecordingStatus {
	IDLE = "idle",
	RECORDING = "recording",
	PAUSED = "paused",
	STOPPED = "stopped",
}

export enum InteractionType {
	CLICK = "click",
	INPUT = "input",
	CHANGE = "change",
	SUBMIT = "submit",
	SCROLL = "scroll",
	MOUSE_MOVE = "mousemove",
	KEY_DOWN = "keydown",
	KEY_UP = "keyup",
	FOCUS = "focus",
	BLUR = "blur",
	RESIZE = "resize",
	LOAD = "load",
}

export interface RecordingConfig {
	captureConsole: boolean;
	captureNetwork: boolean;
	maskSensitiveData: boolean;
	customSelectors?: string[];
}

export interface RecordingSession {
	id: string;
	url: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	events: any[];
	title?: string;
	steps?: any[];
}

export interface RecordingData {
	session: RecordingSession;
	events: any[];
	checksum?: string;
}

export interface StorageData {
	recordings: RecordingSession[];
	currentRecording?: RecordingSession;
	playbackEnabled: boolean;
	recordingStatus: RecordingStatus;
}

export interface Message {
	type: string;
	payload?: any;
}

export enum MessageType {
	START_RECORDING = "START_RECORDING",
	STOP_RECORDING = "STOP_RECORDING",
	PAUSE_RECORDING = "PAUSE_RECORDING",
	RESUME_RECORDING = "RESUME_RECORDING",
	GET_STATUS = "GET_STATUS",
	TOGGLE_PLAYBACK = "TOGGLE_PLAYBACK",
	PLAY_RECORDING = "PLAY_RECORDING",
	RECORDING_STARTED = "RECORDING_STARTED",
	RECORDING_STOPPED = "RECORDING_STOPPED",
	STATUS_UPDATE = "STATUS_UPDATE",
	LOGIN = "LOGIN",
	LOGIN_SUCCESS = "LOGIN_SUCCESS",
}
