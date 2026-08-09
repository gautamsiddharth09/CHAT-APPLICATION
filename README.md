# Socket.IO Chat App

A real-time chat application built with React, Node.js, Express, MongoDB, and Socket.io.

## Features

- Username-based dummy login
- Realtime messaging with Socket.io
- Chat history persisted in MongoDB
- Online/offline user presence
- Typing indicator
- Message read/delivered status

## Setup

### Backend

1. Open `backend` folder.
2. Copy `.env.example` to `.env` and update `MONGODB_URI` if needed.
3. Run `npm install`.
4. Run `npm run dev`.

### Frontend

1. Open `frontend` folder.
2. Run `npm install`.
3. Run `npm start`.

## Notes

- Backend listens on port `5000` by default.
- Frontend expects the backend at `http://localhost:5000`.
