import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionStatus, TrafficViolation } from '../types';
import { createPcmBlob, decode, decodeAudioData, blobToBase64 } from '../utils/audio-utils';
import { lookupVehicle } from '../utils/rto-database';
import { uploadToCloudinary } from '../utils/upload-utils';
import { saveViolationToFirestore } from '../utils/firebase-utils';
import { sendViolationEmail } from '../utils/email-utils';

// LiveSession is not exported from @google/genai, using any to bypass type check for the session object
type LiveSession = any;

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const FRAME_RATE = 5; // Increased to 5 FPS for better motion capture
const JPEG_QUALITY = 0.8; 

const FINE_RATES: Record<string, number> = {
  helmet_missing_driver: 1000,
  helmet_missing_pillion: 1000,
  triple_riding: 2000,
  wrong_side: 1500,
  signal_jump: 1000,
  mobile_usage_driver: 2000,
  no_seatbelt_driver: 1000,
  no_seatbelt_passenger: 500,
  red_light_signal_break: 800,
};

// Tool Definition
const reportViolationTool: FunctionDeclaration = {
  name: 'report_violation',
  description: 'Report a detected traffic violation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      violation_detected: {
        type: Type.BOOLEAN,
        description: 'Whether a violation was detected.',
      },
      violation_type: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          enum: [
            "helmet_missing_driver", 
            "helmet_missing_pillion", 
            "triple_riding", 
            "mobile_usage_driver", 
            "number_plate_missing",
            "red_light_signal_break",
            "wrong_side",
            "signal_jump",
            "no_seatbelt_driver",
            "no_seatbelt_passenger"
          ]
        },
        description: 'List of detected violations.',
      },
      vehicle_number: {
        type: Type.STRING,
        description: 'The vehicle number plate text, or empty string if unclear.',
      },
      vehicle_type: {
        type: Type.STRING,
        enum: ["bike", "scooter", "car", "auto", "truck", "unknown"],
        description: 'Type of the vehicle involved.',
      }
    },
    required: ['violation_detected', 'violation_type', 'vehicle_number', 'vehicle_type']
  }
};

interface UseLiveApiReturn {
  status: ConnectionStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  currentViolation: TrafficViolation | null;
  isAnalyzing: boolean;
  errorMessage: string | null;
  switchCamera: () => Promise<void>;
  facingMode: string;
}

