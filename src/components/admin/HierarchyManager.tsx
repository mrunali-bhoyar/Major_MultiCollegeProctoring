"use client";

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Department, Branch, Division } from '@/lib/types';
import { Loader2, PlusCircle } from 'lucide-react';

export function HierarchyManager({ collegeId }: { collegeId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // Data fetching
    const { data: departments, isLoading: loadingDeps } = useCollection<Department>(useMemoFirebase(() => firestore ? query(collection(firestore, 'departments'), where('collegeId', '==', collegeId)) : null, [firestore, collegeId]));
    const { data: branches, isLoading: loadingBranches } = useCollection<Branch>(useMemoFirebase(() => firestore ? collection(firestore, 'branches') : null, [firestore]));
    const { data: divisions, isLoading: loadingDivs } = useCollection<Division>(useMemoFirebase(() => firestore ? collection(firestore, 'divisions') : null, [firestore]));
    
    // State
    const [deptName, setDeptName] = useState('');
    const [branchName, setBranchName] = useState('');
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [divName, setDivName] = useState('');
    const [divYear, setDivYear] = useState('1');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'departments'), {
                collegeId,
                name: deptName,
            });
            setDeptName('');
            toast({ title: 'Success', description: 'Department added.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally { setIsSubmitting(false); }
    };

    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !selectedDeptId) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'branches'), {
                departmentId: selectedDeptId,
                name: branchName,
            });
            setBranchName('');
            toast({ title: 'Success', description: 'Branch added.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally { setIsSubmitting(false); }
    };

    const handleAddDivision = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !selectedBranchId) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'divisions'), {
                branchId: selectedBranchId,
                year: parseInt(divYear),
                name: divName,
            });
            setDivName('');
            toast({ title: 'Success', description: 'Division added.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="space-y-8">
            {/* Departments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> Add Department</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddDepartment} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Department Name</Label>
                                <Input value={deptName} onChange={e => setDeptName(e.target.value)} required placeholder="e.g. Engineering" />
                            </div>
                            <Button type="submit" disabled={isSubmitting || !deptName}>Add Department</Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Departments</CardTitle></CardHeader>
                    <CardContent>
                        {loadingDeps ? <Loader2 className="animate-spin" /> : (
                            <ul className="list-disc pl-5 space-y-1">
                                {departments?.map(d => <li key={d.id}>{d.name}</li>)}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> Add Branch</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddBranch} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Department</Label>
                                <Select onValueChange={setSelectedDeptId} value={selectedDeptId}>
                                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                    <SelectContent>
                                        {departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Branch Name</Label>
                                <Input value={branchName} onChange={e => setBranchName(e.target.value)} required placeholder="e.g. Computer Science" />
                            </div>
                            <Button type="submit" disabled={isSubmitting || !selectedDeptId || !branchName}>Add Branch</Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Branches</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Branch</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {branches?.filter(b => departments?.some(d => d.id === b.departmentId)).map(b => (
                                    <TableRow key={b.id}>
                                        <TableCell>{departments?.find(d => d.id === b.departmentId)?.name}</TableCell>
                                        <TableCell>{b.name}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Divisions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> Add Division</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddDivision} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Branch</Label>
                                <Select onValueChange={setSelectedBranchId} value={selectedBranchId}>
                                    <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                                    <SelectContent>
                                        {branches?.filter(b => departments?.some(d => d.id === b.departmentId)).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Year</Label>
                                    <Select onValueChange={setDivYear} value={divYear}>
                                        <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1st Year</SelectItem>
                                            <SelectItem value="2">2nd Year</SelectItem>
                                            <SelectItem value="3">3rd Year</SelectItem>
                                            <SelectItem value="4">4th Year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Division Name</Label>
                                    <Input value={divName} onChange={e => setDivName(e.target.value)} required placeholder="e.g. A" />
                                </div>
                            </div>
                            <Button type="submit" disabled={isSubmitting || !selectedBranchId || !divName}>Add Division</Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Divisions</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Branch</TableHead><TableHead>Year</TableHead><TableHead>Division</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {divisions?.filter(div => branches?.some(b => b.id === div.branchId && departments?.some(d => d.id === b.departmentId))).map(div => (
                                    <TableRow key={div.id}>
                                        <TableCell>{branches?.find(b => b.id === div.branchId)?.name}</TableCell>
                                        <TableCell>{div.year}</TableCell>
                                        <TableCell>{div.name}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
