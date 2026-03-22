import { Server } from "socket.io";


let connections = {}
let message = {}
let timeOnLine = {}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED")

        socket.on("join-call", (data) => {
            const { roomId } = data;
            const path = roomId || "room-123";

            if (connections[path] === undefined) {
                connections[path] = []
            }
            connections[path].push(socket.id)

            timeOnLine[socket.id] = new Date();

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }

            if (message[path] !== undefined) {
                for (let a = 0; a < message[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", message[path][a]['data'],
                        message[path][a]['sender'], message[path][a]['socket-id-sender']
                    )
                }
            }
        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                if (message[matchingRoom] === undefined) {
                    message[matchingRoom] = []
                }

                message[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }
        })

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
            var diffTime = Math.abs(timeOnLine[socket.id] - new Date())

            for (const [roomKey, participants] of Object.entries(connections)) {
                const index = participants.indexOf(socket.id);
                if (index !== -1) {
                    participants.splice(index, 1);

                    // Notify others in the room
                    participants.forEach(participantId => {
                        io.to(participantId).emit('user-left', socket.id);
                    });

                    if (participants.length === 0) {
                        delete connections[roomKey];
                    }
                    console.log(`User ${socket.id} removed from room ${roomKey}`);
                    break;
                }
            }
            delete timeOnLine[socket.id];
        })


    })

    return io;
}

export default connectToSocket;