export function useLiveApi(): UseLiveApiReturn {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [currentViolation, setCurrentViolation] = useState<TrafficViolation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<string>('environment'); // Default to back camera for traffic

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Refs for cleanup
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const clearViolationTimeoutRef = useRef<number | null>(null);
  
  // Local cache to prevent race conditions and duplicate entries in the same session
  // Key: Normalized Vehicle Number, Value: { timestamp: number, types: string[] }
  const recentViolationsRef = useRef<Map<string, { timestamp: number, types: string[] }>>(new Map());
  
  // Track error state to prevent race conditions in callbacks
  const isErrorRef = useRef<boolean>(false);

  // Initialize canvas once
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  const cleanup = useCallback(() => {
    if (videoIntervalRef.current) {
      window.clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (clearViolationTimeoutRef.current) {
      window.clearTimeout(clearViolationTimeoutRef.current);
      clearViolationTimeoutRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();
    
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
    }
    if (outputAudioContextRef.current) {
      try { outputAudioContextRef.current.close(); } catch (e) {}
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(() => {});
      sessionPromiseRef.current = null;
    }
  }, []);

  const captureFrameBase64 = useCallback(async (): Promise<string | null> => {
    if (!canvasRef.current || !videoRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (blob) {
          const base64 = await blobToBase64(blob);
          resolve(base64);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', JPEG_QUALITY);
    });
  }, []);

  const connect = useCallback(async () => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API Key is missing. Please set REACT_APP_API_KEY.");
      }

      setStatus(ConnectionStatus.CONNECTING);
      setErrorMessage(null);
      setCurrentViolation(null);
      setIsAnalyzing(false);
      isErrorRef.current = false;

      // 1. Setup Media Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      videoStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play error:", e));
      }

      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        You are an AI Traffic Warden using visual analysis.
        Monitor the video feed frame-by-frame for traffic violations.
        
        CRITICAL MULTI-DETECTION RULES:
        1. Scan the ENTIRE frame. If multiple vehicles are committing violations simultaneously (e.g., Bike A has no helmet, Car B runs a red light), you MUST call 'report_violation' SEPARATELY for EACH vehicle.
        2. Do NOT aggregate different vehicles into a single report. 
        3. Do NOT stop after finding the first violation. Find ALL violations in the current frame.
        4. If a vehicle is detected but NO violation is being committed, DO NOT call report_violation.
        
        Violations to detect:
        1. No Helmet (Bike/Scooter)
        2. Triple Riding (3+ people on bike)
        3. Mobile Phone Usage while driving
        4. No Seatbelt (Car)
        5. Wrong Side Driving
        6. Red Light Signal Break
        7. Missing Number Plate
        
        INSTRUCTIONS:
        - Call the tool IMMEDIATELY upon detection.
        - If the number plate is blurry, use "UNKNOWN".
        - Remain silent. Use only the tool.
      `;

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [reportViolationTool] }],
        },
        callbacks: {
          onopen: () => {
            console.log("Session connected");
            setStatus(ConnectionStatus.CONNECTED);
            
            // Audio Stream Setup
            if (audioContextRef.current && streamRef.current) {
                try {
                    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
                    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                    sourceNodeRef.current = source;
                    processorRef.current = processor;

                    processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    sessionPromise.then(session => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                    };

                    source.connect(processor);
                    processor.connect(audioContextRef.current.destination);
                } catch (e) {
                    console.warn("Audio setup warning:", e);
                }
            }

            // Video Stream Setup
            let frameCount = 0;
            videoIntervalRef.current = window.setInterval(() => {
               frameCount++;
               // Capture frame to send to model
               captureAndSendFrame(sessionPromise);
            }, 1000 / FRAME_RATE);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              console.log("Tool Triggered (Batch):", msg.toolCall.functionCalls.length, "calls");
              
              // 1. Capture the Evidence Frame ONCE for this entire batch of tool calls.
              const evidenceFrameBase64 = await captureFrameBase64();
              let cachedImageUrl: string | null = null;
              
              // Helper to upload only if needed and only once per batch
              const getEvidenceUrl = async () => {
                  if (cachedImageUrl) return cachedImageUrl;
                  if (evidenceFrameBase64) {
                      cachedImageUrl = await uploadToCloudinary(evidenceFrameBase64);
                      return cachedImageUrl;
                  }
                  return "https://placehold.co/600x400?text=Camera+Error";
              };

              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'report_violation') {
                  const args = fc.args as any;
                  
                  if (args.violation_detected) {
                    const vehicleNum = args.vehicle_number;
                    const newTypes = (args.violation_type as string[]) || [];

                    // --- STRICT CHECK: IGNORE EMPTY VIOLATIONS ---
                    // The model sometimes hallucinates a detection but returns an empty list of crimes.
                    // We must filter these out to avoid "0 Fine" entries.
                    if (newTypes.length === 0) {
                        console.warn(`⚠️ Ignoring invalid report for ${vehicleNum}: violation_detected=true but list is empty.`);
                        continue; 
                    }

                    // --- LOCAL DEDUPLICATION ---
                    let skip = false;
                    if (vehicleNum && vehicleNum !== "UNKNOWN") {
                        const normalizedVehicleNum = vehicleNum.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                        const now = Date.now();
                        const twoHours = 2 * 60 * 60 * 1000;
                        const existing = recentViolationsRef.current.get(normalizedVehicleNum);

                        if (existing && (now - existing.timestamp < twoHours)) {
                             const isDuplicateCrime = newTypes.some(type => existing.types.includes(type));
                             if (isDuplicateCrime) {
                                 console.log(`🚫 Deduplication: Skipping ${vehicleNum}`);
                                 skip = true;
                             } else {
                                 existing.types.push(...newTypes);
                             }
                        } else {
                            recentViolationsRef.current.set(normalizedVehicleNum, {
                                timestamp: now,
                                types: [...newTypes]
                            });
                        }
                    }

                    if (!skip) {
                        setIsAnalyzing(true);
                        
                        // Upload evidence now (only if we haven't skipped)
                        const imageUrl = await getEvidenceUrl();
                        const vehicleNumber = args.vehicle_number || "UNKNOWN";
                        const ownerDetails = lookupVehicle(vehicleNumber);

                        const detectedViolations: string[] = args.violation_type || [];
                        const fineBreakdown: Record<string, number> = {};
                        let totalFine = 0;

                        detectedViolations.forEach(v => {
                            const fine = FINE_RATES[v] || 0;
                            if (fine > 0) {
                            fineBreakdown[v] = fine;
                            totalFine += fine;
                            }
                        });

                        const violationData: TrafficViolation = {
                            violation_detected: true,
                            violation_type: args.violation_type || [],
                            vehicle_number: vehicleNumber,
                            vehicle_type: args.vehicle_type || "unknown",
                            timestamp: new Date().toISOString(),
                            image_url: imageUrl,
                            ...ownerDetails,
                            fine_breakdown: fineBreakdown,
                            total_fine: totalFine
                        };
                        
                        // Save to Firebase
                        const saveResult = await saveViolationToFirestore(violationData);
                        
                        if (saveResult !== "DUPLICATE") {
                            // Update UI and Notify
                            setCurrentViolation(violationData);
                            sendViolationEmail(violationData);
                        }
                    }
                  }

                  // Respond to tool
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "logged" }
                      }
                    });
                  });
                }
              }
              
              // Clear analyzing state after batch processing
              // We set a small timeout to allow the user to see the "Processing" state if it was very fast
              setTimeout(() => {
                  setIsAnalyzing(false);
                  
                  // Reset violation display after a delay
                  if (clearViolationTimeoutRef.current) {
                      window.clearTimeout(clearViolationTimeoutRef.current);
                  }
                  clearViolationTimeoutRef.current = window.setTimeout(() => {
                      setCurrentViolation(null);
                  }, 4000); // 4 seconds display time
              }, 500);
            }

            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
               try {
                 const ctx = outputAudioContextRef.current;
                 const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(ctx.destination);
                 const now = ctx.currentTime;
                 const startAt = Math.max(nextStartTimeRef.current, now);
                 source.start(startAt);
                 nextStartTimeRef.current = startAt + audioBuffer.duration;
                 sourcesRef.current.add(source);
                 source.onended = () => sourcesRef.current.delete(source);
               } catch (e) {
                 // Ignore
               }
            }
          },
          onclose: (e) => {
            console.log("Session closed", e);
            if (!isErrorRef.current) {
               if (e.code && e.code !== 1000) {
                 setStatus(ConnectionStatus.ERROR);
                 setErrorMessage(`Session closed unexpectedly (Code: ${e.code}).`);
               } else {
                 setStatus(ConnectionStatus.DISCONNECTED);
               }
            }
          },
          onerror: (e: any) => {
            console.error("Session error", e);
            isErrorRef.current = true;
            setStatus(ConnectionStatus.ERROR);
            setErrorMessage("Connection error.");
            cleanup();
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (error: any) {
      console.error("Connection failed", error);
      isErrorRef.current = true;
      setStatus(ConnectionStatus.ERROR);
      setErrorMessage("Failed to start session");
      cleanup();
    }
  }, [cleanup, facingMode, captureFrameBase64]);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus(ConnectionStatus.DISCONNECTED);
    isErrorRef.current = false;
  }, [cleanup]);

  const switchCamera = useCallback(async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextMode
        }
      });
      if (videoStreamRef.current) {
        videoStreamRef.current.getVideoTracks().forEach(track => track.stop());
      }
      videoStreamRef.current = newVideoStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newVideoStream;
        videoRef.current.play().catch(e => console.warn(e));
      }
      setFacingMode(nextMode);
    } catch (error) {
      setErrorMessage("Failed to switch camera.");
    }
  }, [facingMode]);

  const captureAndSendFrame = useCallback((sessionPromise: Promise<LiveSession>) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
        if (blob) {
          const base64Data = await blobToBase64(blob);
          sessionPromise.then(session => {
             session.sendRealtimeInput({
               media: { mimeType: 'image/jpeg', data: base64Data }
             });
          });
        }
      }, 'image/jpeg', JPEG_QUALITY);
  }, []);

  return {
    status,
    connect,
    disconnect,
    videoRef,
    currentViolation,
    isAnalyzing,
    errorMessage,
    switchCamera,
    facingMode
  };
}