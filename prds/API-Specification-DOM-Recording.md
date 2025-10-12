# API Specification Document
## DOM Interaction Recording and Replay System

### 1. Overview

This document specifies the RESTful API design for the DOM Interaction Recording and Replay System. The API follows REST principles, uses JSON for data exchange, and implements OpenAPI 3.0 specifications.

**Base URL**: `https://api.recording-system.com/v1`
**Authentication**: Bearer token (JWT) or API Key
**Content Type**: `application/json`
**API Version**: v1.0.0

### 2. Authentication

#### 2.1 JWT Authentication

**Endpoint**: `POST /auth/login`
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member"
  }
}
```

#### 2.2 API Key Authentication

**Header**: `Authorization: Api-Key YOUR_API_KEY`

**API Key Management**:
```
POST   /auth/api-keys              // Create new API key
GET    /auth/api-keys              // List user's API keys
DELETE /auth/api-keys/{keyId}      // Revoke API key
PUT    /auth/api-keys/{keyId}      // Update API key settings
```

### 3. Recording Management API

#### 3.1 Create Recording

**Endpoint**: `POST /recordings`

**Request Body**:
```json
{
  "name": "User Login Flow",
  "description": "Complete user authentication process with error handling",
  "url": "https://example.com/login",
  "tags": ["authentication", "login", "critical-path"],
  "isPublic": false,
  "settings": {
    "captureConsole": true,
    "captureNetwork": true,
    "maskSensitiveData": true,
    "maxDuration": 300000,
    "customSelectors": ["data-testid", "data-qa"]
  }
}
```

**Response** (201 Created):
```json
{
  "id": "rec_123e4567-e89b-12d3-a456-426614174000",
  "name": "User Login Flow", 
  "description": "Complete user authentication process with error handling",
  "url": "https://example.com/login",
  "status": "ready",
  "isPublic": false,
  "tags": ["authentication", "login", "critical-path"],
  "userId": "usr_123e4567-e89b-12d3-a456-426614174000",
  "settings": {
    "captureConsole": true,
    "captureNetwork": true,
    "maskSensitiveData": true,
    "maxDuration": 300000,
    "customSelectors": ["data-testid", "data-qa"]
  },
  "metadata": {
    "duration": null,
    "stepCount": null,
    "fileSize": null,
    "recordingStarted": null,
    "recordingCompleted": null
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### 3.2 List Recordings

**Endpoint**: `GET /recordings`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Search term for name/description
- `tags`: Comma-separated list of tags to filter by
- `status`: Filter by status (`ready`, `recording`, `processing`, `completed`, `error`)
- `sortBy`: Sort field (`createdAt`, `updatedAt`, `name`, `duration`)
- `sortOrder`: Sort order (`asc`, `desc`)
- `userId`: Filter by user ID (admin only)

**Request**: `GET /recordings?page=1&limit=20&tags=authentication&sortBy=createdAt&sortOrder=desc`

**Response** (200 OK):
```json
{
  "recordings": [
    {
      "id": "rec_123e4567-e89b-12d3-a456-426614174000",
      "name": "User Login Flow",
      "description": "Complete user authentication process",
      "url": "https://example.com/login",
      "status": "completed",
      "isPublic": false,
      "tags": ["authentication", "login"],
      "userId": "usr_123e4567-e89b-12d3-a456-426614174000",
      "metadata": {
        "duration": 45000,
        "stepCount": 12,
        "fileSize": 2048576,
        "recordingStarted": "2024-01-15T10:30:00Z",
        "recordingCompleted": "2024-01-15T10:30:45Z"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:45Z",
      "lastAccessedAt": "2024-01-16T09:15:30Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "activeFilters": {
      "tags": ["authentication"],
      "sortBy": "createdAt",
      "sortOrder": "desc"
    },
    "availableFilters": {
      "tags": ["authentication", "ui-test", "regression", "critical-path"],
      "statuses": ["ready", "recording", "completed", "error"],
      "users": ["user1", "user2", "user3"]
    }
  }
}
```

#### 3.3 Get Recording Details

**Endpoint**: `GET /recordings/{recordingId}`

**Response** (200 OK):
```json
{
  "id": "rec_123e4567-e89b-12d3-a456-426614174000",
  "name": "User Login Flow",
  "description": "Complete user authentication process with error handling",
  "url": "https://example.com/login",
  "status": "completed",
  "isPublic": false,
  "tags": ["authentication", "login", "critical-path"],
  "userId": "usr_123e4567-e89b-12d3-a456-426614174000",
  "settings": {
    "captureConsole": true,
    "captureNetwork": true,
    "maskSensitiveData": true,
    "maxDuration": 300000,
    "customSelectors": ["data-testid", "data-qa"]
  },
  "metadata": {
    "duration": 45000,
    "stepCount": 12,
    "fileSize": 2048576,
    "compressionRatio": 0.85,
    "recordingStarted": "2024-01-15T10:30:00Z",
    "recordingCompleted": "2024-01-15T10:30:45Z",
    "browserInfo": {
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "viewport": {"width": 1920, "height": 1080},
      "platform": "Win32"
    }
  },
  "sharing": {
    "isShared": false,
    "sharedWith": [],
    "publicUrl": null,
    "shareSettings": {
      "allowDownload": false,
      "allowCopy": false,
      "expiresAt": null
    }
  },
  "analytics": {
    "playbackCount": 25,
    "lastPlayback": "2024-01-16T14:22:15Z",
    "successRate": 0.96,
    "averagePlaybackTime": 42000,
    "failureReasons": [
      {"reason": "Element not found", "count": 1},
      {"reason": "Network timeout", "count": 0}
    ]
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-16T14:22:15Z",
  "lastAccessedAt": "2024-01-16T14:22:15Z"
}
```

#### 3.4 Update Recording

**Endpoint**: `PUT /recordings/{recordingId}`

**Request Body**:
```json
{
  "name": "Updated Login Flow",
  "description": "Updated description with new test cases",
  "tags": ["authentication", "login", "critical-path", "regression"],
  "isPublic": true,
  "settings": {
    "captureConsole": true,
    "captureNetwork": false,
    "maskSensitiveData": true
  }
}
```

**Response** (200 OK):
```json
{
  "id": "rec_123e4567-e89b-12d3-a456-426614174000",
  "name": "Updated Login Flow",
  "description": "Updated description with new test cases",
  "tags": ["authentication", "login", "critical-path", "regression"],
  "isPublic": true,
  "updatedAt": "2024-01-16T15:45:30Z"
}
```

#### 3.5 Delete Recording

**Endpoint**: `DELETE /recordings/{recordingId}`

**Response** (204 No Content)

**Note**: This performs a soft delete. The recording is marked as deleted but data is retained for 30 days.

#### 3.6 Recording Data Upload

**Endpoint**: `POST /recordings/{recordingId}/upload`

**Request Body** (Multipart Form Data):
```
Content-Type: multipart/form-data

recordingData: [compressed binary data]
checksum: "sha256:abc123..."
chunkIndex: 1
totalChunks: 5
```

**Response** (200 OK):
```json
{
  "uploadId": "upload_123e4567-e89b-12d3-a456-426614174000",
  "chunkIndex": 1,
  "totalChunks": 5,
  "status": "uploading",
  "bytesReceived": 1048576,
  "nextChunkUrl": "/recordings/rec_123/upload?uploadId=upload_123&chunk=2"
}
```

#### 3.7 Get Recording Steps

**Endpoint**: `GET /recordings/{recordingId}/steps`

**Query Parameters**:
- `startStep`: Starting step number (default: 1)
- `endStep`: Ending step number (default: last step)
- `includeSnapshots`: Include DOM snapshots (default: false)

**Response** (200 OK):
```json
{
  "recordingId": "rec_123e4567-e89b-12d3-a456-426614174000",
  "steps": [
    {
      "stepNumber": 1,
      "timestamp": 0,
      "type": "load",
      "url": "https://example.com/login",
      "elementSelector": null,
      "data": {
        "loadTime": 1250,
        "domReady": 800,
        "resources": []
      },
      "domSnapshot": {
        "type": "full",
        "data": "[compressed_dom_data]",
        "checksum": "sha256:def456..."
      }
    },
    {
      "stepNumber": 2,
      "timestamp": 2500,
      "type": "click",
      "elementSelector": {
        "primarySelector": "#email-input",
        "fallbackSelectors": ["input[type='email']", "[data-testid='email-field']"],
        "xpath": "//*[@id='email-input']",
        "cssPath": "div.form-group > input#email-input",
        "attributes": {
          "id": "email-input",
          "type": "email",
          "name": "email",
          "data-testid": "email-field"
        },
        "textContent": "",
        "position": {"x": 350, "y": 200, "width": 300, "height": 40}
      },
      "data": {
        "coordinates": {"x": 500, "y": 220},
        "button": "left",
        "clickCount": 1
      }
    },
    {
      "stepNumber": 3,
      "timestamp": 3200,
      "type": "input",
      "elementSelector": {
        "primarySelector": "#email-input",
        "fallbackSelectors": ["input[type='email']"],
        "xpath": "//*[@id='email-input']"
      },
      "data": {
        "value": "user@example.com",
        "inputType": "text",
        "incremental": true
      }
    }
  ],
  "totalSteps": 12,
  "stepRange": {
    "start": 1,
    "end": 3
  }
}
```

### 4. Playback Management API

#### 4.1 Create Playback Session

**Endpoint**: `POST /playback/sessions`

**Request Body**:
```json
{
  "recordingId": "rec_123e4567-e89b-12d3-a456-426614174000",
  "environment": {
    "browser": "chrome",
    "browserVersion": "120.0",
    "platform": "linux",
    "viewport": {"width": 1920, "height": 1080},
    "userAgent": "custom-user-agent",
    "locale": "en-US",
    "timezone": "America/New_York"
  },
  "options": {
    "speed": 1.0,
    "skipInactivity": true,
    "maxInactivityTime": 3000,
    "autoWait": true,
    "debugMode": false,
    "strictMode": false,
    "stopOnError": false,
    "maxRetries": 3,
    "retryDelay": 1000,
    "screenshotOnError": true
  },
  "notifications": {
    "webhookUrl": "https://api.client.com/webhooks/playback",
    "emailNotifications": ["user@example.com"],
    "slackWebhook": "https://hooks.slack.com/webhook_url"
  }
}
```

**Response** (201 Created):
```json
{
  "sessionId": "sess_123e4567-e89b-12d3-a456-426614174000",
  "recordingId": "rec_123e4567-e89b-12d3-a456-426614174000",
  "status": "created",
  "environment": {
    "browser": "chrome",
    "browserVersion": "120.0",
    "platform": "linux",
    "viewport": {"width": 1920, "height": 1080}
  },
  "options": {
    "speed": 1.0,
    "skipInactivity": true,
    "autoWait": true
  },
  "progress": {
    "currentStep": 0,
    "totalSteps": 12,
    "percentage": 0,
    "estimatedTimeRemaining": null
  },
  "createdAt": "2024-01-16T16:00:00Z",
  "websocketUrl": "wss://api.recording-system.com/v1/playback/sessions/sess_123/ws"
}
```

#### 4.2 Get Playback Session Status

**Endpoint**: `GET /playback/sessions/{sessionId}`

**Response** (200 OK):
```json
{
  "sessionId": "sess_123e4567-e89b-12d3-a456-426614174000",
  "recordingId": "rec_123e4567-e89b-12d3-a456-426614174000",
  "userId": "usr_123e4567-e89b-12d3-a456-426614174000",
  "status": "running",
  "environment": {
    "browser": "chrome",
    "browserVersion": "120.0.6099.71",
    "platform": "linux",
    "viewport": {"width": 1920, "height": 1080},
    "actualUserAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
  },
  "progress": {
    "currentStep": 7,
    "totalSteps": 12,
    "percentage": 58.33,
    "elapsedTime": 15000,
    "estimatedTimeRemaining": 11000,
    "lastCompletedStep": {
      "stepNumber": 6,
      "type": "input",
      "timestamp": 14500,
      "status": "completed",
      "executionTime": 250
    }
  },
  "statistics": {
    "successfulSteps": 6,
    "failedSteps": 0,
    "retryCount": 1,
    "averageStepTime": 2083,
    "elementNotFoundCount": 0,
    "networkErrors": 0
  },
  "errors": [],
  "startedAt": "2024-01-16T16:00:15Z",
  "lastActivity": "2024-01-16T16:00:30Z",
  "estimatedCompletion": "2024-01-16T16:00:41Z"
}
```

#### 4.3 Control Playback Session

**Endpoint**: `POST /playback/sessions/{sessionId}/control`

**Pause Playback**:
```json
{
  "action": "pause"
}
```

**Resume Playback**:
```json
{
  "action": "resume"
}
```

**Seek to Step**:
```json
{
  "action": "seek",
  "parameters": {
    "step": 5
  }
}
```

**Change Speed**:
```json
{
  "action": "changeSpeed",
  "parameters": {
    "speed": 2.0
  }
}
```

**Stop Playback**:
```json
{
  "action": "stop"
}
```

**Response** (200 OK):
```json
{
  "sessionId": "sess_123e4567-e89b-12d3-a456-426614174000",
  "action": "pause",
  "status": "paused",
  "timestamp": "2024-01-16T16:00:35Z"
}
```

#### 4.4 Get Playback Results

**Endpoint**: `GET /playback/sessions/{sessionId}/results`

**Response** (200 OK):
```json
{
  "sessionId": "sess_123e4567-e89b-12d3-a456-426614174000",
  "recordingId": "rec_123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "summary": {
    "totalSteps": 12,
    "successfulSteps": 11,
    "failedSteps": 1,
    "skippedSteps": 0,
    "successRate": 91.67,
    "totalDuration": 28500,
    "averageStepTime": 2375
  },
  "stepResults": [
    {
      "stepNumber": 1,
      "status": "completed",
      "executionTime": 1250,
      "retryCount": 0,
      "error": null,
      "screenshot": "https://cdn.example.com/screenshots/sess_123/step_1.png"
    },
    {
      "stepNumber": 8,
      "status": "failed",
      "executionTime": 5000,
      "retryCount": 3,
      "error": {
        "type": "ElementNotFoundError",
        "message": "Could not locate element with selector '#submit-button'",
        "details": {
          "selector": "#submit-button",
          "fallbacksAttempted": [
            "input[type='submit']",
            "[data-testid='submit-btn']",
            "button:contains('Submit')"
          ],
          "suggestedSelectors": [
            "#login-submit",
            "button.submit-btn"
          ],
          "pageUrl": "https://example.com/login",
          "domSnapshot": "[compressed_dom_data]"
        }
      },
      "screenshot": "https://cdn.example.com/screenshots/sess_123/step_8_error.png"
    }
  ],
  "errors": [
    {
      "stepNumber": 8,
      "type": "ElementNotFoundError",
      "message": "Could not locate element with selector '#submit-button'",
      "timestamp": "2024-01-16T16:00:28Z",
      "severity": "error",
      "recoverable": true,
      "suggestions": [
        "Update element selector to '#login-submit'",
        "Add data-testid='submit-btn' to the element",
        "Verify element is visible and enabled before interaction"
      ]
    }
  ],
  "metrics": {
    "performance": {
      "memoryUsage": {
        "peak": 156234567,
        "average": 89345678
      },
      "networkRequests": 23,
      "domMutations": 156,
      "scriptExecutionTime": 1250
    },
    "reliability": {
      "elementFoundRate": 91.67,
      "networkSuccessRate": 100,
      "pageLoadSuccessRate": 100
    }
  },
  "artifacts": {
    "video": "https://cdn.example.com/videos/sess_123.mp4",
    "screenshots": [
      "https://cdn.example.com/screenshots/sess_123/step_1.png",
      "https://cdn.example.com/screenshots/sess_123/step_2.png"
    ],
    "logs": "https://cdn.example.com/logs/sess_123.txt",
    "reportUrl": "https://app.recording-system.com/sessions/sess_123/report"
  },
  "completedAt": "2024-01-16T16:00:43Z"
}
```

#### 4.5 List Playback Sessions

**Endpoint**: `GET /playback/sessions`

**Query Parameters**:
- `recordingId`: Filter by recording ID
- `status`: Filter by session status
- `startDate`: Sessions created after this date
- `endDate`: Sessions created before this date
- `page`: Page number
- `limit`: Items per page

**Response** (200 OK):
```json
{
  "sessions": [
    {
      "sessionId": "sess_123e4567-e89b-12d3-a456-426614174000",
      "recordingId": "rec_123e4567-e89b-12d3-a456-426614174000",
      "recordingName": "User Login Flow",
      "status": "completed",
      "successRate": 91.67,
      "duration": 28500,
      "environment": {
        "browser": "chrome",
        "platform": "linux"
      },
      "createdAt": "2024-01-16T16:00:00Z",
      "completedAt": "2024-01-16T16:00:43Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### 5. User Management API

#### 5.1 User Profile

**Get Current User**: `GET /user/profile`
```json
{
  "id": "usr_123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "member",
  "avatar": "https://cdn.example.com/avatars/user_123.jpg",
  "settings": {
    "theme": "dark",
    "notifications": {
      "email": true,
      "push": false,
      "slack": true
    },
    "defaultPlaybackSpeed": 1.0,
    "autoSaveRecordings": true
  },
  "subscription": {
    "plan": "pro",
    "status": "active",
    "expiresAt": "2024-12-31T23:59:59Z",
    "limits": {
      "recordingsPerMonth": 1000,
      "playbacksPerMonth": 5000,
      "storageGB": 10
    }
  },
  "usage": {
    "currentMonth": {
      "recordingsCreated": 45,
      "playbacksExecuted": 234,
      "storageUsedGB": 2.5
    }
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "lastLoginAt": "2024-01-16T15:30:00Z"
}
```

**Update User Profile**: `PUT /user/profile`
```json
{
  "name": "John Smith",
  "settings": {
    "theme": "light",
    "notifications": {
      "email": false,
      "slack": true
    },
    "defaultPlaybackSpeed": 1.5
  }
}
```

#### 5.2 Team Management (Pro/Enterprise)

**List Team Members**: `GET /team/members`
**Invite Team Member**: `POST /team/invitations`
**Remove Team Member**: `DELETE /team/members/{userId}`
**Update Member Role**: `PUT /team/members/{userId}/role`

### 6. Analytics API

#### 6.1 Recording Analytics

**Endpoint**: `GET /analytics/recordings`

**Query Parameters**:
- `timeRange`: Time range (7d, 30d, 90d, 1y, custom)
- `startDate`: Custom start date
- `endDate`: Custom end date
- `groupBy`: Group results by (day, week, month)
- `userId`: Filter by user (admin only)

**Response** (200 OK):
```json
{
  "summary": {
    "totalRecordings": 1247,
    "recordingsThisMonth": 156,
    "averageDuration": 42500,
    "averageSteps": 8.5,
    "averageFileSize": 1.2,
    "topUrls": [
      {
        "url": "https://example.com/login",
        "count": 89,
        "successRate": 94.5
      }
    ],
    "trends": {
      "recordingsCreated": [
        {"date": "2024-01-10", "value": 12},
        {"date": "2024-01-11", "value": 15},
        {"date": "2024-01-12", "value": 8}
      ],
      "averageDuration": [
        {"date": "2024-01-10", "value": 45000},
        {"date": "2024-01-11", "value": 39000},
        {"date": "2024-01-12", "value": 52000}
      ]
    }
  },
  "breakdowns": {
    "byStatus": {
      "completed": 1180,
      "processing": 23,
      "error": 44
    },
    "byTag": {
      "authentication": 234,
      "ui-test": 445,
      "regression": 567,
      "critical-path": 123
    },
    "byBrowser": {
      "chrome": 891,
      "firefox": 234,
      "safari": 122
    }
  }
}
```

#### 6.2 Playback Analytics

**Endpoint**: `GET /analytics/playback`

**Response** (200 OK):
```json
{
  "summary": {
    "totalSessions": 3456,
    "sessionsThisMonth": 445,
    "overallSuccessRate": 87.3,
    "averageDuration": 38500,
    "mostCommonErrors": [
      {
        "type": "ElementNotFoundError",
        "count": 156,
        "percentage": 45.2
      },
      {
        "type": "NetworkTimeoutError", 
        "count": 89,
        "percentage": 25.8
      }
    ]
  },
  "performance": {
    "averageElementLocationTime": 245,
    "averageInteractionTime": 123,
    "retryRate": 12.5,
    "timeoutRate": 3.2
  },
  "reliability": {
    "successRateByBrowser": {
      "chrome": 89.2,
      "firefox": 86.7,
      "safari": 82.1
    },
    "successRateByComplexity": {
      "simple": 95.6,
      "medium": 87.3,
      "complex": 78.9
    }
  }
}
```

### 7. Webhook API

#### 7.1 Webhook Management

**Register Webhook**: `POST /webhooks`
```json
{
  "url": "https://api.client.com/webhooks/recordings",
  "events": [
    "recording.completed",
    "recording.failed",
    "playback.completed", 
    "playback.failed"
  ],
  "secret": "webhook_secret_key",
  "retryPolicy": {
    "maxRetries": 3,
    "retryDelay": 5000
  },
  "headers": {
    "Authorization": "Bearer custom_token"
  }
}
```

**List Webhooks**: `GET /webhooks`
**Update Webhook**: `PUT /webhooks/{webhookId}`
**Delete Webhook**: `DELETE /webhooks/{webhookId}`
**Test Webhook**: `POST /webhooks/{webhookId}/test`

#### 7.2 Webhook Events

**Recording Completed Event**:
```json
{
  "event": "recording.completed",
  "timestamp": "2024-01-16T16:00:45Z",
  "data": {
    "recordingId": "rec_123e4567-e89b-12d3-a456-426614174000",
    "name": "User Login Flow",
    "userId": "usr_123e4567-e89b-12d3-a456-426614174000",
    "duration": 45000,
    "stepCount": 12,
    "fileSize": 2048576,
    "url": "https://example.com/login",
    "tags": ["authentication", "login"]
  }
}
```

**Playback Completed Event**:
```json
{
  "event": "playback.completed",
  "timestamp": "2024-01-16T16:00:43Z",
  "data": {
    "sessionId": "sess_123e4567-e89b-12d3-a456-426614174000",
    "recordingId": "rec_123e4567-e89b-12d3-a456-426614174000",
    "userId": "usr_123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "successRate": 91.67,
    "duration": 28500,
    "totalSteps": 12,
    "failedSteps": 1,
    "errors": [
      {
        "stepNumber": 8,
        "type": "ElementNotFoundError",
        "message": "Could not locate element"
      }
    ]
  }
}
```

### 8. Error Handling

#### 8.1 Standard Error Response Format

```json
{
  "error": {
    "code": "RECORDING_NOT_FOUND",
    "message": "The requested recording could not be found",
    "details": {
      "recordingId": "rec_invalid_id",
      "userId": "usr_123e4567-e89b-12d3-a456-426614174000"
    },
    "timestamp": "2024-01-16T16:00:00Z",
    "traceId": "trace_123e4567-e89b-12d3-a456-426614174000",
    "documentation": "https://docs.recording-system.com/errors#recording-not-found"
  }
}
```

#### 8.2 HTTP Status Codes

| Status Code | Description | Use Cases |
|-------------|-------------|-----------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST requests |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Invalid request data, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists, concurrent modification |
| 422 | Unprocessable Entity | Valid request format but business logic errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side errors |
| 502 | Bad Gateway | Upstream service errors |
| 503 | Service Unavailable | Temporary service outage |

#### 8.3 Common Error Codes

```json
{
  "AUTHENTICATION_FAILED": "Invalid credentials provided",
  "AUTHORIZATION_FAILED": "Insufficient permissions for this operation",
  "RECORDING_NOT_FOUND": "The requested recording could not be found",
  "SESSION_NOT_FOUND": "The playback session could not be found",
  "RECORDING_IN_PROGRESS": "Cannot modify recording while in progress",
  "SESSION_ALREADY_STARTED": "Playback session has already been started",
  "INVALID_RECORDING_DATA": "The recording data format is invalid",
  "ELEMENT_NOT_FOUND": "Could not locate the target element during playback",
  "QUOTA_EXCEEDED": "Account quota has been exceeded",
  "RATE_LIMIT_EXCEEDED": "API rate limit has been exceeded",
  "VALIDATION_ERROR": "Request validation failed",
  "WEBHOOK_DELIVERY_FAILED": "Failed to deliver webhook notification",
  "BROWSER_TIMEOUT": "Browser operation timed out",
  "NETWORK_ERROR": "Network request failed during playback"
}
```

### 9. Rate Limiting

#### 9.1 Rate Limit Headers

All API responses include rate limiting headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642377600
X-RateLimit-Window: 3600
```

#### 9.2 Rate Limits by Plan

| Plan | Requests/Hour | Concurrent Sessions | Upload Size |
|------|---------------|-------------------|-------------|
| Free | 100 | 1 | 100MB |
| Basic | 1,000 | 5 | 500MB |
| Pro | 10,000 | 25 | 2GB |
| Enterprise | Custom | Custom | Custom |

### 10. WebSocket API

#### 10.1 Playback Session WebSocket

**Connection**: `wss://api.recording-system.com/v1/playback/sessions/{sessionId}/ws`
**Authentication**: Query parameter `?token=JWT_TOKEN`

**Client → Server Messages**:
```json
{
  "type": "pause",
  "timestamp": "2024-01-16T16:00:30Z"
}

{
  "type": "resume", 
  "timestamp": "2024-01-16T16:00:35Z"
}

{
  "type": "seek",
  "data": {"step": 5},
  "timestamp": "2024-01-16T16:00:40Z"
}
```

**Server → Client Messages**:
```json
{
  "type": "status_update",
  "data": {
    "status": "running",
    "currentStep": 3,
    "progress": 25.0
  },
  "timestamp": "2024-01-16T16:00:20Z"
}

{
  "type": "step_completed",
  "data": {
    "stepNumber": 3,
    "status": "completed",
    "executionTime": 1250
  },
  "timestamp": "2024-01-16T16:00:22Z"
}

{
  "type": "error",
  "data": {
    "stepNumber": 8,
    "type": "ElementNotFoundError",
    "message": "Could not locate element",
    "recoverable": true
  },
  "timestamp": "2024-01-16T16:00:28Z"
}

{
  "type": "session_completed",
  "data": {
    "status": "completed",
    "successRate": 91.67,
    "totalDuration": 28500,
    "resultUrl": "/playback/sessions/sess_123/results"
  },
  "timestamp": "2024-01-16T16:00:43Z"
}
```

### 11. SDK Integration Examples

#### 11.1 Recording SDK Integration

**JavaScript/TypeScript**:
```javascript
import { RecordingSDK } from '@recording-system/sdk';

const recorder = new RecordingSDK({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.recording-system.com/v1'
});

// Start recording
const session = await recorder.startRecording({
  name: 'User Registration Flow',
  url: window.location.href,
  settings: {
    captureConsole: true,
    maskSensitiveData: true
  }
});

// Stop recording and upload
const recording = await recorder.stopRecording();
const uploadResult = await recording.upload();

console.log('Recording created:', uploadResult.recordingId);
```

#### 11.2 Playback SDK Integration

```javascript
import { PlaybackSDK } from '@recording-system/sdk';

const player = new PlaybackSDK({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.recording-system.com/v1'
});

// Execute playback
const session = await player.createSession({
  recordingId: 'rec_123',
  environment: {
    browser: 'chrome',
    viewport: { width: 1920, height: 1080 }
  },
  options: {
    speed: 1.5,
    autoWait: true
  }
});

// Monitor progress
session.on('progress', (progress) => {
  console.log(`Progress: ${progress.percentage}%`);
});

session.on('completed', (results) => {
  console.log('Playback completed:', results);
});

session.on('error', (error) => {
  console.error('Playback error:', error);
});

await session.start();
```

### 12. OpenAPI Schema

The complete API specification is available as an OpenAPI 3.0 schema at:
`https://api.recording-system.com/v1/openapi.json`

This includes:
- Complete endpoint definitions
- Request/response schemas
- Authentication schemes
- Example requests and responses
- Error code definitions
- Interactive API documentation at `/docs`

### 13. API Versioning

- Current version: `v1`
- Version specified in URL: `/v1/recordings`
- Backwards compatibility maintained for 2 years
- Deprecation notices provided 6 months before sunset
- New versions introduced for breaking changes only