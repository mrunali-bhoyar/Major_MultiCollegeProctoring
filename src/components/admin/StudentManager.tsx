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
import { Loader2, PlusCircle, Copy } from 'lucide-react';
import { UserProfile } from '@/lib/types';

export function StudentManager({ collegeId, facultyDivisionId }: { collegeId: string, facultyDivisionId?: string }) {
    const firestore = useFirestore();
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
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            const invRef = await addDoc(collection(firestore, 'invitations'), {
                studentName: name,
                email: email.trim().toLowerCase(),
                role: 'STUDENT',
                collegeId: collegeId,
                departmentId: selDept,
                branchId: selBranch,
                yearId: selYear,
                divisionId: selDiv,
                facultyId: selFaculty,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            });
            setName('');
            setEmail('');
            toast({ title: 'Invitation Created', description: `Invitation code: ${invRef.id}` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied', description: 'Invitation code copied to clipboard.' });
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
                <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> Invite New Student</CardTitle><CardDescription>Create a secure onboarding invitation for a student.</CardDescription></CardHeader>
                <CardContent>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Full Name</Label><Input value={name} onChange={e=>setName(e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
                        
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

                        <div className="space-y-2">
                            <Label>Assigned Faculty</Label>
                            <Select value={selFaculty} onValueChange={setSelFaculty} disabled={!selDiv}>
                                <SelectTrigger><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                                <SelectContent>{activeFaculty.map(f => <SelectItem key={f.id} value={f.uid || f.id}>{f.name || f.email}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-full pt-4">
                            <Button type="submit" disabled={isSubmitting || !name || !email || !selDiv || !selFaculty}>
                                {isSubmitting && <Loader2 className="animate-spin mr-2 w-4 h-4" />} Create Invitation
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Pending Invitations Table */}
                <Card>
                    <CardHeader><CardTitle>Pending Invitations</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Email</TableHead><TableHead>Code</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {invitations?.filter(i => i.status === 'PENDING').map(inv => (
                                    <TableRow key={inv.id}>
                                        <TableCell>{inv.studentName}</TableCell>
                                        <TableCell>{inv.email}</TableCell>
                                        <TableCell className="font-mono text-xs flex items-center gap-2">
                                            {inv.id} <Button variant="ghost" size="icon" onClick={() => copyToClipboard(inv.id)}><Copy className="w-3 h-3" /></Button>
                                        </TableCell>
                                        <TableCell>{inv.status}</TableCell>
                                    </TableRow>
                                ))}
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
                                {loadingStudents ? <TableRow><TableCell colSpan={3}><Loader2 className="animate-spin" /></TableCell></TableRow> :
                                    displayStudents && displayStudents.length > 0 ? displayStudents.map(s => (
                                        <TableRow key={s.uid || s.email}>
                                            <TableCell>{s.name || (s as any).username}</TableCell>
                                            <TableCell>{s.email}</TableCell>
                                            <TableCell className="font-semibold text-yellow-600 dark:text-yellow-400">{(s as any).suspicionScore || 0}%</TableCell>
                                            <TableCell>{s.status || 'ACTIVE'}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">No students enrolled yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
