"use client";

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { QuestionBank, Question, UserProfile } from '@/lib/types';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

export function QuestionBankManager({ user }: { user: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    // Fetch question banks for this faculty/college
    const qbQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'questionBanks'), where('collegeId', '==', user.collegeId || '')) : null, [firestore, user.collegeId]);
    const { data: questionBanks, isLoading: loadingQBs } = useCollection<QuestionBank>(qbQuery);

    const [selectedQbId, setSelectedQbId] = useState<string>('');
    const questionsQuery = useMemoFirebase(() => firestore && selectedQbId ? query(collection(firestore, 'questions'), where('questionBankId', '==', selectedQbId)) : null, [firestore, selectedQbId]);
    const { data: questions, isLoading: loadingQuestions } = useCollection<Question>(questionsQuery);

    const [qbTitle, setQbTitle] = useState('');
    const [qbSubject, setQbSubject] = useState('');
    const [isSubmittingQb, setIsSubmittingQb] = useState(false);

    const INITIAL_QUESTION = { text: '', options: ['', '', '', ''], answer: '', marks: 1 };
    const [newQuestion, setNewQuestion] = useState(INITIAL_QUESTION);
    const [isSubmittingQ, setIsSubmittingQ] = useState(false);

    const handleAddQb = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSubmittingQb(true);
        try {
            await addDoc(collection(firestore, 'questionBanks'), {
                title: qbTitle,
                subject: qbSubject,
                collegeId: user.collegeId,
                createdByFacultyId: user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            setQbTitle('');
            setQbSubject('');
            toast({ title: 'Success', description: 'Question bank created.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally { setIsSubmittingQb(false); }
    };

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !selectedQbId) return;
        if (!newQuestion.text || newQuestion.options.some(o => !o) || !newQuestion.answer) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all fields.' });
            return;
        }
        setIsSubmittingQ(true);
        try {
            await addDoc(collection(firestore, 'questions'), {
                ...newQuestion,
                questionBankId: selectedQbId,
                collegeId: user.collegeId,
                createdByFacultyId: user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            setNewQuestion(INITIAL_QUESTION);
            toast({ title: 'Success', description: 'Question added.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally { setIsSubmittingQ(false); }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'questions', id));
            toast({ title: 'Deleted', description: 'Question deleted.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> New Question Bank</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddQb} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input value={qbTitle} onChange={e => setQbTitle(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Subject</Label>
                                    <Input value={qbSubject} onChange={e => setQbSubject(e.target.value)} required />
                                </div>
                                <Button type="submit" disabled={isSubmittingQb || !qbTitle || !qbSubject}>Create Question Bank</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader><CardTitle>Question Banks</CardTitle></CardHeader>
                        <CardContent>
                            {loadingQBs ? <Loader2 className="animate-spin" /> : (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Subject</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {questionBanks?.map(qb => (
                                            <TableRow key={qb.id} className={selectedQbId === qb.id ? 'bg-muted' : ''}>
                                                <TableCell>{qb.title}</TableCell>
                                                <TableCell>{qb.subject}</TableCell>
                                                <TableCell><Button variant="outline" size="sm" onClick={() => setSelectedQbId(qb.id)}>Manage Questions</Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {selectedQbId && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader><CardTitle>Add Question</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddQuestion} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Question Text</Label>
                                        <Textarea value={newQuestion.text} onChange={e => setNewQuestion({...newQuestion, text: e.target.value})} required />
                                    </div>
                                    {[0,1,2,3].map(i => (
                                        <div key={i} className="space-y-2">
                                            <Label>Option {i+1}</Label>
                                            <Input value={newQuestion.options[i]} onChange={e => {
                                                const opts = [...newQuestion.options];
                                                opts[i] = e.target.value;
                                                setNewQuestion({...newQuestion, options: opts});
                                            }} required />
                                        </div>
                                    ))}
                                    <div className="space-y-2">
                                        <Label>Correct Answer</Label>
                                        <Select value={newQuestion.answer} onValueChange={v => setNewQuestion({...newQuestion, answer: v})}>
                                            <SelectTrigger><SelectValue placeholder="Select Answer" /></SelectTrigger>
                                            <SelectContent>
                                                {newQuestion.options.filter(o => o).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="submit" disabled={isSubmittingQ}>Add Question</Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader><CardTitle>Questions</CardTitle></CardHeader>
                            <CardContent>
                                <ScrollArea className="h-96">
                                    {loadingQuestions ? <Loader2 className="animate-spin" /> : questions?.map(q => (
                                        <div key={q.id} className="p-4 border rounded-md mb-4 bg-card">
                                            <div className="flex justify-between">
                                                <p className="font-semibold">{q.text}</p>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                            </div>
                                            <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground">
                                                {q.options.map(opt => (
                                                    <li key={opt} className={opt === q.answer ? 'text-primary font-bold' : ''}>{opt}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
