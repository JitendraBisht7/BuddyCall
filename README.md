# BuddyCall (VideoCall Platform) 🎥

A full-stack, real-time video calling platform built with the MERN stack and Socket.io.

## Features
- **Real-Time Video/Audio Calls**: Peer-to-peer web streaming architecture connected via Socket.io signaling.
- **Secure Authentication**: Built from the ground up using secure JSON Web Tokens (JWT) for authentication and API validation.
- **Call History**: A comprehensive view of all past meetings joined or created by users.
- **Responsive UI**: A modern interface designed with React and Material UI (`@mui/material`).

## Tech Stack
- **Frontend**: React, Vite, Axios, Socket.io-client, Material UI, React Router v6
- **Backend**: Node.js, Express, MongoDB, Mongoose, Socket.io, BCrypt, jsonwebtoken

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.6+ is recommended as we leverage its native `.env` loading feature).
- [MongoDB Atlas](https://www.mongodb.com/) (or a local MongoDB instance).

### 1. Setting up the Backend
Navigate to your backend directory and install the necessary dependencies:
```bash
cd Backend
npm install
```

Ensure your `Backend/.env` file is adequately populated with your secrets. It should look something like this:
```env
MONGO_URL=mongodb+srv://<USER>:<PASSWORD>@<CLUSTER>.mongodb.net/
JWT_SECRET=your_super_secret_jwt_key
PORT=8000
```

Start the backend server. Make sure to use the `--env-file` parameter to inject the `.env` variables from Node organically!
```bash
node --env-file=.env src/app.js
```

### 2. Setting up the Frontend
In a new terminal window, navigate to your frontend directory and install the required dependencies:
```bash
cd Frontend
npm install
```

Start up the Vite development server:
```bash
npm run dev
```

Open up your browser, log in to create your first session token, and start calling!
