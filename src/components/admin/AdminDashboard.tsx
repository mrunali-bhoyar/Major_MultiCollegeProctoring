
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, User, ChevronsRight, Lightbulb, TriangleAlert, FileText, Trash2, PlusCircle, Loader2, BookOpen, History, File as FileIcon, FileUp, Edit, UploadCloud, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser, useStorage } from '@/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { collection, query, where, doc, deleteDoc, getDoc, addDoc, getDocs, orderBy, limit, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Question, ExamSession, Alert as AlertType, Assignment, Submission, PlagiarismResult, StudyMaterial, PreviousYearQuestionPaper } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { PlagiarismChecker } from '@/components/plagiarism/PlagiarismChecker';

const INITIAL_QUESTION_STATE = { text: '', options: ['', '', '', ''], answer: '' };

type Student = { id: string; username: string; suspicionScore: number; status: string; email: string; examScore?: number; examSubmitted?: boolean; };
type MaterialType = 'studyMaterials' | 'previousYearQuestionPapers';

function GradeManager({ submission }: { submission: Submission }) {
    const [grade, setGrade] = useState<string>(submission.grade?.toString() || '');
    const [isSaving, setIsSaving] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleSaveGrade = async () => {
        if (!firestore) return;
        const gradeValue = parseInt(grade, 10);
        if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
            toast({ variant: "destructive", title: "Invalid Grade", description: "Grade must be a number between 0 and 100." });
            return;
        }
        setIsSaving(true);
        const submissionRef = doc(firestore, 'submissions', submission.id);
        try {
            await updateDoc(submissionRef, { grade: gradeValue });
            toast({ title: "Grade Saved", description: `Grade ${gradeValue} saved for ${submission.studentName}.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: `Could not save grade: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Input type="number" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="0-100" className="w-20 h-8" disabled={isSaving}/>
            <Button size="sm" onClick={handleSaveGrade} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Edit />}
            </Button>
        </div>
    );
}

function MaterialUploader({ type }: { type: MaterialType }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadFix, setShowUploadFix] = useState(false);

    const storage = useStorage();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] || null);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title || !storage || !firestore) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please provide a title and select a file.' });
            return;
        }

        setIsUploading(true);
        const newDocRef = doc(collection(firestore, type));
        const storageRef = ref(storage, `${type}/${newDocRef.id}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => {
                console.error("Upload failed:", error);
                setShowUploadFix(true);
                setIsUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const docData = {
                    title,
                    description,
                    fileUrl: downloadURL,
                    fileName: file.name,
                    fileType: file.type,
                    uploadedAt: new Date().toISOString(),
                };
                await setDoc(newDocRef, docData);
                toast({ title: 'Success', description: 'Material uploaded successfully.' });
                
                // Reset form
                setTitle('');
                setDescription('');
                setFile(null);
                setIsUploading(false);
                setUploadProgress(0);
                if (e.target instanceof HTMLFormElement) e.target.reset();
            }
        );
    };
    
    const typeLabel = type === 'studyMaterials' ? 'Study Material' : 'Question Paper';

    return (
        <>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> Add New {typeLabel}</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="space-y-2"><Label htmlFor={`${type}-title`}>Title</Label><Input id={`${type}-title`} value={title} onChange={e => setTitle(e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor={`${type}-desc`}>Description</Label><Textarea id={`${type}-desc`} value={description} onChange={e => setDescription(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor={`${type}-file`}>File</Label><Input id={`${type}-file`} type="file" onChange={handleFileChange} required /></div>
                        {isUploading && <Progress value={uploadProgress} className="w-full" />}
                        <Button type="submit" className="w-full" disabled={isUploading}>{isUploading ? <Loader2 className="animate-spin mr-2"/> : <UploadCloud className="mr-2"/>}{isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : `Upload ${typeLabel}`}</Button>
                    </form>
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

function MaterialList({ type }: { type: MaterialType }) {
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const materialQuery = useMemoFirebase(() => firestore ? query(collection(firestore, type), orderBy('uploadedAt', 'desc')) : null, [firestore, type]);
    const { data: materials, isLoading } = useCollection<StudyMaterial | PreviousYearQuestionPaper>(materialQuery);

    const handleDelete = async (material: StudyMaterial | PreviousYearQuestionPaper) => {
        if (!firestore || !storage) return;

        // Create a reference to the file to delete
        const fileRef = ref(storage, material.fileUrl);

        try {
            // Delete the file from Storage
            await deleteObject(fileRef);
            // Delete the document from Firestore
            await deleteDoc(doc(firestore, type, material.id));
            toast({ title: 'Deleted', description: `${material.title} has been deleted.`});
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
             console.error("Deletion failed:", error);
        }
    };
    
    const typeLabel = type === 'studyMaterials' ? 'Study Material' : 'Question Papers';

    return (
        <Card>
            <CardHeader><CardTitle>Existing {typeLabel}</CardTitle></CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    <div className="space-y-4">
                        {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                         : materials && materials.length > 0 ? materials.map((mat) => (
                             <div key={mat.id} className="p-4 border rounded-md bg-card/50 flex items-start justify-between">
                                 <div>
                                     <p className="font-semibold">{mat.title}</p>
                                     <p className="text-sm text-muted-foreground">{mat.description}</p>
                                     <p className="text-xs text-muted-foreground mt-1">{mat.fileName}</p>
                                 </div>
                                 <AlertDialog>
                                     <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive shrink-0"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                     <AlertDialogContent>
                                         <AlertDialogHeader><AlertDialogTitle>Delete this material?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the file and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                         <AlertDialogFooter>
                                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                                             <AlertDialogAction onClick={() => handleDelete(mat)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                         </AlertDialogFooter>
                                     </AlertDialogContent>
                                 </AlertDialog>
                             </div>
                         ))
                         : <p className="text-center text-muted-foreground py-10">No materials uploaded yet.</p>}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}


export default function AdminDashboard() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sessionAlerts, setSessionAlerts] = useState<AlertType[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  const [newQuestion, setNewQuestion] = useState(INITIAL_QUESTION_STATE);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  // Assignment State
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [newAssignmentDesc, setNewAssignmentDesc] = useState('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);


  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    const checkRole = async () => {
      if (!firestore || !user) return;
      const userDocRef = doc(firestore, 'users', user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.role);
          if (userData.role !== 'admin' && userData.role !== 'faculty') {
            router.replace('/dashboard');
          }
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        router.replace('/login');
      }
    };
    checkRole();
  }, [user, isUserLoading, firestore, router]);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !currentUserRole) return null;
    
    if (currentUserRole === 'admin' || currentUserRole === 'faculty') {
      return query(collection(firestore, "users"), where("role", "==", "student"));
    }
    return null;
  }, [firestore, user, currentUserRole]);

  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);
  
  const questionsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return collection(firestore, "questions");
  }, [firestore, user]);
  const { data: questions, isLoading: isLoadingQuestions } = useCollection<Question>(questionsQuery);
  
  const submissionsQuery = useMemoFirebase(() => {
      if (!firestore || !user || !(currentUserRole === 'admin' || currentUserRole === 'faculty')) return null;
      return query(collection(firestore, "submissions"), orderBy('submittedAt', 'desc'));
  }, [firestore, user, currentUserRole]);
  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const getStatus = (score: number) => {
    if (score > 80) return 'High Alert';
    if (score > 50) return 'Review Required';
    if (score > 20) return 'Moderate';
    return 'Clear';
  }

  const getStatusBadgeVariant = (status: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'High Alert':
      case 'Review Required':
        return 'destructive';
      case 'Moderate':
        return 'default';
      case 'Clear':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudent(student);
    setIsSheetOpen(true);
    setIsLoadingDetails(true);
    setSessionAlerts([]);

    if (!firestore) return;

    try {
        const sessionsQuery = query(collection(firestore, 'users', student.id, 'examSessions'), orderBy('startTime', 'desc'), limit(1));
        const sessionSnapshot = await getDocs(sessionsQuery);

        if (sessionSnapshot.empty) {
            setIsLoadingDetails(false);
            return;
        }

        const sessionDoc = sessionSnapshot.docs[0];
        const alertsQuery = query(collection(firestore, 'users', student.id, 'examSessions', sessionDoc.id, 'alerts'), orderBy('timestamp', 'asc'));
        const alertsSnapshot = await getDocs(alertsQuery);
        const alerts = alertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AlertType[];
        setSessionAlerts(alerts);
    } catch (error: any) {
        console.error("Error during student review processing:", error);
    } finally {
        setIsLoadingDetails(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    router.push('/');
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    if (!newQuestion.text || newQuestion.options.some(opt => !opt) || !newQuestion.answer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all fields for the question.' });
        return;
    }
    if (!newQuestion.options.includes(newQuestion.answer)) {
        toast({ variant: 'destructive', title: 'Error', description: 'The correct answer must be one of the options.' });
        return;
    }
    setIsSubmittingQuestion(true);
    try {
        await addDoc(collection(firestore, 'questions'), newQuestion);
        setNewQuestion(INITIAL_QUESTION_STATE);
        toast({ title: 'Success', description: 'New question has been added.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add the question.' });
    } finally {
        setIsSubmittingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'questions', questionId));
        toast({ title: 'Success', description: 'Question has been deleted.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the question.' });
    }
  };
  
  const handleAddAssignment = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!firestore) return;
      if(!newAssignmentTitle) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please provide a title for the assignment.' });
          return;
      }
      setIsSubmittingAssignment(true);
      try {
          await addDoc(collection(firestore, 'assignments'), {
              title: newAssignmentTitle,
              description: newAssignmentDesc,
              createdAt: new Date().toISOString(),
          });
          setNewAssignmentTitle('');
          setNewAssignmentDesc('');
          toast({ title: 'Success', description: 'New assignment has been created.' });
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not create assignment.' });
      } finally {
          setIsSubmittingAssignment(false);
      }
  };

  if (isUserLoading || !user) return <div className="flex items-center justify-center min-h-screen"><Shield className="w-12 h-12 text-primary animate-spin" /></div>;
  
  const formatTimestamp = (isoString: string) => isoString ? new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Invalid time";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline">MyProctor.ai Admin</h1>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{auth.currentUser?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="grid w-full grid-cols-6 max-w-5xl">
            <TabsTrigger value="monitoring">Student Monitoring</TabsTrigger>
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="studymaterial">Study Material</TabsTrigger>
            <TabsTrigger value="pyqs">PYQs</TabsTrigger>
            <TabsTrigger value="plagiarism">Plagiarism Checker</TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Student Monitoring Dashboard</CardTitle><CardDescription>Live overview of student exam sessions.</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Student ID</TableHead><TableHead>Name</TableHead><TableHead>Suspicion Score</TableHead><TableHead>Exam Score</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoadingStudents ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-32" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell><Skeleton className="h-6 w-28" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell></TableRow>)
                     : students && students.length > 0 ? students.map((student) => <TableRow key={student.id} className="hover:bg-card/50"><TableCell className="font-mono">{student.id.substring(0,8)}...</TableCell><TableCell className="font-medium">{student.username}</TableCell><TableCell><div className={cn('font-semibold', student.suspicionScore > 70 ? 'text-destructive' : student.suspicionScore > 30 ? 'text-yellow-400' : 'text-green-400')}>{student.suspicionScore || 0}%</div></TableCell><TableCell><div className="font-semibold">{student.examSubmitted ? `${student.examScore}%` : 'Pending'}</div></TableCell><TableCell><Badge variant={getStatusBadgeVariant(getStatus(student.suspicionScore))}>{getStatus(student.suspicionScore)}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleStudentSelect(student)}>Review <ChevronsRight className="w-4 h-4 ml-2" /></Button></TableCell></TableRow>)
                     : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No students have signed up yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1"><Card><CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> Add New Question</CardTitle><CardDescription>Create a new question for the exam.</CardDescription></CardHeader><CardContent><form onSubmit={handleAddQuestion} className="space-y-4"><div className="space-y-2"><Label htmlFor="q-text">Question Text</Label><Textarea id="q-text" placeholder="What is 2+2?" value={newQuestion.text} onChange={e => setNewQuestion(p => ({...p, text: e.target.value}))} required /></div>{[0,1,2,3].map(i => (<div key={i} className="space-y-2"><Label htmlFor={`q-opt-${i}`}>Option {i+1}</Label><Input id={`q-opt-${i}`} placeholder={`Option ${i+1}`} value={newQuestion.options[i]} onChange={e => { const o = [...newQuestion.options]; o[i] = e.target.value; setNewQuestion(p => ({...p, options: o})); }} required /></div>))}<div className="space-y-2"><Label htmlFor="q-answer">Correct Answer</Label><Select value={newQuestion.answer} onValueChange={v => setNewQuestion(p => ({...p, answer: v}))}><SelectTrigger id="q-answer"><SelectValue placeholder="Select correct answer" /></SelectTrigger><SelectContent>{newQuestion.options.filter(opt => opt).map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent></Select></div><Button type="submit" className="w-full" disabled={isSubmittingQuestion}>{isSubmittingQuestion && <Loader2 className="animate-spin mr-2" />}{isSubmittingQuestion ? 'Adding...' : 'Add Question'}</Button></form></CardContent></Card></div>
              <div className="lg:col-span-2"><Card><CardHeader><CardTitle>Existing Questions</CardTitle><CardDescription>List of all questions in the exam.</CardDescription></CardHeader><CardContent><ScrollArea className="h-96"><div className="space-y-4">{isLoadingQuestions ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />) : questions && questions.length > 0 ? questions.map((q) => (<div key={q.id} className="p-4 border rounded-md bg-card/50 flex items-start justify-between"><div><p className="font-semibold">{q.text}</p><ul className="list-disc list-inside text-sm text-muted-foreground mt-2">{q.options.map(opt => (<li key={opt} className={cn(q.answer === opt && 'font-bold text-secondary')}>{opt}</li>))}</ul></div><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive shrink-0"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this question?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteQuestion(q.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>)) : <p className="text-center text-muted-foreground py-10">No questions have been added yet.</p>}</div></ScrollArea></CardContent></Card></div>
            </div>
          </TabsContent>
          
          <TabsContent value="assignments" className="mt-4">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> Create New Assignment</CardTitle><CardDescription>Post a new assignment for students.</CardDescription></CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddAssignment} className="space-y-4">
                                <div className="space-y-2"><Label htmlFor="a-title">Assignment Title</Label><Input id="a-title" placeholder="e.g., Research Paper on AI Ethics" value={newAssignmentTitle} onChange={e => setNewAssignmentTitle(e.target.value)} required /></div>
                                <div className="space-y-2"><Label htmlFor="a-desc">Description</Label><Textarea id="a-desc" placeholder="A brief description of the assignment requirements." value={newAssignmentDesc} onChange={e => setNewAssignmentDesc(e.target.value)} /></div>
                                <Button type="submit" className="w-full" disabled={isSubmittingAssignment}>{isSubmittingAssignment && <Loader2 className="animate-spin mr-2" />}{isSubmittingAssignment ? 'Creating...' : 'Create Assignment'}</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader><CardTitle>Student Submissions</CardTitle><CardDescription>Review and grade submitted assignments.</CardDescription></CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Assignment</TableHead><TableHead>File</TableHead><TableHead>Grade</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {isLoadingSubmissions ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)
                               : submissions && submissions.length > 0 ? submissions.map((sub) => (
                                 <TableRow key={sub.id}>
                                   <TableCell className="font-medium">{sub.studentName}</TableCell>
                                   <TableCell>{sub.assignmentTitle}</TableCell>
                                   <TableCell><Button variant="link" asChild className="p-0 h-auto"><a href={sub.fileUrl} target="_blank" rel="noopener noreferrer">{sub.fileName}</a></Button></TableCell>
                                   <TableCell><GradeManager submission={sub} /></TableCell>
                                   <TableCell className="text-right">
                                   </TableCell>
                                 </TableRow>
                               ))
                               : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground h-24">No assignments have been submitted yet.</TableCell></TableRow>
                              }
                            </TableBody>
                          </Table>
                        </CardContent>
                    </Card>
                </div>
             </div>
          </TabsContent>
            
          <TabsContent value="studymaterial" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <MaterialUploader type="studyMaterials" />
                </div>
                <div className="lg:col-span-2">
                    <MaterialList type="studyMaterials" />
                </div>
            </div>
          </TabsContent>

          <TabsContent value="pyqs" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <MaterialUploader type="previousYearQuestionPapers" />
                </div>
                <div className="lg:col-span-2">
                    <MaterialList type="previousYearQuestionPapers" />
                </div>
            </div>
          </TabsContent>

          <TabsContent value="plagiarism" className="mt-4">
            <PlagiarismChecker />
          </TabsContent>

        </Tabs>
      </main>
      
      {selectedStudent && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="w-full sm:max-w-lg p-0">
                <ScrollArea className="h-full">
                    <div className="p-6">
                        <SheetHeader className="flex-row items-center justify-between">
                          <div>
                            <SheetTitle className="text-2xl font-headline flex items-center gap-3"><User /> Review: {selectedStudent.username}</SheetTitle>
                            <SheetDescription>Student ID: {selectedStudent.id} | Suspicion: {selectedStudent.suspicionScore || 0}% | Exam: {selectedStudent.examSubmitted ? `${selectedStudent.examScore}%` : 'Not Submitted'}</SheetDescription>
                          </div>
                        </SheetHeader>
                        <div className="mt-6 space-y-8">
                           <div><h3 className="text-lg font-semibold flex items-center gap-2 mb-3"><FileText className="text-primary w-5 h-5"/> AI Session Summary</h3><p className={cn("text-sm text-muted-foreground bg-card/50 p-4 rounded-md border")}>AI analysis is based on the latest exam session. It highlights key patterns and anomalies detected during proctoring.</p></div>
                           <div><h3 className="text-lg font-semibold flex items-center gap-2 mb-3"><Lightbulb className="text-primary w-5 h-5"/> AI Suggested Interventions</h3><ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground"><li>Manual review of video footage is recommended if score is high.</li><li>Consider a follow-up conversation if multiple alerts are clustered.</li></ul></div>
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3"><TriangleAlert className="text-primary w-5 h-5"/> Key Alerts Log</h3>
                                {isLoadingDetails ? <Skeleton className="h-20 w-full"/> : 
                                <div className="space-y-3">{sessionAlerts.length > 0 ? (sessionAlerts).map((alert) => (<div key={alert.id} className="text-sm text-muted-foreground border-l-2 border-destructive pl-3"><p className="font-medium text-foreground">{alert.message}</p><p>Time: {formatTimestamp(alert.timestamp)} | Impact: +{alert.scoreImpact}</p></div>)) : <p className="text-sm text-muted-foreground">No high-priority alerts recorded for the last session.</p>}</div>
                                }
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
