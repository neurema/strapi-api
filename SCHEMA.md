# Strapi Schema Reference

## Overview

This document describes all Strapi collections, their attributes, types, and relations required by the neurema middleware API.

---

## Collections

### 1. `institutes`
**Purpose**: Store institute/college information for auto-linking users by email domain

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| name | string | yes | Institute name |
| emaildomain | string | yes | Email domain (e.g., "aiims.edu.in") |
| color | string | no | Theme color for UI |
| logo | media | no | Media (single image) |

**Relations**: None (referenced by profiles, classrooms)

---

### 2. `exams`
**Purpose**: Exam types (NEET-PG, etc.)

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| name | string | yes | Exam name |

**Relations**: Used by `subjects` (many-to-many), `classrooms` (many-to-one)

---

### 3. `subjects`
**Purpose**: Subjects linked to exams

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| name | string | yes | Subject name |

**Relations**:
- `exams` → many-to-many → `exam`

---

### 4. `topics`
**Purpose**: Study topics within subjects

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| name | string | yes | Topic name |
| section | string | no | Topic section |

**Relations**:
- `subject` → many-to-one → `subject`
- `ownerProfile` → many-to-one → `profile`

---

### 5. `profiles`
**Purpose**: User profiles with study settings

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| examType | string | no | e.g., "NEET-PG" |
| examDate | datetime | no | Exam date |
| studyMode | string | no | e.g., "Normal", "Intense" |
| isInstituteLinked | boolean | no | Whether linked to institute |
| collegeEmail | email | no | Student's college email |
| year | string | no | Academic year |
| rollNo | string | no | Roll number |
| dailyTopicLimit | integer | no | Max topics per day |
| defaultSessionDuration | integer | no | Default session length (min) |
| vivaCount | integer | no | Viva count |

**Relations**:
- `user` → one-to-one → `plugin::users-permissions.user`
- `institute` → many-to-one → `institute`
- `classroom` → many-to-many → `classroom`

---

### 6. `classrooms`
**Purpose**: Study groups/classes

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| name | string | yes | Classroom name |
| classCode | string | yes | Unique join code |
| examDate | datetime | no | Exam date |

**Relations**:
- `institute` → many-to-one → `institute`
- `teachers` → many-to-many → `plugin::users-permissions.user`
- `students` → many-to-many → `profile`
- `topics` → many-to-many → `topic`
- `exam` → many-to-one → `exam`

---

### 7. `user-topics`
**Purpose**: User's study progress per topic (spaced repetition tracking)

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| memoryLocation | string | no | "New", "Review", "Short-term", "Long-term", "Transition" |
| lastSession | datetime | no | Last study session |
| nextSession | datetime | no | Next scheduled session |
| timeTotal | integer | no | Total time spent |
| timeRemaining | integer | no | Time remaining |
| revisionsDone | integer | no | Number of revisions |
| teacherInstructions | text | no | Teacher's instructions |

**Relations**:
- `topic` → many-to-one → `topic`
- `profile` → many-to-one → `profile`

---

### 8. `study-sessions`
**Purpose**: Individual study sessions

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| isPaused | boolean | no | Whether session is paused |
| scheduledFor | datetime | yes | Scheduled start time |
| timeTakenForRevision | integer | no | Time on revision (seconds) |
| timeTakenForActivity | integer | no | Time on activity (seconds) |
| timeAllotted | integer | no | Time allowed (seconds) |
| scoreActivity | string | no | Score (as string) |
| difficultyLevel | string | no | "Easy", "Medium", "Hard" |

**Relations**:
- `user_topic` → many-to-one → `user-topic`

---

### 9. `analyses`
**Purpose**: Session analysis/feedback results

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| weakPoints | text | no | Identified weak points |
| blindSpots | text | no | Blind spots |
| strongPoints | text | no | Strong areas |
| metrics | text | no | Various metrics (JSON string) |
| areaOfImprovement | text | no | Areas to improve |
| transcription | text | no | Session transcription |

**Relations**:
- `study_session` → one-to-one → `study-session`

---

## API Endpoints Reference

### User API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/user/get` | GET | `email`, `lastSync?`, `populate?` | Get user by email |
| `/api/user/delete` | DELETE | body: `{email}` | Delete user |
| `/api/user/create` | POST | body: `{email, password, name}` | Create user |
| `/api/user/update` | PUT | body: `{email, name}` | Update user |
| `/api/user/me` | GET | header: `Authorization`, query: `populate?` | Get current user |
| `/api/user/login` | POST | body: `{identifier, password}` | Login |

