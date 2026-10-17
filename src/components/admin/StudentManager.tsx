"use client";

import React, { useState } from 'react';
import { useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    PlusCircle, 
    Copy, 
    FileUp, 
    Download, 
    Mail, 
    Trash2, 
    Link as LinkIcon, 
    RefreshCw, 
    AlertTriangle, 
    CheckCircle2 
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import * as XLSX from 'xlsx';

export function StudentManager({ collegeId, facultyDivisionId }: { collegeId: string, facultyDivisionId?: string }) {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    
    // Existing Students
    const studentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('role', 'in', ['STUDENT', 'student']), where('collegeId', '==', collegeId)) : null, [firestore, collegeId]);
    const { data: allStudents, isLoading: loadingStudents } = useCollection<UserProfile>(studentsQuery);
    
    // Invitations
    const invQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'invitations'), where('collegeId', '==', collegeId), where('role', '==', 'STUDENT')) : null, [collegeId, firestore]);
    const { data: invitations } = useCollection<any>(invQuery);

    // Hierarchy data for cascading dropdowns
    const { data: departments } = useCollection<any>(useMemoFirebase(() => firestore ? query(collection(firestore, 'departments'), where('collegeId', '==', collegeId)) : null, [firestore, collegeId]));
    const { data: branches } = useCollection<any>(useMemoFirebase(() => firestore ? collection(firestore, 'branches') : null, [firestore]));
    const { data: divisions } = useCollection<any>(useMemoFirebase(() => firestore ? collection(firestore, 'divisions') : null, [firestore]));
    const { data: facultyMembers } = useCollection<any>(useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('collegeId', '==', collegeId), where('role', 'in', ['FACULTY', 'faculty'])) : null, [firestore, collegeId]));

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [selDept, setSelDept] = useState('');
    const [selBranch, setSelBranch] = useState('');
    const [selYear, setSelYear] = useState('');
    const [selDiv, setSelDiv] = useState('');
    const [selFaculty, setSelFaculty] = useState('');
    const [sendDirectEmail, setSendDirectEmail] = useState(true);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);

    // Helper: Register student and trigger Firebase Auth email
    const processStudentInvite = async (studentName: string, studentEmail: string) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const cleanEmail = studentEmail.trim().toLowerCase();
        const cleanName = studentName.trim();
        let authEmailSent = false;

        if (sendDirectEmail && auth) {
            try {
                const apps = getApps();
                const secondaryApp = apps.find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
                const secondaryAuth = getAuth(secondaryApp);
                const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "A1!";

                let createdUid: string | null = null;
                try {
                    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, randomPassword);
                    createdUid = userCredential.user.uid;
                } catch (authErr: any) {
                    if (authErr.code !== 'auth/email-already-in-use') {
                        console.warn("Secondary auth error:", authErr);
                    }
                }

                // If user was created, populate Firestore user document
                if (createdUid) {
                    await setDoc(doc(firestore, 'users', createdUid), {
                        uid: createdUid,
                        id: createdUid,
                        name: cleanName,
                        username: cleanName,
                        email: cleanEmail,
                        role: 'STUDENT',
                        collegeId: collegeId || null,
                        departmentId: selDept || null,
                        branchId: selBranch || null,
                        yearId: selYear || null,
                        divisionId: selDiv || null,
                        facultyId: selFaculty || null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        suspicionScore: 0,
                        status: 'ACTIVE'
                    }, { merge: true });
                }

                // Send Firebase password reset / account setup email
                try {
                    await sendPasswordResetEmail(auth, cleanEmail);
                    authEmailSent = true;
                } catch (emailErr) {
                    console.warn("Firebase email error:", emailErr);
                }

                await signOut(secondaryAuth);
            } catch (err) {
                console.warn("Error registering student in Auth:", err);
            }
        }

        // Always create invitation document for tracking
        const invRef = await addDoc(collection(firestore, 'invitations'), {
            studentName: cleanName,
            email: cleanEmail,
            role: 'STUDENT',
            collegeId: collegeId,
            departmentId: selDept,
            branchId: selBranch,
            yearId: selYear,
            divisionId: selDiv,
            facultyId: selFaculty,
            status: authEmailSent ? 'INVITED' : 'PENDING',
            authEmailSent: authEmailSent,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });

        return { id: invRef.id, authEmailSent };
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            const { authEmailSent } = await processStudentInvite(name, email);
            setName('');
            setEmail('');
            toast({ 
                title: authEmailSent ? 'Account Created & Email Sent' : 'Invitation Created', 
                description: authEmailSent 
                    ? `Password setup email sent to ${email.trim()}.` 
                    : `Invitation created successfully.` 
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (text: string, label = 'Invitation code') => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied', description: `${label} copied to clipboard.` });
    };

    const copyInviteLink = (invId: string, invEmail: string, invName: string) => {
        const origin = window.location.origin;
        const link = `${origin}/signup?code=${invId}&email=${encodeURIComponent(invEmail)}&name=${encodeURIComponent(invName)}`;
        navigator.clipboard.writeText(link);
        toast({ title: 'Link Copied', description: 'Direct registration link copied to clipboard.' });
    };

    const openMailClient = (invId: string, invEmail: string, invName: string) => {
        const origin = window.location.origin;
        const signupUrl = `${origin}/signup?code=${invId}&email=${encodeURIComponent(invEmail)}&name=${encodeURIComponent(invName)}`;
        const subject = encodeURIComponent("Invitation to join MyProctor Online Examination Portal");
        const body = encodeURIComponent(
            `Dear ${invName},\n\nYou have been invited to join the MyProctor Online Examination Portal.\n\nPlease complete your account registration using the link below:\n${signupUrl}\n\nYour Invitation Code: ${invId}\n\nBest regards,\nFaculty Invigilation Team`
        );
        window.open(`mailto:${invEmail}?subject=${subject}&body=${body}`, '_blank');
    };

    const handleResendFirebaseEmail = async (invEmail: string, invId: string) => {
        if (!auth) return;
        setResendingEmailId(invId);
        try {
            await sendPasswordResetEmail(auth, invEmail);
            toast({ title: 'Setup Email Sent', description: `Password setup email sent to ${invEmail}.` });
        } catch (err: any) {
            toast({ 
                variant: 'destructive', 
                title: 'Could not send setup email', 
                description: err.message || 'Ensure student account exists or use Mail link.' 
            });
        } finally {
            setResendingEmailId(null);
        }
    };

    const handleDeleteInvitation = async (invId: string) => {
        if (!firestore) return;
        setDismissedIds(prev => [...prev, invId]);
        try {
            await deleteDoc(doc(firestore, 'invitations', invId));
            toast({ title: 'Removed', description: 'Invitation removed.' });
        } catch {
            try {
                await updateDoc(doc(firestore, 'invitations', invId), { 
                    status: 'DELETED',
                    deletedAt: new Date().toISOString() 
                });
                toast({ title: 'Removed', description: 'Invitation removed.' });
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'Error', description: err.message });
            }
        }
    };

    // Robust Excel / CSV bulk parsing
    const handleBulkInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !csvFile) return;
        setIsBulkSubmitting(true);
        try {
            const buffer = await csvFile.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            if (!firstSheet) {
                toast({ variant: 'destructive', title: 'Error', description: 'No sheets found in file.' });
                setIsBulkSubmitting(false);
                return;
            }

            const rawRows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 });
            if (!rawRows || rawRows.length < 2) {
                toast({ variant: 'destructive', title: 'Error', description: 'File contains no data rows.' });
                setIsBulkSubmitting(false);
                return;
            }

            // Detect column indices from header
            const headerRow = rawRows[0].map(c => String(c || '').trim().toLowerCase());
            let nameCol = headerRow.findIndex(h => h.includes('name') || h.includes('student'));
            let emailCol = headerRow.findIndex(h => h.includes('email') || h.includes('mail'));

            // Fallback column positions
            if (nameCol === -1) nameCol = 0;
            if (emailCol === -1) emailCol = 1;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const validStudents: { name: string, email: string }[] = [];

            for (let i = 1; i < rawRows.length; i++) {
                const row = rawRows[i];
                if (!row || row.length === 0) continue;

                let rowName = String(row[nameCol] || '').trim();
                let rowEmail = String(row[emailCol] || '').trim().toLowerCase();

                // If swapped or name column has email
                if (!emailRegex.test(rowEmail) && emailRegex.test(rowName)) {
                    const temp = rowName;
                    rowName = rowEmail;
                    rowEmail = temp;
                }

                // Filter out binary garbage or invalid emails
                const isBinaryGarbage = /[\uFFFD\x00-\x08\x0E-\x1F]|docProps|PK\x03/.test(rowName);
                if (rowName && emailRegex.test(rowEmail) && !isBinaryGarbage) {
                    validStudents.push({ name: rowName, email: rowEmail });
                }
            }

            if (validStudents.length === 0) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Invalid File Content', 
                    description: 'No valid student records found. Ensure your file contains "Name" and "Email" columns with valid emails.' 
                });
                setIsBulkSubmitting(false);
                return;
            }

            let successCount = 0;
            let emailSentCount = 0;
            let failedCount = 0;

            for (const student of validStudents) {
                try {
                    const res = await processStudentInvite(student.name, student.email);
                    successCount++;
                    if (res.authEmailSent) emailSentCount++;
                } catch (err) {
                    failedCount++;
                }
            }

            toast({ 
                title: 'Bulk Processing Complete', 
                description: `Added ${successCount} students. Setup emails sent to ${emailSentCount} students.${failedCount > 0 ? ` (${failedCount} failed)` : ''}` 
            });
            setCsvFile(null);
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Reading File', description: error.message });
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    // Clean corrupt / binary entries from Firestore
    const isRecordCorrupted = (inv: any) => {
        if (!inv.email || !inv.email.includes('@')) return true;
        if (!inv.studentName) return true;
        if (inv.studentName.length > 80) return true;
        if (/[\uFFFD\x00-\x08\x0E-\x1F]|docProps|PK\x03/.test(inv.studentName)) return true;
        return false;
    };

    const visibleInvitations = invitations?.filter(inv => inv.status !== 'DELETED' && !dismissedIds.includes(inv.id)) || [];
    const corruptedInvitations = visibleInvitations.filter(isRecordCorrupted);

    const handleCleanCorrupted = async () => {
        if (!firestore || corruptedInvitations.length === 0) return;
        setIsCleaning(true);
        const idsToClean = corruptedInvitations.map(c => c.id);
        setDismissedIds(prev => [...prev, ...idsToClean]);

        let cleanedCount = 0;
        for (const item of corruptedInvitations) {
            try {
                await deleteDoc(doc(firestore, 'invitations', item.id));
                cleanedCount++;
            } catch {
                try {
                    await updateDoc(doc(firestore, 'invitations', item.id), { 
                        status: 'DELETED',
                        deletedAt: new Date().toISOString() 
                    });
                    cleanedCount++;
                } catch (updateErr) {
                    console.warn("Could not mark as deleted:", updateErr);
                }
            }
        }
        setIsCleaning(false);
        toast({ title: 'Cleaned Up', description: `Successfully cleaned ${cleanedCount} corrupted records.` });
    };

    const downloadCsvTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Name,Email\nJohn Doe,john@example.com\nJane Smith,jane@example.com";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "students_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const displayStudents = allStudents?.filter(s => {
        if (facultyDivisionId) {
            return s.divisionId === facultyDivisionId;
        }
        return s.collegeId === collegeId;
    });

    const activeBranches = branches?.filter(b => b.departmentId === selDept) || [];
    const activeDivisions = divisions?.filter(d => d.branchId === selBranch && d.year === parseInt(selYear)) || [];
    const activeFaculty = facultyMembers?.filter(f => f.divisionId === selDiv) || facultyMembers || [];

    return (
        <div className="space-y-8">
            {/* Invite Student Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PlusCircle /> Invite & Add Students</CardTitle>
                    <CardDescription>Onboard students individually or upload an Excel (.xlsx) / CSV file.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="single" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="single">Single Student</TabsTrigger>
                            <TabsTrigger value="bulk">Bulk Upload (.csv / .xlsx)</TabsTrigger>
                        </TabsList>
                        
                        {/* Scope Dropdowns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pb-4 border-b">
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Select value={selDept} onValueChange={setSelDept}>
                                    <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                                    <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Branch</Label>
                                <Select value={selBranch} onValueChange={setSelBranch} disabled={!selDept}>
                                    <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                                    <SelectContent>{activeBranches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Select value={selYear} onValueChange={setSelYear} disabled={!selBranch}>
                                    <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                                    <SelectContent>
                                        {[1,2,3,4].map(y => <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Division</Label>
                                <Select value={selDiv} onValueChange={setSelDiv} disabled={!selYear}>
                                    <SelectTrigger><SelectValue placeholder="Select Division" /></SelectTrigger>
                                    <SelectContent>{activeDivisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 lg:col-span-4">
                                <Label>Assigned Faculty</Label>
                                <Select value={selFaculty} onValueChange={setSelFaculty} disabled={!selDiv}>
                                    <SelectTrigger><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                                    <SelectContent>{activeFaculty.map(f => <SelectItem key={f.id} value={f.uid || f.id}>{f.name || f.email}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Email Dispatch Checkbox */}
                        <div className="flex items-center space-x-2 mb-6 p-3 bg-muted/40 rounded-lg border">
                            <Checkbox 
                                id="send-email" 
                                checked={sendDirectEmail} 
                                onCheckedChange={(checked) => setSendDirectEmail(!!checked)} 
                            />
                            <Label htmlFor="send-email" className="text-sm cursor-pointer font-medium flex items-center gap-1.5">
                                <Mail className="w-4 h-4 text-primary" />
                                Automatically create student account & send setup link to student's email (Firebase Auth)
                            </Label>
                        </div>

                        {/* Single Form */}
                        <TabsContent value="single">
                            <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Full Name</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rahul Sharma" required /></div>
                                <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="e.g. rahul@example.com" required /></div>
                                
                                <div className="col-span-full pt-4">
                                    <Button type="submit" disabled={isSubmitting || !name || !email || !selDiv || !selFaculty}>
                                        {isSubmitting && <Loader2 className="animate-spin mr-2 w-4 h-4" />} Create & Send Invitation
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        {/* Bulk Upload Form */}
                        <TabsContent value="bulk">
                            <form onSubmit={handleBulkInvite} className="space-y-4">
                                <div className="p-6 border-2 border-dashed rounded-lg bg-muted/20 text-center space-y-4 hover:border-primary/50 transition-colors">
                                    <FileUp className="w-10 h-10 mx-auto text-primary" />
                                    <div>
                                        <p className="text-base font-semibold mb-1">Upload Student List (.xlsx, .xls, .csv)</p>
                                        <p className="text-xs text-muted-foreground">Supported formats: Microsoft Excel (.xlsx/.xls) or CSV with "Name" and "Email" columns.</p>
                                    </div>
                                    <Input 
                                        id="csv-upload"
                                        type="file" 
                                        accept=".csv, .xlsx, .xls" 
                                        className="max-w-xs mx-auto cursor-pointer"
                                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                        required
                                    />
                                </div>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <Button type="submit" disabled={isBulkSubmitting || !csvFile || !selDiv || !selFaculty}>
                                        {isBulkSubmitting && <Loader2 className="animate-spin mr-2 w-4 h-4" />} Upload & Invite Students
                                    </Button>
                                    <Button type="button" variant="outline" onClick={downloadCsvTemplate}>
                                        <Download className="mr-2 w-4 h-4" /> Download Sample CSV Template
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Pending Invitations Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle>Invitations & Onboarding</CardTitle>
                            <CardDescription>Track sent invitations and onboarding status.</CardDescription>
                        </div>
                        {corruptedInvitations.length > 0 && (
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={handleCleanCorrupted} 
                                disabled={isCleaning}
                                className="flex items-center gap-1.5"
                            >
                                {isCleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Clean {corruptedInvitations.length} Corrupted Record{corruptedInvitations.length > 1 ? 's' : ''}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleInvitations && visibleInvitations.length > 0 ? (
                                    visibleInvitations.map(inv => {
                                        const isCorrupt = isRecordCorrupted(inv);
                                        return (
                                            <TableRow key={inv.id} className={isCorrupt ? "bg-destructive/10" : ""}>
                                                <TableCell className="max-w-[140px] truncate font-medium">
                                                    {isCorrupt ? (
                                                        <span className="flex items-center gap-1 text-destructive font-mono text-xs">
                                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Invalid Row
                                                        </span>
                                                    ) : (
                                                        inv.studentName
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-[180px] truncate text-xs">
                                                    <div>{inv.email}</div>
                                                    {inv.authEmailSent && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-semibold">
                                                            <CheckCircle2 className="w-3 h-3" /> Email Dispatched
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    <span className="inline-flex items-center gap-1">
                                                        {inv.id?.slice(0, 8)}...
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6" 
                                                            title="Copy Code" 
                                                            onClick={() => copyToClipboard(inv.id, 'Code')}
                                                        >
                                                            <Copy className="w-3 h-3" />
                                                        </Button>
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {!isCorrupt && (
                                                            <>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-7 w-7 text-primary" 
                                                                    title="Copy Direct Registration Link" 
                                                                    onClick={() => copyInviteLink(inv.id, inv.email, inv.studentName)}
                                                                >
                                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-7 w-7 text-blue-500" 
                                                                    title="Open in Mail App (Direct Email)" 
                                                                    onClick={() => openMailClient(inv.id, inv.email, inv.studentName)}
                                                                >
                                                                    <Mail className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-7 w-7 text-emerald-500" 
                                                                    title="Resend Firebase Setup Email" 
                                                                    disabled={resendingEmailId === inv.id}
                                                                    onClick={() => handleResendFirebaseEmail(inv.email, inv.id)}
                                                                >
                                                                    {resendingEmailId === inv.id ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                                    )}
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-destructive hover:text-destructive" 
                                                            title="Delete Invitation" 
                                                            onClick={() => handleDeleteInvitation(inv.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                                            No invitations created yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Enrolled Students Table */}
                <Card>
                    <CardHeader><CardTitle>Enrolled Students</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Suspicion Score</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingStudents ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-6"><Loader2 className="animate-spin mx-auto w-5 h-5" /></TableCell></TableRow>
                                ) : displayStudents && displayStudents.length > 0 ? (
                                    displayStudents.map(s => (
                                        <TableRow key={s.uid || s.email}>
                                            <TableCell className="font-medium">{s.name || (s as any).username}</TableCell>
                                            <TableCell>{s.email}</TableCell>
                                            <TableCell className="font-semibold text-yellow-600 dark:text-yellow-400">{(s as any).suspicionScore || 0}%</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                                                    {s.status || 'ACTIVE'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No students enrolled yet.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
