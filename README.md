# WhoNext Chat App

This is a full-stack real-time chat application designed to demonstrate modern web architecture, realtime communication, and data persistence. It is built with React for the frontend and Node.js + Express + Socket.io for the backend, with MongoDB for storage.

## Interview-Ready Application Summary

### What I built

I created a complete chat application with the following capabilities:

- **Username-based login**: users enter a nickname and join the chat instantly.
- **Real-time messaging**: messages are delivered instantly to all connected clients using Socket.io.
- **Persistent chat history**: every message is stored in MongoDB so users can reload and still see previous conversations.
- **Online/offline status**: the app tracks which users are currently connected and broadcasts presence updates.
- **Typing indicator**: users see when others are typing.
- **Message status**: each message includes a delivered/read state supported by backend updates.

### Tech stack

- **Frontend**: React
- **Backend**: Node.js + Express
- **Realtime**: Socket.io
- **Database**: MongoDB + Mongoose
- **HTTP client**: Axios
- **Dev tooling**: Nodemon for backend development

## Architecture Overview

### Frontend responsibilities

- Manages UI state with React hooks.
- Connects to Socket.io after the user logs in.
- Fetches existing messages from the backend via REST API.
- Emits socket events for sending messages, typing state, and read receipts.
- Listens for realtime events like new messages, online user updates, and typing notifications.
- Uses localStorage to preserve the logged-in username across refreshes.

### Backend responsibilities

- Serves REST endpoints for chat history and message creation.
- Hosts the Socket.io server for bidirectional real-time communication.
- Manages socket connections, joins, typing events, and disconnects.
- Persists chat messages and status updates in MongoDB.
- Broadcasts updates to all connected clients to keep the UI synchronized.

### Data persistence

- Messages are stored with fields for `sender`, `content`, `createdAt`, `delivered`, `read`, and `room`.
- This persistence enables chat history retrieval and message status tracking.

## Why this project is strong for interviews

### Realtime system design

- Demonstrates knowledge of WebSocket-based communication and event-driven messaging.
- Shows how to build a realtime experience without page refresh.
- Includes presence and typing indicators to improve UX.

### Full-stack architecture

- Separates frontend and backend concerns cleanly.
- Uses REST APIs for durable data access and Socket.io for transient realtime updates.
- Includes database persistence that can scale to rooms or multiple users.

### Scalable extension points

- The project can be extended with JWT authentication, private rooms, file attachments, and search.
- Message schema and socket structure already support future feature growth.

## Setup Instructions

### Backend

1. Open the `backend` folder.
2. Copy `.env` to `.env`.
3. Edit `.env` if you want to configure MongoDB or a different frontend origin.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend

1. Open the `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend:
   ```bash
   npm start
   ```

## Running the Application

- Launch the backend first.
- Then launch the frontend.
- Open the frontend in the browser.
- Enter a username to join the chat.
- Messages will be sent in realtime and persisted in the database.

## Notes

- Backend default port: `5000`
- Frontend expects backend at `http://localhost:5000`


