
import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { loadModels } from '../utils/modelLoaders';
import { predictAgeWithGemini } from '../utils/geminiService';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const CameraPage: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [isFinished, setIsFinished] = useState(false); // Track if we are done
    const isFinishedRef = useRef(false); // Ref for the loop

    // State for tracking faces
    interface TrackedFace {
        id: string;
        center: { x: number; y: number };
        box: faceapi.Box;
        lastSeen: number;

        // Gemini State
        isAnalyzing: boolean;
        analysisStartTime?: number;
        hasFailed?: boolean;
        failureReason?: string;
        geminiResult: {
            age: number;
            gender: string;
            comment: string;
        } | null;
    }

    const trackedFaces = useRef<TrackedFace[]>([]);

    useEffect(() => {
        const startVideo = () => {
            navigator.mediaDevices
                .getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } } })
                .then((stream) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        setIsCameraActive(true);
                    }
                })
                .catch((err) => {
                    console.error(err);
                    setError("Camera access denied or not available");
                });
        };

        const init = async () => {
            try {
                // 1. Skip Connection Test (Saves Quota!)

                // 2. Load Face Models
                const loaded = await loadModels();
                if (loaded) {
                    setIsModelsLoaded(true);
                    startVideo();
                } else {
                    setError("Failed to load AI models");
                }
            } catch (err) {
                console.error(err)
                setError("Error initializing AI");
            }
        };
        init();
    }, []);

    const captureFaceImage = (): string | null => {
        if (!videoRef.current) return null;

        // Optimize: Downscale image for faster upload/processing
        const scaleFactor = 0.3; // Aggressive downscale for speed
        const w = videoRef.current.videoWidth * scaleFactor;
        const h = videoRef.current.videoHeight * scaleFactor;

        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = w;
        captureCanvas.height = h;
        const ctx = captureCanvas.getContext('2d');
        if (!ctx) return null;

        // Draw scaled frame
        ctx.drawImage(videoRef.current, 0, 0, w, h);

        return captureCanvas.toDataURL('image/jpeg', 0.7); // Slightly lower quality for speed
    };

    const handleVideoPlay = () => {
        if (!canvasRef.current || !videoRef.current) return;

        const displaySize = {
            width: videoRef.current.clientWidth,
            height: videoRef.current.clientHeight
        };

        faceapi.matchDimensions(canvasRef.current, displaySize);

        const detect = async () => {
            if (!videoRef.current || !canvasRef.current) return;

            // Use TinyFaceDetector for fast tracking (we don't need accurate age from it anymore)
            // SSD is better for detection but slower. Let's stick with SSD for detection reliability.
            const detections = await faceapi.detectAllFaces(
                videoRef.current,
                new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
            ); // We don't need .withAgeAndGender() anymore!

            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                // TRACKING LOGIC
                const currentFaces: TrackedFace[] = [];
                const now = Date.now();

                // 1. Match new detections to existing tracked faces
                for (const detection of resizedDetections) {
                    const box = detection.box;
                    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

                    let match: TrackedFace | undefined = undefined;
                    let minDist = 150; // threshold

                    // Search in previous frame's faces
                    for (const tracked of trackedFaces.current) {
                        const dist = Math.hypot(tracked.center.x - center.x, tracked.center.y - center.y);
                        if (dist < minDist) {
                            minDist = dist;
                            match = tracked;
                        }
                    }

                    if (match) {
                        // Update existing
                        match.center = center;
                        match.box = box;
                        match.lastSeen = now;

                        // Trigger Gemini if not analyzed yet, not analyzing, and hasn't failed
                        // AND if we haven't finished a prediction yet (Single result mode)
                        if (!match.geminiResult && !match.isAnalyzing && !match.hasFailed && !isFinishedRef.current) {
                            match.isAnalyzing = true; // Lock immediately
                            match.analysisStartTime = now;

                            // Capture image
                            const imageBase64 = captureFaceImage();

                            if (imageBase64) {
                                predictAgeWithGemini(imageBase64).then(async (response) => {
                                    // Artificial delay: Ensure at least 5 seconds of "Analyzing"
                                    const elapsed = Date.now() - match!.analysisStartTime!;
                                    const delay = Math.max(0, 5000 - elapsed);

                                    if (delay > 0) {
                                        await new Promise(resolve => setTimeout(resolve, delay));
                                    }

                                    if (response.result) {
                                        match!.geminiResult = response.result;
                                        // STOP EVERYTHING ELSE
                                        isFinishedRef.current = true;
                                        setIsFinished(true);
                                    } else {
                                        match!.hasFailed = true; // Mark as failed to stop retry loop
                                        match!.failureReason = response.error || "Failed";
                                    }
                                    match!.isAnalyzing = false;
                                });
                            } else {
                                match.isAnalyzing = false;
                            }
                        }

                        currentFaces.push(match);
                    } else {
                        // New face
                        currentFaces.push({
                            id: (now + Math.random()).toString(),
                            center: center,
                            box: box,
                            lastSeen: now,
                            isAnalyzing: false, // Wait one frame to stabilize? Or start immediately.
                            geminiResult: null
                        });
                    }
                }

                trackedFaces.current = currentFaces;

                // DRAWING LOGIC
                trackedFaces.current.forEach(face => {
                    const box = face.box;
                    // Mirror X
                    const mirroredX = displaySize.width - box.x - box.width;

                    // Box Color
                    if (face.geminiResult) {
                        context.strokeStyle = '#06b6d4'; // Cyan (Done)
                    } else if (face.isAnalyzing) {
                        context.strokeStyle = '#a855f7'; // Purple (Thinking)
                    } else {
                        context.strokeStyle = '#ffffff80'; // White (Tracking)
                    }

                    context.lineWidth = 3;
                    context.strokeRect(mirroredX, box.y, box.width, box.height);

                    // Text Generation
                    let text = "";
                    let comment = "";

                    if (face.geminiResult) {
                        text = `${face.geminiResult.age}y - ${face.geminiResult.gender}`;
                        comment = face.geminiResult.comment;
                    } else if (face.isAnalyzing && face.analysisStartTime) {
                        const elapsed = ((Date.now() - face.analysisStartTime) / 1000).toFixed(1);
                        text = `Analyzing... ${Math.min(parseFloat(elapsed), 5.0).toFixed(1)}s`;
                    } else if (face.hasFailed) {
                        text = face.failureReason || "Prediction Failed";
                    } else {
                        text = "Detecting...";
                    }

                    // Draw Text Background
                    context.font = 'bold 16px Inter';
                    const textWidth = context.measureText(text).width;

                    // Main Label
                    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    context.fillRect(mirroredX, box.y - 35, textWidth + 20, 30);
                    context.fillStyle = context.strokeStyle;
                    context.fillText(text, mirroredX + 10, box.y - 14);


                });
            }

            requestAnimationFrame(detect);
        };

        detect();
    };

    return (
        <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80 z-0"></div>

            {/* API Warning (if env missing) */}
            {!import.meta.env.VITE_GEMINI_API_KEY && (
                <div className="absolute top-0 w-full bg-red-500/80 text-white text-center p-2 z-50">
                    WARNING: No Gemini API Key found. Predictions will not work.
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="z-20 flex flex-col items-center text-red-500 bg-white/5 p-8 rounded-xl backdrop-blur-md border border-red-500/20">
                    <AlertTriangle className="w-12 h-12 mb-4" />
                    <p className="text-lg font-bold">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                        Back to Safety
                    </button>
                </div>
            )}

            {/* Loading State */}
            {(!isModelsLoaded || (!isCameraActive && !error)) && (
                <div className="z-20 flex flex-col items-center text-cyan-400">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="text-sm tracking-wider uppercase">Initializing Systems...</p>
                </div>
            )}

            {/* Video Container */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isCameraActive ? 1 : 0 }}
                className="absolute inset-0 w-full h-full"
            >
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    onPlay={handleVideoPlay}
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                />

                {/* Overlay Text */}
                <div className="absolute bottom-4 left-4 p-4 bg-black/50 backdrop-blur-sm rounded-lg flex items-center gap-3">
                    <Sparkles className="text-purple-400 w-5 h-5 animate-pulse" />
                    <p className="text-gray-200 text-xs tracking-wider uppercase">
                        Powered by Gemini AI
                    </p>
                </div>

                {/* RELOAD PROMPT ON SUCCESS */}
                {isFinished && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50"
                    >
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-white text-black px-8 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                            SCAN ANOTHER FACE
                        </button>
                    </motion.div>
                )}
            </motion.div>

            <button
                onClick={() => navigate('/')}
                className="absolute top-8 left-8 z-30 text-gray-500 hover:text-white transition-colors"
            >
                ← ABORT
            </button>
        </div>
    );
};

export default CameraPage;
