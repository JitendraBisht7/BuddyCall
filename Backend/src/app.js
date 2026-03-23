import express from "express";
import { createServer } from "node:http";
import { env } from "node:process";
import dotenv from "dotenv";

dotenv.config();


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


const start = async() => {
    const connectionDb = await mongoose.connect(env.MONGO_URL)

  console.log(`MONGO connected DB host: ${connectionDb.connection.host}`)
  server.listen(app.get("port"), () => {
  console.log("Server is running on port 8000");
});

}

start();