### Profile API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/profile/get` | GET | `email`, `lastSync?` | Get profiles by email |
| `/api/profile/create` | POST | body: `{examType, examDate, studyMode, ...}` | Create profile |
| `/api/profile/verify-institution` | POST | body: `{email?, classCode?}` | Verify institute/classroom |
| `/api/profile/update/:profileId` | PUT | body: `{studyMode, ...}`, params: `classCode`, `classOperation` | Update profile |
| `/api/profile/delete/:profileId` | DELETE | | Delete profile |

### Subject/Exam API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/subject/get` | GET | `exam`, `lastSync?` | Get subjects for exam |
| `/api/exam/get` | GET | `lastSync?` | Get all exams |

### Topic API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/topic/create` | POST | body: `{name, subject, ownerProfile, section}` | Create topic |
| `/api/topic/get` | GET | `subject?`, `name?` | Get topics |
| `/api/topic/delete/:documentId` | DELETE | | Delete topic |

### UserTopic API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/user-topic/find-or-create` | POST | body: `{topicId, profileId, memoryLocation, ...}` | Find or create user-topic |
| `/api/user-topic/get` | GET | `profileId`, `lastSync?` | Get user topics |
| `/api/user-topic/delete/:userTopicId` | DELETE | | Delete user topic |

### Session API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/session/find-or-create` | POST | body: `{userTopicId, scheduledFor, isPaused, ...}` | Find or create session |
| `/api/session/get` | GET | `userTopicId?`, `profileId?`, `lastSync?` | Get sessions |

### Classroom API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/classroom/get` | GET | `instituteId` | Get classrooms by institute |
| `/api/classroom/by-code/:classCode` | GET | params: `classCode` | Get classroom by code |
| `/api/classroom/create` | POST | body: `{name, classCode, institute}`, header: `Authorization` | Create classroom |
| `/api/classroom/update/:id` | PUT | body: `{name, examDate}` | Update classroom |

### Teacher API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/teacher/assign-topic` | POST | body: `{classId, topicId, teacherInstructions?}` | Assign topic to class |
| `/api/teacher/topic-stats` | GET | `classId`, `topicId` | Get topic statistics |
| `/api/teacher/topic-instructions` | PUT | body: `{classId, topicId, teacherInstructions}` | Update instructions |

### Analysis API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/analysis/create` | POST | body: `{weakPoints, ... study_session}` | Create/update analysis |
| `/api/analysis/get` | GET | `sessionId?`, `lastSync?`, filters... | Get analyses |

### Content API
| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/content/articles` | GET | `lastSync?` | Get articles |
| `/api/content/categories/:id` | GET | `lastSync?` | Get category |

---

## Relation Summary Diagram

```
users-permissions.user
    ├── one-to-one → profile
    │                   ├── many-to-one → institute
    │                   ├── many-to-many → classroom (student)
    │                   └── one-to-many → user-topic
    │
    └── many-to-many → classroom (teacher)

institute
    └── one-to-many → profile
    └── one-to-many → classroom

classroom
    ├── many-to-one → institute
    ├── many-to-many → teachers (users)
    ├── many-to-many → students (profiles)
    ├── many-to-many → topics
    └── many-to-one → exam

topic
    ├── many-to-one → subject
    ├── many-to-one → ownerProfile (profile)
    └── many-to-many → classroom

subject
    └── many-to-many → exams

user-topic
    ├── many-to-one → profile
    ├── many-to-one → topic
    └── one-to-many → study-session

study-session
    └── one-to-one → user-topic

analysis
    └── one-to-one → study-session
```

---

## Attribute Types

| Strapi Type | Description |
|-------------|-------------|
| string | Short text |
| text | Long text |
| integer | Whole number |
| float | Decimal number |
| boolean | true/false |
| datetime | ISO date/time |
| email | Email address |
| media | File/image |
| relation | Relationship to another collection |
| json | JSON object |
| enumeration | Fixed set of values |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `STRAPI_URL` | Strapi admin URL (default: http://localhost:1337) |
| `STRAPI_ADMIN_TOKEN` | Admin API token for setup script |
| `STRAPI_USER_API_TOKEN` | User API token for middleware |
| `STRAPI_CONTENT_API_TOKEN` | Content API token for middleware |