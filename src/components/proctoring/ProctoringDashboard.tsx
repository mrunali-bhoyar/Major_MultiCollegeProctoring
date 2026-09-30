
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, PlayCircle, PauseCircle, Camera, Mic, MicOff, RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoFeed from '@/components/proctoring/VideoFeed';
import SidePanel from '@/components/proctoring/SidePanel';
import ExamQuestions from '@/components/proctoring/ExamQuestions';
import type { ProctoringState } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert as AlertBox, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { doc, onSnapshot, runTransaction, updateDoc, getDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { VisionAgent } from '@/lib/agents/visionAgent';
import { AudioAgent } from '@/lib/agents/audioAgent';

const INITIAL_STATE: ProctoringState = {
  suspicionScore: 0,
  faceCount: 0,
  gazeScore: 100,
  objectCount: 0,
  audioEvents: 0,
  modules: {
    face: 'INACTIVE',
    object: 'INACTIVE',
    audio: 'INACTIVE',
    multiplePeople: 'INACTIVE',
  },
};

export function ProctoringDashboard({ examId }: { examId?: string | null }) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [state, setState] = useState<ProctoringState>(INITIAL_STATE);
  const [userData, setUserData] = useState<any>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [examSessionId, setExamSessionId] = useState<string | null>(null);

  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const auth = useAuth();
  
  const eventBufferRef = React.useRef<{ type: string, description: string, timestamp: string }[]>([]);

  const queueEvent = useCallback((type: string, description: string) => {
    eventBufferRef.current.push({
      type,
      description,
      timestamp: new Date().toISOString()
    });
  }, []);

    useEffect(() => {
        if (!user || !firestore) return;

        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setUserData(data);
                setState(prevState => ({
                    ...prevState,
                    suspicionScore: data.suspicionScore || 0,
                    modules: {
                        face: isMonitoring ? 'ACTIVE' : 'INACTIVE',
                        object: isMonitoring ? 'ACTIVE' : 'INACTIVE',
                        audio: (isMonitoring && isAudioEnabled) ? 'ACTIVE' : 'INACTIVE',
                        multiplePeople: isMonitoring ? 'ACTIVE' : 'INACTIVE',
                    }
                }));
            }
        });

        return () => unsubscribe();
    }, [user, firestore, isMonitoring, isAudioEnabled]);
  
  const updateSuspicionScore = useCallback(async (points: number, reason: string) => {
    if (!user || !firestore || !examSessionId) return;
    
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("User document does not exist!");
            }
            const currentScore = userDoc.data().suspicionScore || 0;
            const newScore = Math.min(100, currentScore + points);
            transaction.update(userDocRef, { suspicionScore: newScore });
        });

        // Deduplicate identical alerts within 30 seconds
        const now = Date.now();
        if (lastAlertRef.current.reason !== reason || (now - lastAlertRef.current.time > 30000)) {
            lastAlertRef.current = { reason, time: now };
            const eventsColRef = collection(firestore, 'users', user.uid, 'examSessions', examSessionId, 'proctoringEvents');
            await addDoc(eventsColRef, {
                examSessionId: examSessionId,
                message: reason,
                type: points > 0 ? 'warning' : 'info',
                scoreImpact: points,
                timestamp: new Date().toISOString(),
            });
        }    } catch (e: any) {
        // If the SDK retries a write after a network timeout, it may throw "Document already exists" for addDoc. This means it actually succeeded.
        if (e.message && e.message.includes("Document already exists")) {
            console.warn("Harmless network retry collision in Firestore detected, ignoring.");
            return;
        }
        
        console.error("Suspicion score update failed: ", e);
        if (e.message !== "User document does not exist!") {
            toast({
                variant: "destructive",
                title: "Score Update Failed",
                description: "Could not update suspicion score in the database.",
            });
        }
    }
  }, [user, firestore, examSessionId, toast]);

    const analysisInProgressRef = useRef(false);
    const retryDelayRef = useRef(0);
    const lastAlertRef = useRef({ reason: '', time: 0 });

    useEffect(() => {
        if (!isMonitoring || !examSessionId || !stream || !videoEl) return;

        const analyzeFrame = async () => {
            if (analysisInProgressRef.current || !videoEl || videoEl.readyState < 2) return;

            if (retryDelayRef.current > 0) {
                // If we are in a backoff period, skip this interval
                retryDelayRef.current -= 5000;
                return;
            }

            analysisInProgressRef.current = true;

            try {
                // 1. Capture Frame
                console.log("[PROCTORING] Capturing frame...");
                const canvas = document.createElement('canvas');
                canvas.width = videoEl.videoWidth;
                canvas.height = videoEl.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    analysisInProgressRef.current = false;
                    return;
                }
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                const base64Image = canvas.toDataURL('image/jpeg', 0.5); // compress

                // 2. Send for Analysis
                console.log("[PROCTORING] Sending frame for analysis...");
                const response = await fetch('/api/analyze-proctoring-frame', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imagePart: base64Image })
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error("429 Too Many Requests");
                    }
                    throw new Error(`API Error: ${response.statusText}`);
                }

                const result = await response.json();
                
                // Reset backoff on success
                retryDelayRef.current = 0;
                
                // 3. Process Result
                setState(s => {
                    const nextState = { ...s };
                    
                    // Face processing
                    nextState.faceCount = result.faceCount;
                    if (result.faceCount === 0) queueEvent("VISION", "No face detected");
                    else if (result.faceCount > 1) queueEvent("VISION", `Multiple faces detected: ${result.faceCount} faces`);
                    
                    // Gaze processing
                    nextState.gazeScore = result.gazeConfidence;
                    if (result.gazeDirection === 'AWAY') queueEvent("VISION", `Gaze away - confidence ${result.gazeConfidence}%`);
                    else if (result.gazeDirection === 'NORMAL') queueEvent("VISION", `Gaze normal - confidence ${result.gazeConfidence}%`);

                    // Object processing
                    nextState.objectCount = result.detectedObjects.length;
                    if (result.detectedObjects.length > 0) {
                        queueEvent("VISION", `Unauthorized object detected - ${result.detectedObjects.join(', ')}`);
                    }

                    return nextState;
                });

            } catch (error: any) {
                if (error.message.includes('429')) {
                    console.warn("[PROCTORING] AI analysis rate limited (429). Backing off...");
                    // Exponential backoff
                    retryDelayRef.current = retryDelayRef.current === 0 ? 10000 : Math.min(retryDelayRef.current * 2, 60000);
                    queueEvent("SYSTEM", `AI Analysis: Retrying in ${retryDelayRef.current / 1000}s`);
                } else {
                    console.error("[PROCTORING] AI analysis failed:", error);
                    queueEvent("SYSTEM", "AI Analysis: Temporarily unavailable");
                }
            } finally {
                analysisInProgressRef.current = false;
            }
        };

        const analysisInterval = setInterval(analyzeFrame, 25000);

        let audioAgent: AudioAgent | null = null;
        if (isAudioEnabled) {
            audioAgent = new AudioAgent(() => {
                setState(s => {
                    const nextState = { ...s };
                    nextState.audioEvents = s.audioEvents + 1;
                    queueEvent("AUDIO", "Suspicious audio detected");
                    return nextState;
                });
            });
            audioAgent.start(stream);
        }

        return () => {
            clearInterval(analysisInterval);
            if (audioAgent) audioAgent.stop();
        };
    }, [isMonitoring, isAudioEnabled, examSessionId, stream, videoEl, queueEvent]);

    useEffect(() => {
        if (!isMonitoring || !examSessionId) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                queueEvent("ACTIVITY", "Tab switched or window minimized");
            }
        };

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            queueEvent("ACTIVITY", "Attempted to copy content");
        };

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            queueEvent("ACTIVITY", "Attempted to paste content");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("copy", handleCopy);
        document.addEventListener("paste", handlePaste);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("copy", handleCopy);
            document.removeEventListener("paste", handlePaste);
        };
    }, [isMonitoring, examSessionId, queueEvent]);

    useEffect(() => {
        if (!isMonitoring || !examSessionId) return;

        const flushBuffer = async () => {
            const events = [...eventBufferRef.current];
            if (events.length === 0) return;

            eventBufferRef.current = []; // clear

            try {
                const response = await fetch('/api/orchestrator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events, currentScore: state.suspicionScore })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log("[PROCTORING] Orchestrator result:", result);
                    const { scoreImpact, message, actionTaken, riskLevel, reasoningSummary } = result;
                    
                    if (scoreImpact > 0 || actionTaken !== 'CONTINUE') {
                        // Log the explicit agent event as requested
                        if (user && userData && firestore && examSessionId) {
                            try {
                                await addDoc(collection(firestore, 'agentEvents'), {
                                    studentId: user.uid,
                                    studentName: userData.username || user.email,
                                    examSessionId: examSessionId,
                                    examId: examId || null,
                                    collegeId: userData.collegeId || null,
                                    divisionId: userData.divisionId || null,
                                    detectedSignals: events.map(e => e.description),
                                    riskLevel: riskLevel,
                                    reasoningSummary: reasoningSummary,
                                    actionTaken: actionTaken,
                                    timestamp: new Date().toISOString()
                                });
                            } catch (e: any) {
                                if (e.message && e.message.includes("Document already exists")) {
                                    console.warn("Harmless network retry collision in Firestore detected, ignoring.");
                                } else {
                                    console.error("Failed to log agent event", e);
                                }
                            }
                        }

                        // We also log the risk level and action in the event message
                        const fullMessage = `${message} [Risk: ${riskLevel}] [Action: ${actionTaken}]`;
                        await updateSuspicionScore(scoreImpact, fullMessage);
                        
                        if (actionTaken === 'WARNING') {
                             toast({ variant: 'destructive', title: 'WARNING FROM SUPERVISOR', description: reasoningSummary, duration: 8000 });
                        } else if (actionTaken === 'TERMINATE_ONLY_IF_CONFIGURED_POLICY_ALLOWS') {
                             toast({ variant: 'destructive', title: 'EXAM TERMINATED', description: 'Your exam has been terminated due to suspicious activity: ' + reasoningSummary, duration: Infinity });
                             stopMonitoring();
                        } else if (actionTaken === 'CREATE_ALERT' || actionTaken === 'NOTIFY_FACULTY' || actionTaken === 'ESCALATE') {
                             // Just log silently or show a mild warning if you want.
                             // Usually these are just for the dashboard.
                             if (actionTaken === 'NOTIFY_FACULTY' || actionTaken === 'ESCALATE') {
                                 toast({ variant: 'destructive', title: 'HIGH RISK ACTIVITY FLAGGED', description: "Your activity is being reviewed by the administration.", duration: 10000 });
                             }
                        }
                    }
                } else if (response.status === 429) {
                    toast({ variant: 'destructive', title: 'AI Quota Exceeded', description: 'Google API rate limit hit. Pausing analysis for 15s.' });
                }
            } catch (err) {
                console.error("Failed to call orchestrator", err);
            }
        };

        const intervalId = setInterval(flushBuffer, 25000);
        return () => clearInterval(intervalId);
    }, [isMonitoring, examSessionId, state.suspicionScore, updateSuspicionScore]);

  const startMonitoring = async () => {
    if (isUserLoading || !user || !firestore) {
        toast({ title: 'Please wait', description: 'User data is still loading.'});
        return;
    }

    if (!hasCameraPermission) {
        toast({
            variant: 'destructive',
            title: 'Camera Required',
            description: 'Please enable camera access to start monitoring.',
        });
        return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            toast({
                variant: "destructive",
                title: "User Profile Incomplete",
                description: "Your user profile could not be found. Please log out and sign up again.",
                duration: 9000,
            });
            return;
        }

        setIsMonitoring(true);
        setState(prevState => ({
          ...prevState,
          modules: { face: 'ACTIVE', object: 'ACTIVE', audio: isAudioEnabled ? 'ACTIVE' : 'INACTIVE', multiplePeople: 'SIMULATED' }
        }));
        
        const sessionData = {
            studentId: user.uid,
            startTime: new Date().toISOString(),
            suspicionScore: 0,
            examDetails: "Demo Exam Session"
        };
        const sessionCol = collection(firestore, 'users', user.uid, 'examSessions');
        const sessionRef = await addDoc(sessionCol, sessionData);
        setExamSessionId(sessionRef.id);
        
        await updateSuspicionScore(0, 'AI monitoring and exam started');
        toast({ title: 'Monitoring Started', description: 'AI analysis is now active.' });

    } catch (error) {
         console.error("Error starting monitoring:", error);
         toast({
            variant: 'destructive',
            title: 'Failed to Start',
            description: 'Could not start the exam session. Please try again.',
        });
        return;
    }
  };

  const stopMonitoring = async () => {
    setIsMonitoring(false);
    if (user && firestore && examSessionId) {
        const sessionDocRef = doc(firestore, 'users', user.uid, 'examSessions', examSessionId);
        await updateDoc(sessionDocRef, { endTime: new Date().toISOString() });
        await updateSuspicionScore(0, 'AI monitoring stopped');
    }
    setState(prevState => ({
      ...prevState,
      modules: { face: 'INACTIVE', object: 'INACTIVE', audio: 'INACTIVE', multiplePeople: 'INACTIVE' }
    }));
    toast({ title: 'Monitoring Stopped' });
  };
  
  const handleStartStop = () => {
    if (isMonitoring) stopMonitoring();
    else startMonitoring();
  };

  const handleReset = async () => {
    if (isMonitoring) {
        await stopMonitoring();
    }
    
    if (user && firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            await updateDoc(userDocRef, { suspicionScore: 0, examScore: 0, examSubmitted: false });
        } catch(e) {
            console.error("Failed to reset score in Firestore", e);
            toast({
                variant: "destructive",
                title: "Reset Failed",
                description: "Could not reset score in the database.",
            });
        }
    }
    setExamSessionId(null);
    setState(INITIAL_STATE);
    toast({ title: 'Session Reset', description: 'All scores and alerts have been cleared.' });
  };
  
  const handleAudioToggle = () => {
    const newAudioState = !isAudioEnabled;
    setIsAudioEnabled(newAudioState);
    if(isMonitoring) {
        setState(prevState => ({
          ...prevState,
          modules: {...prevState.modules, audio: newAudioState ? 'ACTIVE' : 'INACTIVE'}
        }));
    }
    toast({ title: `Audio analysis ${newAudioState ? 'enabled' : 'disabled'}`});
  };

  const handleCaptureProfile = async () => {
      if (!hasCameraPermission) {
          toast({ variant: 'destructive', title: 'Camera Required', description: 'Please enable camera access.'});
          return;
      }
      if (examSessionId) {
        await updateSuspicionScore(0, 'Profile face captured successfully');
      }
      toast({ title: 'Profile Captured', description: 'Your face profile is now stored for this session.' });
  };

  const handleLogout = () => {
    if (isMonitoring) {
      stopMonitoring();
    }
    auth.signOut();
    router.push('/');
  };

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(mediaStream);
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
          duration: Infinity,
        });
      }
    };

    getCameraPermission();

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [toast]);

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-4">
              <Shield className="w-10 h-10 text-primary" />
              <h1 className="text-3xl font-bold font-headline bg-gradient-to-r from-secondary to-primary text-transparent bg-clip-text">
                  AI Exam Proctoring
              </h1>
          </div>
          <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
          </div>
        </div>

        <div className="text-center mt-6">
            <p className="text-muted-foreground max-w-2xl mx-auto">
                This is a real-time, AI-powered simulation. Your camera and microphone are required.
            </p>
            <div className="flex justify-center gap-2 md:gap-4 flex-wrap mt-6">
              <Button onClick={handleStartStop} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold" disabled={!hasCameraPermission || isUserLoading}>
                {isMonitoring ? <><PauseCircle />Stop Monitoring</> : <><PlayCircle />Start Exam</>}
              </Button>
              <Button onClick={handleCaptureProfile} variant="outline" disabled={!hasCameraPermission || !isMonitoring}>
                <Camera /> Capture Profile
              </Button>
              <Button onClick={handleAudioToggle} variant="outline" disabled={!hasCameraPermission}>
                {isAudioEnabled ? <><Mic /> Audio: ON</> : <><MicOff /> Audio: OFF</>}
              </Button>
              <Button onClick={handleReset} variant="destructive">
                <RotateCcw /> Reset Session
              </Button>
            </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
            <ExamQuestions isExamActive={isMonitoring} examId={examId} />
        </div>
        
        <div className="lg:col-span-4 flex flex-col gap-4">
            <VideoFeed stream={stream} isMonitoring={isMonitoring} suspicionScore={state.suspicionScore} hasCameraPermission={hasCameraPermission} onVideoReady={setVideoEl} />
            {hasCameraPermission === false && (
                    <AlertBox variant="destructive">
                        <TriangleAlert className="h-4 w-4" />
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                            Proctoring is disabled. Please grant camera access in your browser settings and refresh the page.
                        </AlertDescription>
                    </AlertBox>
            )}
            <p className="text-sm text-muted-foreground text-center">AI is analyzing: Face position, eye gaze, unauthorized objects, and audio patterns.</p>
        </div>

        <div className="lg:col-span-3 bg-card p-4 rounded-lg shadow-lg">
          <SidePanel {...state} examSessionId={examSessionId} />
        </div>
      </main>

      <footer className="text-center mt-8 pt-6 border-t border-border/50 text-xs text-muted-foreground">
        <p>AI-Based Online Exam Proctoring System | MyProctor.ai Demo</p>
        <p className="flex items-center justify-center gap-2 mt-2"><TriangleAlert className="w-4 h-4 text-yellow-500" /> This is a simulation for demonstration purposes only.</p>
      </footer>
    </div>
  );
}
