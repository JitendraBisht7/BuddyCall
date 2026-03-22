import React, { useEffect, useRef, useState } from "react";
import { Button, TextField, Box, Input, IconButton, Badge } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ScreenShareIcon from '@mui/icons-material/ScreenShare'
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat'
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import io from 'socket.io-client';
import server from "../environment";

import styles from "../Styles/videoComponent.module.css"

const server_url = server;

var connections = {};

const peerConfigConnection = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" }
    ]
};

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoRef = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState();

    let [audio, setAudio] = useState();

    let [screen, setScreen] = useState();

    let [showModel, setShowModel] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([]);

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState();

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([])
    const chatEndRef = useRef(null);

    let [videos, setVideos] = useState([])

    const getPermissions = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // Check tracks directly (no state timing issues)
            const hasVideo = stream.getVideoTracks().length > 0;
            const hasAudio = stream.getAudioTracks().length > 0;

            setVideoAvailable(hasVideo);
            setAudioAvailable(hasAudio);

            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

            // Attach stream to video element
            window.localStream = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

        } catch (error) {
            console.error("Permission denied or error:", error);
            setVideoAvailable(false);
            setAudioAvailable(false);
        }
    };


    useEffect(() => {
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    let getUserMediaSuccess = (stream) => {
        window.localStream = stream;
        localVideoRef.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            try {
                // Add tracks to existing peer connections
                stream.getTracks().forEach(track => {
                    connections[id].addTrack(track, stream);
                });

                // Create offer with new tracks
                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit("signal", id, JSON.stringify({ "sdp": connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            } catch (e) {
                console.log(e)
            }
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false)
            setAudio(false);

            try {
                if (localVideoRef.current && localVideoRef.current.srcObject && localVideoRef.current.srcObject.getTracks) {
                    let tracks = localVideoRef.current.srcObject.getTracks()
                    tracks.forEach(track => track.stop())
                }
            } catch (e) {
                console.log(e)
            }

            // Replace with silent/black stream
            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            localVideoRef.current.srcObject = window.localStream;

            for (let id in connections) {
                try {
                    // Add black/silent tracks to all connections
                    window.localStream.getTracks().forEach(track => {
                        connections[id].addTrack(track, window.localStream);
                    });

                    connections[id].createOffer().then((description) => {
                        connections[id].setLocalDescription(description)
                            .then(() => {
                                socketRef.current.emit("signal", id, JSON.stringify({ "sdp": connections[id].localDescription }))
                            }).catch(e => console.log(e));
                    })
                } catch (e) {
                    console.log(e)
                }
            }
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator();

        let dst = oscillator.connect(ctx.createMediaStreamDestination());

        oscillator.start();
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }

    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });

        const ctx = canvas.getContext('2d')
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop())
            } catch (e) {
                console.log(e)
            }
        }
    }

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [audio, video])

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === "offer") {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit("signal", fromId, JSON.stringify({ "sdp": connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice && connections[fromId]) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
            }
        }
    }

    let addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data, time: new Date() }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prev) => (prev || 0) + 1);
        }
    }

    let connectToSocketServer = () => {

        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on("connect", () => {

            socketRef.current.emit("join-call", {
                roomId: window.location.href.split("/").pop(),
                username
            });

            socketIdRef.current = socketRef.current.id

            socketRef.current.on("chat-message", addMessage)

            socketRef.current.on("user-left", (id) => {
                console.log("User left:", id);
                setVideos((videos) => videos.filter((video) => video.socketId !== id))

                // Clean up peer connection
                if (connections[id]) {
                    connections[id].close();
                    delete connections[id];
                }
            })

            socketRef.current.on("user-joined", (id, clients) => {
                clients.forEach((socketListId) => {
                    // Prevent connecting to self or re-connecting to existing peer
                    if (socketListId === socketIdRef.current || connections[socketListId]) return;

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnection)

                    // ICE candidate handler
                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate != null) {
                            socketRef.current.emit("signal", socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Connection state monitoring for debugging
                    connections[socketListId].oniceconnectionstatechange = () => {
                        console.log(`ICE Connection State (${socketListId}):`, connections[socketListId].iceConnectionState);
                    }

                    connections[socketListId].onconnectionstatechange = () => {
                        console.log(`Connection State (${socketListId}):`, connections[socketListId].connectionState);
                    }

                    // Track handler - receives remote streams
                    connections[socketListId].ontrack = (event) => {
                        console.log("Received track from:", socketListId);

                        setVideos(videos => {
                            let videoExists = videos.find(video => video.socketId === socketListId);
                            if (videoExists) {
                                return videos.map(v => v.socketId === socketListId ? { ...v, stream: event.streams[0] } : v);
                            } else {
                                return [...videos, {
                                    socketId: socketListId,
                                    stream: event.streams[0],
                                    autoPlay: true,
                                    playsinline: true
                                }];
                            }
                        });
                    };

                    // Add local tracks to peer connection
                    if (window.localStream !== undefined && window.localStream !== null) {
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    } else {
                        // Create black/silent stream if no media available
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence();
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    }
                })

                // If this is our own join event, create offers to all existing peers
                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].createOffer().then((description) => {
                                connections[id2].setLocalDescription(description)
                                    .then(() => {
                                        socketRef.current.emit("signal", id2, JSON.stringify({ "sdp": connections[id2].localDescription }))
                                    })
                                    .catch(e => console.log(e))
                            })
                        } catch (e) {
                            console.log(e);
                        }
                    }
                }
            })
        })
    }

    let getMedia = async () => {
        await getPermissions();   // ensure stream exists
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }

    let toggleVideo = () => {
        setVideo(!video);
        for (let track of window.localStream.getVideoTracks()) {
            track.enabled = !track.enabled;
        }
    }

    let toggleAudio = () => {
        setAudio(!audio);
        for (let track of window.localStream.getAudioTracks()) {
            track.enabled = !track.enabled;
        }
    }

    let toggleScreenShare = () => {
        if (!screen) {
            navigator.mediaDevices.getDisplayMedia({ video: true })
                .then((stream) => {
                    const screenTrack = stream.getVideoTracks()[0];

                    // Replace video track in all peer connections
                    for (let id in connections) {
                        const senders = connections[id].getSenders();
                        const sender = senders.find(s => s.track && s.track.kind === 'video');
                        if (sender) {
                            sender.replaceTrack(screenTrack);
                        }
                    }

                    // Handle screen share stop
                    screenTrack.onended = () => {
                        stopScreenShare();
                    };

                    // Disable camera track to "stop video" while sharing
                    if (window.localStream) {
                        window.localStream.getVideoTracks().forEach(track => track.enabled = false);
                    }

                    localVideoRef.current.srcObject = stream;
                    setScreen(true);
                    setVideo(false);
                })
                .catch(e => console.log(e));
        } else {
            stopScreenShare();
        }
    }

    let stopScreenShare = () => {
        if (window.localStream) {
            const videoTrack = window.localStream.getVideoTracks()[0];
            for (let id in connections) {
                const senders = connections[id].getSenders();
                const sender = senders.find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            }
            window.localStream.getVideoTracks().forEach(track => track.enabled = true);
            localVideoRef.current.srcObject = window.localStream;
        }
        setScreen(false);
        setVideo(true);
    }

    let toggleChat = () => {
        if (showModel) {
            setShowModel(false);
        } else {
            setShowModel(true);
            setNewMessages(0);
        }
    }

    let sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit("chat-message", message, username);
        setMessage("");
    }

    let handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <div className={styles.meetVideoContainer}>
            {askForUsername === true ?
                <div className={styles.lobbyContainer}>
                    <h2>Enter into lobby</h2>
                    <TextField
                        id="outlined-basic"
                        label="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        variant="outlined"
                        sx={{ input: { color: 'white' }, label: { color: 'rgba(255,255,255,0.7)' } }}
                    />
                    <Button variant="contained" onClick={connect} sx={{ borderRadius: '20px', padding: '10px 30px' }}>Connect</Button>

                    <div>
                        <video className={styles.lobbyVideoPreview} ref={localVideoRef} autoPlay muted></video>
                    </div>
                </div>
                :
                <>

                    {showModel && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatHeader}>
                                    <span className={styles.chatTitle}>💬 Chat</span>
                                    <IconButton onClick={toggleChat} size="small" sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </div>

                                <div className={styles.chattingDisplay}>
                                    {messages.length === 0 && (
                                        <div className={styles.emptyChat}>
                                            <p>No messages yet</p>
                                            <span>Be the first to say hi! 👋</span>
                                        </div>
                                    )}
                                    {messages.map((item, index) => {
                                        const isOwn = item.sender === username;
                                        const time = item.time ? new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                        return (
                                            <div className={`${styles.messageBubble} ${isOwn ? styles.ownMessage : ''}`} key={index}>
                                                {!isOwn && <span className={styles.senderName}>{item.sender}</span>}
                                                <p className={styles.messageText}>{item.data}</p>
                                                <span className={styles.messageTime}>{time}</span>
                                            </div>
                                        );
                                    })}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className={styles.chattingArea}>
                                    <input
                                        className={styles.chatInput}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Type a message…"
                                        id="chat-input"
                                    />
                                    <IconButton onClick={sendMessage} sx={{ color: message.trim() ? '#6C63FF' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>
                                        <SendIcon />
                                    </IconButton>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.buttonContainer}>
                        <IconButton
                            onClick={toggleVideo}
                            style={{ color: video ? "white" : "red" }}
                            title={video ? "Turn off video" : "Turn on video"}
                        >
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton
                            onClick={toggleAudio}
                            style={{ color: audio ? "white" : "red" }}
                            title={audio ? "Turn off audio" : "Turn on audio"}
                        >
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        <IconButton
                            onClick={toggleScreenShare}
                            style={{ color: screen ? "#4CAF50" : "white" }}
                            title={screen ? "Stop screen share" : "Start screen share"}
                        >
                            {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </IconButton>
                        <IconButton
                            onClick={() => {
                                if (socketRef.current) socketRef.current.disconnect();
                                setAskForUsername(true);
                                setVideos([]);
                                setMessages([]);
                                setNewMessages(0);
                                setShowModel(true);
                                connections = {};
                            }}
                            style={{ color: "red" }}
                            title="Disconnect"
                        >
                            <CallEndIcon />
                        </IconButton>
                        <Badge badgeContent={newMessages} overlap="circular" color="error">
                            <IconButton
                                onClick={toggleChat}
                                style={{ color: "white" }}
                                title="Chat"
                            >
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                    <div className={styles.conferenceView}>
                        <video className={styles.meetUserVideo} ref={localVideoRef} autoPlay muted></video>
                        {videos.map((video) => (
                            <div key={video.socketId} className={styles.videoWrapper}>
                                <video
                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay
                                    playsInline
                                >
                                </video>
                            </div>
                        ))}
                    </div>
                </>
            }
        </div>
    )
}
