"use client";

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Exam, QuestionBank, Division, UserProfile } from '@/lib/types';
import { Loader2, PlusCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export function ExamManager({ user }: { user: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    // Fetch existing exams for this faculty
    const examsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'exams'), where('facultyId', '==', user.uid || '')) : null, [firestore, user.uid]);
    const { data: exams, isLoading: loadingExams } = useCollection<Exam>(examsQuery);

    // Fetch Question Banks
    const qbQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'questionBanks'), where('createdByFacultyId', '==', user.uid || '')) : null, [firestore, user.uid]);
    const { data: questionBanks } = useCollection<QuestionBank>(qbQuery);

    // Fetch Divisions
    const divisionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'divisions') : null, [firestore]);
    const { data: divisions } = useCollection<Division>(divisionsQuery);

    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [subject, setSubject] = useState('');
    const [duration, setDuration] = useState('60');
    const [passingMarks, setPassingMarks] = useState('40');
    const [totalMarks, setTotalMarks] = useState('100');
    const [qbId, setQbId] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        if (!title || !subject || !qbId || !user.divisionId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill out required fields.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'exams'), {
                title,
                description: desc,
                subject,
                collegeId: user.collegeId,
                facultyId: user.uid,
                questionBankId: qbId,
                divisionId: user.divisionId,
                duration: parseInt(duration),
                totalMarks: parseInt(totalMarks),
                passingMarks: parseInt(passingMarks),
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            toast({ title: 'Success', description: 'Exam created successfully.' });
            setTitle(''); setDesc(''); setSubject('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> Create Exam</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateExam} className="space-y-4">
                            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} required /></div>
                            <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} required /></div>
                            <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
                            
                            <div className="space-y-2">
                                <Label>Select Question Bank</Label>
                                <Select value={qbId} onValueChange={setQbId}>
                                    <SelectTrigger><SelectValue placeholder="Select Question Bank" /></SelectTrigger>
                                    <SelectContent>
                                        {questionBanks?.map(qb => <SelectItem key={qb.id} value={qb.id}>{qb.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Assigned Division</Label>
                                <Input disabled value={user.divisionId ? 'Your Assigned Division' : 'No Division Assigned'} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Duration (mins)</Label><Input type="number" value={duration} onChange={e => setDuration(e.target.value)} /></div>
                                <div className="space-y-2"><Label>Total Marks</Label><Input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} /></div>
                            </div>
                            
                            <Button type="submit" disabled={isSubmitting || !title || !qbId || !user.divisionId} className="w-full">Create Exam</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader><CardTitle>My Exams</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {loadingExams ? <TableRow><TableCell colSpan={3}><Loader2 className="animate-spin" /></TableCell></TableRow> :
                                    exams && exams.length > 0 ? exams.map(ex => (
                                        <TableRow key={ex.id}>
                                            <TableCell>{ex.title}</TableCell>
                                            <TableCell>{ex.subject}</TableCell>
                                            <TableCell>{ex.status}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">No exams created yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
