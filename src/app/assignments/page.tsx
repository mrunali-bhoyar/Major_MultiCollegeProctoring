
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, FileUp, UploadCloud, Loader2, CheckCircle, ArrowLeft, TriangleAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser, useStorage } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { Assignment, Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function AssignmentCard({ assignment, user }: { assignment: Assignment, user: any }) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
    const [isChecking, setIsChecking] = useState(true);
    const [showUploadFix, setShowUploadFix] = useState(false);

    const storage = useStorage();
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        const checkForSubmission = async () => {
            if (!firestore || !user) return;
            setIsChecking(true);
            const submissionsRef = collection(firestore, 'submissions');
            const q = query(submissionsRef, where("studentId", "==", user.uid), where("assignmentId", "==", assignment.id));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setExistingSubmission(querySnapshot.docs[0].data() as Submission);
            }
            setIsChecking(false);
        };
        checkForSubmission();
    }, [firestore, user, assignment.id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'No file selected.' });
            return;
        }
        if (!storage || !firestore || !user) return;

        setIsUploading(true);
        const storageRef = ref(storage, `submissions/${assignment.id}/${user.uid}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                setShowUploadFix(true);
                setIsUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const submissionData = {
                    assignmentId: assignment.id,
                    assignmentTitle: assignment.title,
                    studentId: user.uid,
                    studentName: user.displayName || user.email,
                    fileUrl: downloadURL,
                    fileName: file.name,
                    submittedAt: new Date().toISOString(),
                };
                const newSubmission = await addDoc(collection(firestore, 'submissions'), submissionData);
                setExistingSubmission({ ...submissionData, id: newSubmission.id });
                toast({ title: 'Success', description: 'Assignment submitted successfully.' });
                setIsUploading(false);
            }
        );
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{assignment.title}</CardTitle>
                    <CardDescription>{assignment.description}</CardDescription>
                    <p className="text-xs text-muted-foreground pt-2">Created on: {format(new Date(assignment.createdAt), 'PPP')}</p>
                </CardHeader>
                <CardContent>
                    {isChecking ? (
                        <Skeleton className="h-10 w-full" />
                    ) : existingSubmission ? (
                        <div className="flex items-center gap-3 text-green-500 bg-green-500/10 p-4 rounded-md">
                            <CheckCircle />
                            <div>
                                <p className="font-bold">Submitted!</p>
                                <p className="text-sm">You submitted '{existingSubmission.fileName}' on {format(new Date(existingSubmission.submittedAt), 'PPP')}.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor={`file-upload-${assignment.id}`} className="text-sm font-medium">Upload your assignment</label>
                                <Input id={`file-upload-${assignment.id}`} type="file" onChange={handleFileChange} />
                            </div>
                            {isUploading && <Progress value={uploadProgress} className="w-full" />}
                            <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
                                {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <UploadCloud className="mr-2" />}
                                {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Submit Assignment'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            <AlertDialog open={showUploadFix} onOpenChange={setShowUploadFix}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                          <TriangleAlert className="w-6 h-6" />
                          CRITICAL: File Uploads are Blocked
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                          <div className="space-y-4 text-left text-sm text-foreground/90 max-h-[70vh] overflow-y-auto pr-4">
                              <p className="font-bold text-base text-foreground">To enable file uploads, you must run a command in your local terminal.</p>
                              <p>This is a one-time, permanent fix for a server security setting (CORS). I cannot do this for you.</p>
                              <p>Please ensure you have the <a href="https://cloud.google.com/sdk/docs/install" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud SDK</a> installed on your computer.</p>
                              <div className="space-y-2 p-4 bg-muted rounded-md border">
                                  <p className="font-semibold">1. Open your Terminal (or Command Prompt).</p>
                                  <p className="font-semibold">2. Run this exact command:</p>
                                  <pre className="bg-background mt-2 p-3 rounded-md text-xs overflow-x-auto">
                                      <code className="font-mono text-secondary">
                                          gsutil cors set cors.json gs://studio-4263993348-5ecba.appspot.com
                                      </code>
                                  </pre>
                              </div>
                              <p>After the command completes successfully, all file uploads in the app will work correctly.</p>
                          </div>
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogAction onClick={() => setShowUploadFix(false)}>I Understand</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function AssignmentsPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [isUserLoading, user, router]);

    const assignmentsQuery = useMemoFirebase(() =>
        firestore && user ? collection(firestore, 'assignments') : null
    , [firestore, user]);

    const { data: assignments, isLoading } = useCollection<Assignment>(assignmentsQuery);

    const handleLogout = () => {
        auth.signOut();
        router.push('/');
    };

    if (isUserLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Shield className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/dashboard"><ArrowLeft /></Link>
                    </Button>
                    <FileUp className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold font-headline">Assignments</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
                    ) : assignments && assignments.length > 0 ? (
                        assignments.map(assignment => (
                           <AssignmentCard key={assignment.id} assignment={assignment} user={user} />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20">
                            <p className="text-muted-foreground">No assignments have been posted yet.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
