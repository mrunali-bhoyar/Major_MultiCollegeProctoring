"use client";

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { QuestionBank, Question, UserProfile } from '@/lib/types';
import * as XLSX from 'xlsx';
import { 
    Loader2, 
    PlusCircle, 
    Trash2, 
    UploadCloud, 
    FileSpreadsheet, 
    Download, 
    CheckCircle2, 
    HelpCircle, 
    Search, 
    ArrowLeft, 
    Layers, 
    FileText, 
    Sparkles, 
    AlertCircle,
    Check,
    BookOpen
} from 'lucide-react';

interface ExtractedQuestion {
    id: string;
    text: string;
    type: 'MCQ' | 'THEORY';
    options: string[];
    answer: string;
    marks: number;
    topic?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    isValid: boolean;
    errorReason?: string;
}

export function QuestionBankManager({ user }: { user: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    // Fetch question banks for this faculty/college
    const qbQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'questionBanks'), where('collegeId', '==', user.collegeId || '')) : null, 
        [firestore, user.collegeId]
    );
    const { data: questionBanks, isLoading: loadingQBs } = useCollection<QuestionBank>(qbQuery);

    const [selectedQbId, setSelectedQbId] = useState<string>('');
    const selectedQb = questionBanks?.find(qb => qb.id === selectedQbId);

    // Fetch questions for selected question bank
    const questionsQuery = useMemoFirebase(
        () => firestore && selectedQbId ? query(collection(firestore, 'questions'), where('questionBankId', '==', selectedQbId)) : null, 
        [firestore, selectedQbId]
    );
    const { data: questions, isLoading: loadingQuestions } = useCollection<Question>(questionsQuery);

    // Question Bank Creation State
    const [qbTitle, setQbTitle] = useState('');
    const [qbSubject, setQbSubject] = useState('');
    const [isSubmittingQb, setIsSubmittingQb] = useState(false);

    // Single Question Form State
    const [singleQType, setSingleQType] = useState<'MCQ' | 'THEORY'>('MCQ');
    const [singleQText, setSingleQText] = useState('');
    const [singleQOptions, setSingleQOptions] = useState(['', '', '', '']);
    const [singleQAnswer, setSingleQAnswer] = useState('');
    const [singleQMarks, setSingleQMarks] = useState('1');
    const [singleQTopic, setSingleQTopic] = useState('');
    const [isSubmittingSingleQ, setIsSubmittingSingleQ] = useState(false);

    // Bulk Upload State
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [uploadTab, setUploadTab] = useState<'bulk' | 'single'>('bulk');

    // Questions List Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'MCQ' | 'THEORY'>('ALL');

    // Create a new Question Bank
    const handleAddQb = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSubmittingQb(true);
        try {
            const docRef = await addDoc(collection(firestore, 'questionBanks'), {
                title: qbTitle.trim(),
                subject: qbSubject.trim(),
                collegeId: user.collegeId || '',
                createdByFacultyId: user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            setQbTitle('');
            setQbSubject('');
            setSelectedQbId(docRef.id);
            toast({ title: 'Success', description: 'Question bank created. You can now add or upload questions.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmittingQb(false);
        }
    };

    // Add a single question manually
    const handleAddSingleQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !selectedQbId) return;

        if (!singleQText.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Question text is required.' });
            return;
        }

        if (singleQType === 'MCQ') {
            const filledOptions = singleQOptions.filter(o => o.trim());
            if (filledOptions.length < 2) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please provide at least 2 options for an MCQ question.' });
                return;
            }
            if (!singleQAnswer.trim()) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please select or provide the correct answer.' });
                return;
            }
        }

        setIsSubmittingSingleQ(true);
        try {
            const parsedMarks = parseFloat(singleQMarks) || (singleQType === 'THEORY' ? 5 : 1);
            await addDoc(collection(firestore, 'questions'), {
                text: singleQText.trim(),
                type: singleQType,
                options: singleQType === 'MCQ' ? singleQOptions.map(o => o.trim()).filter(Boolean) : [],
                answer: singleQAnswer.trim(),
                modelAnswer: singleQType === 'THEORY' ? singleQAnswer.trim() : '',
                marks: parsedMarks,
                topic: singleQTopic.trim() || '',
                questionBankId: selectedQbId,
                collegeId: user.collegeId || '',
                createdByFacultyId: user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            // Reset form
            setSingleQText('');
            setSingleQOptions(['', '', '', '']);
            setSingleQAnswer('');
            setSingleQMarks(singleQType === 'THEORY' ? '5' : '1');
            setSingleQTopic('');
            toast({ title: 'Question Added', description: `${singleQType} question saved to question bank.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmittingSingleQ(false);
        }
    };

    // Parse single row from file into an ExtractedQuestion
    const parseRowToQuestion = (row: Record<string, any>, rowIndex: number): ExtractedQuestion | null => {
        const entries = Object.entries(row).map(([k, v]) => [
            k.trim().toLowerCase().replace(/[\s_-]+/g, ''),
            typeof v === 'string' ? v.trim() : (v !== null && v !== undefined ? String(v).trim() : '')
        ]);
        const map = new Map<string, string>(entries as [string, string][]);

        // Detect Question Text
        let text = '';
        for (const [k, v] of map) {
            if (['question', 'questiontext', 'text', 'prompt', 'q', 'questiontitle'].includes(k) && v) {
                text = v;
                break;
            }
        }
        if (!text) {
            for (const [k, v] of map) {
                if ((k.includes('question') || k.includes('prompt')) && v) {
                    text = v;
                    break;
                }
            }
        }
        if (!text) return null; // Ignore completely blank rows

        // Detect Question Type
        let rawType = '';
        for (const [k, v] of map) {
            if (['type', 'questiontype', 'qtype', 'kind', 'category'].includes(k) && v) {
                rawType = v.toLowerCase();
                break;
            }
        }

        // Detect Options
        let optA = map.get('optiona') || map.get('option1') || map.get('opta') || map.get('opt1') || map.get('a') || '';
        let optB = map.get('optionb') || map.get('option2') || map.get('optb') || map.get('opt2') || map.get('b') || '';
        let optC = map.get('optionc') || map.get('option3') || map.get('optc') || map.get('opt3') || map.get('c') || '';
        let optD = map.get('optiond') || map.get('option4') || map.get('optd') || map.get('opt4') || map.get('d') || '';

        // Check if combined options column exists (e.g. options: "Berlin;Madrid;Paris;Rome")
        const combinedOpts = map.get('options') || map.get('choices') || '';
        if (combinedOpts) {
            let parts = combinedOpts.split(/[;|]/).map(s => s.trim()).filter(Boolean);
            if (parts.length < 2) parts = combinedOpts.split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                optA = parts[0] || optA;
                optB = parts[1] || optB;
                optC = parts[2] || optC;
                optD = parts[3] || optD;
            }
        }

        const options = [optA, optB, optC, optD].filter(Boolean);

        // Determine question type (MCQ vs THEORY)
        let type: 'MCQ' | 'THEORY' = 'MCQ';
        if (rawType.includes('theor') || rawType.includes('desc') || rawType.includes('subjec') || rawType.includes('essay')) {
            type = 'THEORY';
        } else if (rawType.includes('mcq') || rawType.includes('obj') || rawType.includes('choice')) {
            type = 'MCQ';
        } else {
            // Auto-detect based on options presence
            type = options.length >= 2 ? 'MCQ' : 'THEORY';
        }

        // Detect Answer
        let rawAnswer = '';
        for (const [k, v] of map) {
            if (['answer', 'correctanswer', 'correct', 'ans', 'key', 'modelanswer', 'solution', 'rubric'].includes(k) && v) {
                rawAnswer = v;
                break;
            }
        }

        let answer = rawAnswer;
        if (type === 'MCQ') {
            const lowerAns = rawAnswer.toLowerCase().trim();
            if (['a', 'option a', 'option 1', '1', '(a)'].includes(lowerAns) && optA) answer = optA;
            else if (['b', 'option b', 'option 2', '2', '(b)'].includes(lowerAns) && optB) answer = optB;
            else if (['c', 'option c', 'option 3', '3', '(c)'].includes(lowerAns) && optC) answer = optC;
            else if (['d', 'option d', 'option 4', '4', '(d)'].includes(lowerAns) && optD) answer = optD;
            else if (!answer && options.length > 0) {
                answer = options[0];
            }
        }

        // Detect Marks
        let marks = type === 'THEORY' ? 5 : 1;
        for (const [k, v] of map) {
            if (['marks', 'mark', 'score', 'points', 'weightage'].includes(k) && v) {
                const num = parseFloat(v);
                if (!isNaN(num) && num > 0) marks = num;
                break;
            }
        }

        // Detect Topic
        let topic = '';
        for (const [k, v] of map) {
            if (['topic', 'subject', 'module', 'unit', 'chapter'].includes(k) && v) {
                topic = v;
                break;
            }
        }

        // Detect Difficulty
        let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
        for (const [k, v] of map) {
            if (['difficulty', 'level'].includes(k) && v) {
                const d = v.toLowerCase();
                if (d.includes('easy')) difficulty = 'Easy';
                else if (d.includes('hard')) difficulty = 'Hard';
                break;
            }
        }

        let isValid = true;
        let errorReason = '';
        if (type === 'MCQ' && options.length < 2) {
            isValid = false;
            errorReason = 'MCQ requires at least 2 options';
        }

        return {
            id: `row_${rowIndex}_${Date.now()}`,
            text,
            type,
            options: type === 'MCQ' ? options : [],
            answer,
            marks,
            topic,
            difficulty,
            isValid,
            errorReason
        };
    };

    // Handle File Selection and Parsing
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBulkFile(file);
        setIsExtracting(true);

        try {
            let rows: Record<string, any>[] = [];
            if (file.name.endsWith('.json')) {
                const text = await file.text();
                const parsed = JSON.parse(text);
                rows = Array.isArray(parsed) ? parsed : [parsed];
            } else {
                // Excel (.xlsx, .xls) or CSV
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                    toast({ variant: 'destructive', title: 'File Error', description: 'No sheets found in workbook.' });
                    setIsExtracting(false);
                    return;
                }
                const worksheet = workbook.Sheets[firstSheetName];
                rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
            }

            if (!rows || rows.length === 0) {
                toast({ variant: 'destructive', title: 'Empty File', description: 'No rows found in uploaded file.' });
                setIsExtracting(false);
                return;
            }

            const extracted: ExtractedQuestion[] = [];
            rows.forEach((r, idx) => {
                const parsed = parseRowToQuestion(r, idx + 1);
                if (parsed) extracted.push(parsed);
            });

            if (extracted.length === 0) {
                toast({ 
                    variant: 'destructive', 
                    title: 'No Questions Found', 
                    description: 'Could not extract questions from file. Check column headers (Question, Option A, Option B, Answer, Marks).' 
                });
                setIsExtracting(false);
                return;
            }

            setExtractedQuestions(extracted);
            const mcqCount = extracted.filter(q => q.type === 'MCQ').length;
            const theoryCount = extracted.filter(q => q.type === 'THEORY').length;

            toast({
                title: 'Questions Extracted!',
                description: `Successfully extracted ${extracted.length} questions (${mcqCount} MCQ, ${theoryCount} Theory). Review and click Import.`
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Extraction Error', description: err.message || 'Failed to read file.' });
        } finally {
            setIsExtracting(false);
        }
    };

    // Import all extracted questions into Firestore
    const handleImportAll = async () => {
        if (!firestore || !selectedQbId || extractedQuestions.length === 0) return;
        setIsImporting(true);

        let successCount = 0;
        let failCount = 0;

        try {
            for (const q of extractedQuestions) {
                if (!q.isValid && q.type === 'MCQ') {
                    failCount++;
                    continue;
                }
                await addDoc(collection(firestore, 'questions'), {
                    text: q.text,
                    type: q.type,
                    options: q.options || [],
                    answer: q.answer || '',
                    modelAnswer: q.type === 'THEORY' ? q.answer : '',
                    marks: q.marks || 1,
                    topic: q.topic || '',
                    difficulty: q.difficulty || 'Medium',
                    questionBankId: selectedQbId,
                    collegeId: user.collegeId || '',
                    createdByFacultyId: user.uid,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                successCount++;
            }

            toast({
                title: 'Bulk Import Completed!',
                description: `Successfully imported ${successCount} questions into "${selectedQb?.title || 'Question Bank'}".`
            });

            // Clear state after import
            setExtractedQuestions([]);
            setBulkFile(null);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Import Error', description: err.message });
        } finally {
            setIsImporting(false);
        }
    };

    // Delete single question
    const handleDeleteQuestion = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'questions', id));
            toast({ title: 'Deleted', description: 'Question removed from question bank.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    // Download formatted sample template for Faculty
    const downloadSampleTemplate = (format: 'xlsx' | 'csv') => {
        const sampleRows = [
            {
                "Type": "MCQ",
                "Question": "Which data structure operates on a Last In First Out (LIFO) principle?",
                "Option A": "Queue",
                "Option B": "Stack",
                "Option C": "Array",
                "Option D": "Linked List",
                "Answer": "Stack",
                "Marks": 1,
                "Topic": "Data Structures",
                "Difficulty": "Easy"
            },
            {
                "Type": "MCQ",
                "Question": "What is the primary purpose of the DNS protocol in computer networks?",
                "Option A": "Routing packets across LAN",
                "Option B": "Translating domain names into IP addresses",
                "Option C": "Encrypting web traffic",
                "Option D": "Allocating dynamic MAC addresses",
                "Answer": "B",
                "Marks": 1,
                "Topic": "Computer Networks",
                "Difficulty": "Medium"
            },
            {
                "Type": "THEORY",
                "Question": "Explain the four core pillars of Object-Oriented Programming (OOP) with real-world examples.",
                "Option A": "",
                "Option B": "",
                "Option C": "",
                "Option D": "",
                "Answer": "1. Encapsulation: Bundling data and methods into a single unit. 2. Abstraction: Hiding internal complexity. 3. Inheritance: Reusing parent class properties. 4. Polymorphism: Ability to take multiple forms.",
                "Marks": 5,
                "Topic": "Software Engineering",
                "Difficulty": "Medium"
            },
            {
                "Type": "THEORY",
                "Question": "Describe the ACID properties in Database Management Systems and explain why each is critical for transaction reliability.",
                "Option A": "",
                "Option B": "",
                "Option C": "",
                "Option D": "",
                "Answer": "Atomicity (all or nothing), Consistency (preserves database rules), Isolation (concurrent execution transparency), and Durability (committed changes persist).",
                "Marks": 5,
                "Topic": "DBMS",
                "Difficulty": "Hard"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Questions_Template");

        if (format === 'xlsx') {
            XLSX.writeFile(wb, "Question_Bank_Bulk_Template.xlsx");
        } else {
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "Question_Bank_Bulk_Template.csv";
            a.click();
            URL.revokeObjectURL(url);
        }

        toast({
            title: 'Sample Template Downloaded',
            description: `Saved Question_Bank_Bulk_Template.${format} with MCQ and Theory examples.`
        });
    };

    // Filter questions in list
    const filteredQuestions = useMemo(() => {
        if (!questions) return [];
        return questions.filter(q => {
            const matchesSearch = !searchQuery.trim() || 
                q.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const isTheory = q.type === 'THEORY' || (!q.options || q.options.length === 0);
            const isMcq = !isTheory;

            if (filterType === 'MCQ') return matchesSearch && isMcq;
            if (filterType === 'THEORY') return matchesSearch && isTheory;
            return matchesSearch;
        });
    }, [questions, searchQuery, filterType]);

    const totalQuestionsCount = questions?.length || 0;
    const mcqQuestionsCount = questions?.filter(q => q.type === 'MCQ' || (q.options && q.options.length > 0)).length || 0;
    const theoryQuestionsCount = totalQuestionsCount - mcqQuestionsCount;

    return (
        <div className="space-y-6">
            {/* Top Bar / Question Bank Selector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <PlusCircle className="w-5 h-5 text-primary" /> 
                                Create Question Bank
                            </CardTitle>
                            <CardDescription>
                                Set up a container for exam questions by subject or course.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddQb} className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="qb-title">Title / Name</Label>
                                    <Input 
                                        id="qb-title"
                                        placeholder="e.g., Mid-Term CS101 Bank" 
                                        value={qbTitle} 
                                        onChange={e => setQbTitle(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="qb-subject">Subject / Course</Label>
                                    <Input 
                                        id="qb-subject"
                                        placeholder="e.g., Computer Science" 
                                        value={qbSubject} 
                                        onChange={e => setQbSubject(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <Button type="submit" disabled={isSubmittingQb || !qbTitle.trim() || !qbSubject.trim()} className="w-full">
                                    {isSubmittingQb ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                                    Create Question Bank
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="border-border/60 shadow-sm h-full">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-primary" />
                                        Question Banks ({questionBanks?.length || 0})
                                    </CardTitle>
                                    <CardDescription>
                                        Select a Question Bank to bulk upload or manage questions.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingQBs ? (
                                <div className="py-8 flex items-center justify-center text-muted-foreground">
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading question banks...
                                </div>
                            ) : questionBanks && questionBanks.length > 0 ? (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead>Title</TableHead>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {questionBanks.map(qb => (
                                                <TableRow 
                                                    key={qb.id} 
                                                    className={selectedQbId === qb.id ? 'bg-primary/10 font-medium' : ''}
                                                >
                                                    <TableCell className="font-medium flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                                                        {qb.title}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{qb.subject}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {qb.createdAt ? new Date(qb.createdAt).toLocaleDateString() : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button 
                                                            variant={selectedQbId === qb.id ? 'default' : 'outline'} 
                                                            size="sm" 
                                                            onClick={() => setSelectedQbId(qb.id)}
                                                        >
                                                            {selectedQbId === qb.id ? 'Active Bank' : 'Manage Questions'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                    No question banks found. Create one using the form on the left.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Selected Question Bank Active Area */}
            {selectedQbId && selectedQb && (
                <div className="space-y-6 pt-2">
                    {/* Active Bank Header Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold font-headline">{selectedQb.title}</h3>
                                    <Badge variant="secondary" className="text-xs">{selectedQb.subject}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {totalQuestionsCount} questions total • {mcqQuestionsCount} MCQ • {theoryQuestionsCount} Theory
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedQbId('')}>
                                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to All Banks
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Question Add Modes (Bulk Upload or Single) */}
                        <div className="lg:col-span-5 space-y-4">
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="pb-3">
                                    <Tabs value={uploadTab} onValueChange={(v) => setUploadTab(v as 'bulk' | 'single')}>
                                        <div className="flex items-center justify-between gap-2">
                                            <CardTitle className="text-base font-semibold">Add Questions</CardTitle>
                                            <TabsList className="grid grid-cols-2 w-48">
                                                <TabsTrigger value="bulk" className="text-xs">Bulk File</TabsTrigger>
                                                <TabsTrigger value="single" className="text-xs">Single Question</TabsTrigger>
                                            </TabsList>
                                        </div>
                                    </Tabs>
                                </CardHeader>
                                <CardContent>
                                    {uploadTab === 'bulk' ? (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1.5">
                                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                    <Sparkles className="w-4 h-4 text-primary" />
                                                    Bulk Upload: MCQ & Theory Supported
                                                </div>
                                                <p className="text-muted-foreground">
                                                    Upload an Excel (<code className="text-primary">.xlsx</code>, <code className="text-primary">.xls</code>) or CSV file. All MCQ and Theory questions will be automatically extracted, validated, and added.
                                                </p>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => downloadSampleTemplate('xlsx')}
                                                        className="h-7 text-[11px]"
                                                    >
                                                        <Download className="w-3 h-3 mr-1" /> Template (.xlsx)
                                                    </Button>
                                                    <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => downloadSampleTemplate('csv')}
                                                        className="h-7 text-[11px]"
                                                    >
                                                        <Download className="w-3 h-3 mr-1" /> Template (.csv)
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* File Input Box */}
                                            <div className="border-2 border-dashed border-border/80 hover:border-primary/60 transition-colors rounded-lg p-5 text-center space-y-3 bg-card/50">
                                                <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <UploadCloud className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">Select or Drop Questions File</p>
                                                    <p className="text-xs text-muted-foreground">Supported formats: .xlsx, .xls, .csv, .json</p>
                                                </div>
                                                <Input 
                                                    id="bulk-question-file-input"
                                                    type="file" 
                                                    accept=".xlsx,.xls,.csv,.json"
                                                    onChange={handleFileChange}
                                                    disabled={isExtracting || isImporting}
                                                    className="max-w-xs mx-auto text-xs cursor-pointer"
                                                />
                                                {isExtracting && (
                                                    <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium">
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting questions from file...
                                                    </div>
                                                )}
                                            </div>

                                            {/* Extracted Questions Preview & Action */}
                                            {extractedQuestions.length > 0 && (
                                                <div className="space-y-3 pt-2">
                                                    <div className="flex items-center justify-between p-2.5 bg-muted/60 rounded-lg border text-xs">
                                                        <div>
                                                            <span className="font-semibold text-foreground">Extracted Questions:</span>{' '}
                                                            <strong className="text-primary font-bold">{extractedQuestions.length} Total</strong>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Badge variant="secondary" className="text-[10px]">
                                                                {extractedQuestions.filter(q => q.type === 'MCQ').length} MCQ
                                                            </Badge>
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {extractedQuestions.filter(q => q.type === 'THEORY').length} Theory
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    {/* Scrollable Preview List */}
                                                    <ScrollArea className="h-64 border rounded-lg p-2 bg-background space-y-2">
                                                        {extractedQuestions.map((eq, i) => (
                                                            <div key={eq.id} className="p-2.5 border rounded-md mb-2 text-xs space-y-1.5 bg-card/60">
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <div className="flex items-center gap-1.5 font-medium">
                                                                        <span className="text-muted-foreground">#{i + 1}</span>
                                                                        <Badge 
                                                                            variant={eq.type === 'MCQ' ? 'default' : 'secondary'} 
                                                                            className="text-[9px] px-1.5 py-0"
                                                                        >
                                                                            {eq.type}
                                                                        </Badge>
                                                                        <span className="text-[10px] text-muted-foreground">({eq.marks} {eq.marks === 1 ? 'Mark' : 'Marks'})</span>
                                                                    </div>
                                                                    {!eq.isValid && (
                                                                        <span className="text-destructive text-[10px] flex items-center gap-0.5">
                                                                            <AlertCircle className="w-3 h-3" /> {eq.errorReason}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="font-medium text-foreground line-clamp-2">{eq.text}</p>
                                                                {eq.type === 'MCQ' && eq.options.length > 0 && (
                                                                    <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground pt-1">
                                                                        {eq.options.map((opt, optIdx) => (
                                                                            <div 
                                                                                key={optIdx} 
                                                                                className={`px-1.5 py-0.5 rounded truncate ${opt === eq.answer ? 'bg-green-500/10 text-green-700 dark:text-green-400 font-semibold' : ''}`}
                                                                            >
                                                                                {String.fromCharCode(65 + optIdx)}. {opt}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {eq.type === 'THEORY' && eq.answer && (
                                                                    <p className="text-[11px] text-muted-foreground italic line-clamp-1 bg-muted/40 p-1 rounded">
                                                                        Answer: {eq.answer}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </ScrollArea>

                                                    <div className="flex items-center gap-2 pt-1">
                                                        <Button 
                                                            type="button" 
                                                            onClick={handleImportAll} 
                                                            disabled={isImporting}
                                                            className="flex-1"
                                                        >
                                                            {isImporting ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                    Importing Questions...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                                                                    Import All {extractedQuestions.length} Questions
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            onClick={() => { setExtractedQuestions([]); setBulkFile(null); }}
                                                            disabled={isImporting}
                                                            size="sm"
                                                        >
                                                            Clear
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Single Question Manual Form */
                                        <form onSubmit={handleAddSingleQuestion} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sq-type">Question Type</Label>
                                                    <Select value={singleQType} onValueChange={(v) => {
                                                        setSingleQType(v as 'MCQ' | 'THEORY');
                                                        setSingleQMarks(v === 'THEORY' ? '5' : '1');
                                                    }}>
                                                        <SelectTrigger id="sq-type">
                                                            <SelectValue placeholder="Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                                                            <SelectItem value="THEORY">Theory / Descriptive</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sq-marks">Marks</Label>
                                                    <Input 
                                                        id="sq-marks" 
                                                        type="number" 
                                                        min="1" 
                                                        value={singleQMarks} 
                                                        onChange={e => setSingleQMarks(e.target.value)} 
                                                        required 
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="sq-text">Question Text</Label>
                                                <Textarea 
                                                    id="sq-text"
                                                    value={singleQText} 
                                                    onChange={e => setSingleQText(e.target.value)} 
                                                    placeholder={singleQType === 'MCQ' ? "e.g., Which protocol is used for secure web browsing?" : "e.g., Explain the architecture of the Internet of Things (IoT) in detail."}
                                                    rows={3}
                                                    required 
                                                />
                                            </div>

                                            {singleQType === 'MCQ' ? (
                                                <div className="space-y-3">
                                                    <Label>Options</Label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {[0, 1, 2, 3].map(i => (
                                                            <div key={i} className="space-y-1">
                                                                <span className="text-[11px] text-muted-foreground font-medium">Option {String.fromCharCode(65 + i)}</span>
                                                                <Input 
                                                                    value={singleQOptions[i]} 
                                                                    onChange={e => {
                                                                        const copy = [...singleQOptions];
                                                                        copy[i] = e.target.value;
                                                                        setSingleQOptions(copy);
                                                                    }}
                                                                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                                                    required={i < 2}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="sq-answer">Correct Answer</Label>
                                                        <Select value={singleQAnswer} onValueChange={setSingleQAnswer}>
                                                            <SelectTrigger id="sq-answer">
                                                                <SelectValue placeholder="Select the correct option" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {singleQOptions.filter(o => o.trim()).map((o, idx) => (
                                                                    <SelectItem key={idx} value={o}>
                                                                        {String.fromCharCode(65 + idx)}. {o}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sq-theory-ans">Model Answer / Key Evaluation Points</Label>
                                                    <Textarea 
                                                        id="sq-theory-ans"
                                                        value={singleQAnswer} 
                                                        onChange={e => setSingleQAnswer(e.target.value)} 
                                                        placeholder="Provide the key points, expected rubrics, or sample answer for evaluation."
                                                        rows={3}
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <Label htmlFor="sq-topic">Topic / Unit (Optional)</Label>
                                                <Input 
                                                    id="sq-topic" 
                                                    value={singleQTopic} 
                                                    onChange={e => setSingleQTopic(e.target.value)} 
                                                    placeholder="e.g., Unit 3 - Networking" 
                                                />
                                            </div>

                                            <Button type="submit" disabled={isSubmittingSingleQ} className="w-full">
                                                {isSubmittingSingleQ ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                                                Add Question to Bank
                                            </Button>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Questions in this Bank */}
                        <div className="lg:col-span-7">
                            <Card className="border-border/60 shadow-sm h-full flex flex-col">
                                <CardHeader className="pb-3 border-b border-border/40">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                Bank Questions ({totalQuestionsCount})
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                All questions stored in this bank for exams.
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                                                <SelectTrigger className="w-28 h-8 text-xs">
                                                    <SelectValue placeholder="Filter" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ALL">All ({totalQuestionsCount})</SelectItem>
                                                    <SelectItem value="MCQ">MCQ ({mcqQuestionsCount})</SelectItem>
                                                    <SelectItem value="THEORY">Theory ({theoryQuestionsCount})</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Search input */}
                                    <div className="relative pt-2">
                                        <Search className="w-4 h-4 absolute left-3 top-4.5 text-muted-foreground" />
                                        <Input 
                                            placeholder="Search question text or topic..." 
                                            value={searchQuery} 
                                            onChange={e => setSearchQuery(e.target.value)} 
                                            className="pl-9 h-8 text-xs"
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 p-4">
                                    <ScrollArea className="h-[520px] pr-2">
                                        {loadingQuestions ? (
                                            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-sm">
                                                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                                Loading questions...
                                            </div>
                                        ) : filteredQuestions.length > 0 ? (
                                            <div className="space-y-3">
                                                {filteredQuestions.map((q, idx) => {
                                                    const isTheory = q.type === 'THEORY' || (!q.options || q.options.length === 0);
                                                    return (
                                                        <div key={q.id} className="p-4 border rounded-xl bg-card space-y-2.5 transition-shadow hover:shadow-sm">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-xs font-bold text-muted-foreground">Q{idx + 1}</span>
                                                                    <Badge 
                                                                        variant={isTheory ? "outline" : "default"}
                                                                        className={`text-[10px] ${isTheory ? 'border-primary/40 text-primary' : ''}`}
                                                                    >
                                                                        {isTheory ? 'THEORY' : 'MCQ'}
                                                                    </Badge>
                                                                    <Badge variant="secondary" className="text-[10px]">
                                                                        {q.marks || (isTheory ? 5 : 1)} {(q.marks || (isTheory ? 5 : 1)) === 1 ? 'Mark' : 'Marks'}
                                                                    </Badge>
                                                                    {q.topic && (
                                                                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                                                                            {q.topic}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                                    title="Delete Question"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>

                                                            <p className="text-sm font-semibold text-foreground">{q.text}</p>

                                                            {/* MCQ Options Display */}
                                                            {!isTheory && q.options && q.options.length > 0 && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                                                                    {q.options.map((opt, optIdx) => {
                                                                        const isCorrect = opt.trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
                                                                        return (
                                                                            <div 
                                                                                key={optIdx} 
                                                                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                                                                                    isCorrect 
                                                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium' 
                                                                                        : 'bg-muted/20 border-border/50 text-muted-foreground'
                                                                                }`}
                                                                            >
                                                                                <span className="font-bold shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                                                                                <span className="truncate flex-1">{opt}</span>
                                                                                {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {/* Theory Model Answer Display */}
                                                            {isTheory && (q.answer || q.modelAnswer) && (
                                                                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-1">
                                                                    <span className="font-semibold text-foreground text-[11px] block">Model Answer / Evaluation Rubrics:</span>
                                                                    <p className="text-muted-foreground whitespace-pre-wrap">{q.modelAnswer || q.answer}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="py-24 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                                                {searchQuery || filterType !== 'ALL' 
                                                    ? 'No questions match your filter criteria.' 
                                                    : 'No questions in this bank yet. Use Bulk Upload File or Add Single Question on the left.'}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
