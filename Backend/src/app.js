import express from "express";
import { createServer } from "node:http";
import { env } from "node:process";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import mongoose from "mongoose";
import { connectToSocket } from "./Controller/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js"

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000))
app.use(cors());
app.use(express.json({limit: "40kb"}));
app.use(express.urlencoded({limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, "../../Frontend/build")));

// Fallback to index.html for all other routes (SPA routing)
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "../../Frontend/build", "index.html"));
});


const start = async() => {

app.set("mongo_user")
    const connectionDb = await mongoose.connect(env.MONGO_URL)

  console.log(`MONGO connected DB host: ${connectionDb.connection.host}`)
  server.listen(app.get("port"), () => {
  console.log("Server is running on port 8000");
});

}

start();





