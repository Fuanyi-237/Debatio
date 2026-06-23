# Debatio - Structured Debate & Roundtable Platform

A platform designed to host structured debates and roundtable discussions aimed at discovering truth, not winning arguments.

## Vision

Unlike traditional social media debates driven by ego or popularity, Debatio enforces order, fairness, and intellectual honesty through:
- Structured turns and time-controlled speaking
- Rule enforcement automation
- Argument threading with visual tree structure
- Consensus tracking and agreement mapping

## Features

### Core Functionality
- **Debate Sessions**: Two or more opposing viewpoints with structured rounds
- **Roundtable Discussions**: Collaborative discussions for consensus building
- **Smart Video Room**: WebRTC-powered video/audio with speaker highlighting
- **Speaking Queue**: Raised hand system with moderator-controlled turns
- **Real-time Transcription**: Speech-to-text for searchable discussion logs
- **Screen Sharing**: Share your screen during presentations and debates
- **Session Recording**: Record audio, video, and screen with playback

### Advanced Features
- **Argument Threading**: Tree structure for tracking reasoning and rebuttals
- **Evidence Board**: Upload and tag references, scriptures, links
- **Consensus Engine**: Vote on statements, track agreement levels
- **Rule Enforcement**: Automated enforcement of debate rules
- **Post-Session Analytics**: AI-assisted summaries and consensus reports
- **Live Captions**: Real-time speech-to-text transcription with Web Speech API
- **Breakout Rooms**: Split participants into smaller discussion groups
- **Waiting Room**: Host approval system for session entry control
- **Device Health Check**: Pre-session camera, microphone, and speaker verification
- **Personal Notes**: Private and public note-taking during sessions
- **Custom Branding**: Logo, colors, and welcome message customization
- **Multi-language Support**: UI translations for 8 languages (English, Spanish, French, German, Chinese, Arabic, Hindi, Japanese)

## Tech Stack

### Backend
- **FastAPI** (Python) - High-performance async API framework
- **MongoDB** - Flexible document database
- **Redis** - Caching and real-time state management
- **WebSockets** - Real-time communication (Socket.io)

### Frontend
- **Next.js 14** - React framework with SSR/SSG
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **React Query** - Server state management

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)



1. Clone the repository:
```bash
git clone https://github.com/Fuanyi-237/Debatio
cd debatio
```

2. Copy environment files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
debatio/
├── backend/
│   ├── app/
│   │   ├── api/           # REST API routes
│   │   ├── core/          # Configuration, database, security
│   │   ├── models/        # Pydantic models
│   │   ├── websocket/     # WebSocket handlers
│   │   └── main.py        # Application entry point
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   ├── lib/               # Utilities, API, store
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/{id}` - Get session details
- `POST /api/sessions/{id}/join` - Request to join
- `POST /api/sessions/{id}/start` - Start session
- `POST /api/sessions/{id}/end` - End session
- `GET /api/sessions/{id}/replay` - Get session replay/timeline

### Arguments
- `GET /api/arguments/session/{id}` - Get session arguments
- `POST /api/arguments` - Submit argument
- `POST /api/arguments/{id}/vote` - Vote on argument

### Recordings
- `POST /api/sessions/{id}/recordings/start` - Start session recording
- `POST /api/sessions/{id}/recordings/{rid}/stop` - Stop recording
- `GET /api/sessions/{id}/recordings` - Get session recordings

### Notes
- `POST /api/sessions/{id}/notes` - Create personal note
- `GET /api/sessions/{id}/notes` - Get my notes
- `PUT /api/sessions/{id}/notes/{nid}` - Update note
- `DELETE /api/sessions/{id}/notes/{nid}` - Delete note

### Waiting Room
- `POST /api/sessions/{id}/waiting-room/join` - Join waiting room
- `GET /api/sessions/{id}/waiting-room` - Get waiting list (host only)
- `POST /api/sessions/{id}/waiting-room/{eid}/approve` - Approve user
- `POST /api/sessions/{id}/waiting-room/{eid}/reject` - Reject user

### Breakout Rooms
- `POST /api/sessions/{id}/breakout-rooms` - Create breakout room
- `GET /api/sessions/{id}/breakout-rooms` - Get breakout rooms
- `POST /api/sessions/{id}/breakout-rooms/{bid}/join` - Join breakout room
- `POST /api/sessions/{id}/breakout-rooms/{bid}/end` - End breakout room

### WebSocket Events
- `join_session` - Join a session room
- `leave_session` - Leave a session room
- `raise_hand` - Request to speak
- `assign_speaking_turn` - Moderator assigns turn
- `end_speaking_turn` - End current speaking turn
- `send_chat_message` - Send chat message
- `screen_share_started` - Screen sharing started
- `screen_share_stopped` - Screen sharing stopped
- `recording_started` - Recording started
- `recording_stopped` - Recording stopped

## User Roles

- **Host**: Creates session, defines rules, assigns roles
- **Moderator**: Enforces rules, manages speaking turns
- **Speaker**: Participates actively, presents arguments
- **Observer**: Watches session, can request to speak

## Environment Variables

### Backend
- `MONGODB_URL` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - JWT secret key
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration time

### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Roadmap

### Completed Features
- [x] User authentication
- [x] Session creation and management
- [x] WebSocket real-time communication
- [x] Speaking queue system
- [x] Basic rule enforcement
- [x] Argument threading
- [x] Consensus voting
- [x] Screen sharing (WebRTC)
- [x] Session recording
- [x] Session replay/timeline
- [x] Live captions (Web Speech API)
- [x] Breakout rooms
- [x] Waiting room
- [x] Device/health check
- [x] Personal notes
- [x] Custom branding
- [x] Multi-language support (8 languages)
- [x] Evidence attachments

### Future
- [ ] Mobile app (Flutter)
- [ ] AI moderator assistant
- [ ] Advanced analytics dashboard
- [ ] Global debate rankings
- [ ] Video streaming optimization
- [ ] Recording cloud storage

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contact

For questions or support, please open an issue on GitHub.
# Debatio
