"use client";

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Copy, Mail, Edit, Trash2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/firebase';

export function FacultyManager({ collegeId }: { collegeId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const auth = useAuth();
    
    // Existing Faculty
    const facultyQuery = useMemoFirebase(() => {
        if (!firestore || !collegeId) return null;
        return query(collection(firestore, 'users'), where('role', 'in', ['FACULTY', 'faculty']), where('collegeId', '==', collegeId));
    }, [firestore, collegeId]);
    const { data: allFaculty, isLoading: loadingFaculty } = useCollection<UserProfile>(facultyQuery);

    // Hierarchy data for cascading dropdowns
    const { data: departments } = useCollection<any>(useMemoFirebase(() => firestore ? query(collection(firestore, 'departments'), where('collegeId', '==', collegeId)) : null, [firestore, collegeId]));
    const { data: branches } = useCollection<any>(useMemoFirebase(() => firestore ? collection(firestore, 'branches') : null, [firestore]));
    const { data: divisions } = useCollection<any>(useMemoFirebase(() => firestore ? collection(firestore, 'divisions') : null, [firestore]));

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [selDept, setSelDept] = useState('');
    const [selBranch, setSelBranch] = useState('');
    const [selYear, setSelYear] = useState('');
    const [selDiv, setSelDiv] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateFaculty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !auth || !collegeId) return;
        setIsSubmitting(true);
        
        try {
            // 1. Initialize secondary app to prevent logging out current college admin
            const apps = getApps();
            const secondaryApp = apps.find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
            const secondaryAuth = getAuth(secondaryApp);
            
            // Generate a random secure password
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "A1!";
            const facultyEmail = email.trim().toLowerCase();
            
            // 2. Create Auth Account
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, facultyEmail, randomPassword);
            const uid = userCredential.user.uid;
            
            // 3. Create Firestore Profile (Using primary firestore)
            await setDoc(doc(firestore, 'users', uid), {
                uid: uid,
                id: uid,
                name: name,
                email: facultyEmail,
                role: 'FACULTY',
                collegeId: collegeId,
                departmentId: selDept,
                branchId: selBranch,
                yearId: selYear,
                divisionId: selDiv,
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                suspicionScore: 0
            });
            
            // 4. Send Password Reset Email from Primary Auth
            await sendPasswordResetEmail(auth, facultyEmail);
            
            // 5. Sign out secondary app
            await signOut(secondaryAuth);
            
            setName('');
            setEmail('');
            setSelDiv('');
            toast({ title: 'Faculty Account Created', description: `Setup email has been sent to ${facultyEmail}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Creating Faculty', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendEmail = async (facultyEmail: string) => {
        if (!auth) return;
        try {
            await sendPasswordResetEmail(auth, facultyEmail);
            toast({ title: 'Email Sent', description: `Password setup email resent to ${facultyEmail}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to Send Email', description: error.message });
        }
    };

    const handleToggleStatus = async (faculty: any) => {
        if (!firestore) return;
        try {
            const newStatus = faculty.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
            await updateDoc(doc(firestore, 'users', faculty.id), { status: newStatus });
            toast({ title: 'Status Updated', description: `Faculty status changed to ${newStatus}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    };

    const displayFaculty = allFaculty || [];
    const activeBranches = branches?.filter(b => b.departmentId === selDept) || [];
    const activeDivisions = divisions?.filter(d => d.branchId === selBranch && d.year === parseInt(selYear)) || [];

    return (
        <div className="space-y-8">
            {/* Create Faculty Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PlusCircle /> Add New Faculty</CardTitle>
                    <CardDescription>Create a faculty account and email them a setup link.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateFaculty} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Full Name</Label><Input value={name} onChange={e=>setName(e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
                        
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select value={selDept} onValueChange={setSelDept} required>
                                <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                                <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Branch</Label>
                            <Select value={selBranch} onValueChange={setSelBranch} disabled={!selDept} required>
                                <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                                <SelectContent>{activeBranches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Year</Label>
                            <Select value={selYear} onValueChange={setSelYear} disabled={!selBranch} required>
                                <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                                <SelectContent>
                                    {[1,2,3,4].map(y => <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Division</Label>
                            <Select value={selDiv} onValueChange={setSelDiv} disabled={!selYear} required>
                                <SelectTrigger><SelectValue placeholder="Select Division" /></SelectTrigger>
                                <SelectContent>{activeDivisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-full pt-4">
                            <Button type="submit" disabled={isSubmitting || !name || !email || !selDiv} className="w-full md:w-auto">
                                {isSubmitting && <Loader2 className="animate-spin mr-2 w-4 h-4" />} Create Faculty & Send Email
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Enrolled Faculty Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Faculty List</CardTitle>
                    <p className="text-xs text-muted-foreground">Note: Firebase's standard password reset email cannot be dynamically customized.</p>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Dept/Branch</TableHead>
                                    <TableHead>Year/Div</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingFaculty ? <TableRow><TableCell colSpan={6}><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow> :
                                    displayFaculty && displayFaculty.length > 0 ? displayFaculty.map(s => {
                                        const dept = departments?.find(d => d.id === s.departmentId)?.name || 'N/A';
                                        const branch = branches?.find(b => b.id === s.branchId)?.name || 'N/A';
                                        const div = divisions?.find(d => d.id === s.divisionId)?.name || 'N/A';
                                        return (
                                            <TableRow key={s.uid || s.email}>
                                                <TableCell className="font-medium">{s.name || (s as any).username}</TableCell>
                                                <TableCell>{s.email}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span>{dept}</span>
                                                        <span className="text-muted-foreground">{branch}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span>Year {s.yearId || 'N/A'}</span>
                                                        <span className="text-muted-foreground">Div {div}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${s.status === 'INACTIVE' ? 'text-red-600 border-red-200 bg-red-50' : 'text-green-600 border-green-200 bg-green-50'}`}>
                                                        {s.status || 'ACTIVE'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="icon" title="Resend Setup Email" onClick={() => handleResendEmail(s.email)}><Mail className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="icon" title={s.status === 'INACTIVE' ? 'Activate' : 'Deactivate'} onClick={() => handleToggleStatus(s)}><Edit className="w-4 h-4" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No faculty enrolled yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
