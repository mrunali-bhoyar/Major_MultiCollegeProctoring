
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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

export function ProctoringDashboard() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [state, setState] = useState<ProctoringState>(INITIAL_STATE);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [examSessionId, setExamSessionId] = useState<string | null>(null);

  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const auth = useAuth();


  useEffect(() => {
    if (!user || !firestore) return;

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setState(prevState => ({
          ...prevState,
          suspicionScore: data.suspicionScore || 0,
        }));
      }
    });

    return () => unsubscribe();
  }, [user, firestore]);
  
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

        // Log the alert after the transaction is successful
        const alertsColRef = collection(firestore, 'users', user.uid, 'examSessions', examSessionId, 'alerts');
        await addDoc(alertsColRef, {
            examSessionId: examSessionId,
            message: reason,
            type: points > 0 ? 'warning' : 'info',
            scoreImpact: points,
            timestamp: new Date().toISOString(),
        });

    } catch (e: any) {
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

    useEffect(() => {
        if (!isMonitoring || !examSessionId) return;

        const runSimulations = () => {
            setState(s => {
                const nextState = { ...s };

                // Face detection simulation
                const faceRoll = Math.random();
                if (faceRoll < 0.08 && s.faceCount !== 0) {
                    nextState.faceCount = 0;
                    updateSuspicionScore(15, "No face detected");
                } else if (faceRoll < 0.15 && s.faceCount !== 2) {
                    nextState.faceCount = 2;
                    updateSuspicionScore(20, "Multiple faces detected");
                } else if (faceRoll >= 0.15 && s.faceCount !== 1) {
                    nextState.faceCount = 1;
                }

                // Gaze tracking simulation
                const gazeRoll = Math.random();
                if (gazeRoll < 0.2) {
                    if (s.gazeScore < 80) {
                        updateSuspicionScore(5, "Looking away from screen");
                    }
                    nextState.gazeScore = Math.max(0, s.gazeScore - 10);
                } else {
                    nextState.gazeScore = Math.min(100, s.gazeScore + 2);
                }

                // Object detection simulation
                const unauthorizedObjects = ['phone', 'book', 'tablet', 'notes'];
                if (Math.random() < 0.05) {
                    const detectedObject = unauthorizedObjects[Math.floor(Math.random() * unauthorizedObjects.length)];
                    nextState.objectCount = s.objectCount + 1;
                    updateSuspicionScore(25, `Unauthorized object (${detectedObject}) detected`);
                }

                // Audio event simulation
                if (isAudioEnabled && Math.random() < 0.08) {
                    nextState.audioEvents = s.audioEvents + 1;
                    updateSuspicionScore(10, "Suspicious audio detected");
                }
                
                return nextState;
            });
        };

        const intervalId = setInterval(runSimulations, 2000);

        return () => clearInterval(intervalId);
    }, [isMonitoring, isAudioEnabled, updateSuspicionScore, examSessionId]);


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
            <ExamQuestions isExamActive={isMonitoring} />
        </div>
        
        <div className="lg:col-span-4 flex flex-col gap-4">
            <VideoFeed stream={stream} isMonitoring={isMonitoring} suspicionScore={state.suspicionScore} hasCameraPermission={hasCameraPermission} />
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
