"use client";

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { College } from '@/lib/types';
import { Loader2, PlusCircle, Copy, Send, Mail } from 'lucide-react';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
export function CollegeManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const collegesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'colleges') : null, [firestore]);
    const { data: colleges, isLoading } = useCollection<College>(collegesQuery);

    const adminsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('role', '==', 'COLLEGE_ADMIN')) : null, [firestore]);
    const { data: allAdmins } = useCollection<any>(adminsQuery);
    
    const auth = useAuth();
    
    // We don't need invitations anymore for College Admins since we create them directly

    // College Form
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Admin Invite Form
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminCollegeId, setAdminCollegeId] = useState('');
    const [isInvitingAdmin, setIsInvitingAdmin] = useState(false);

    const handleAddCollege = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'colleges'), {
                collegeName: name,
                collegeCode: code,
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            setName('');
            setCode('');
            toast({ title: 'Success', description: 'College added successfully.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !adminCollegeId || !auth) return;
        setIsInvitingAdmin(true);
        
        try {
            // 1. Initialize secondary app to prevent logging out current platform admin
            const apps = getApps();
            const secondaryApp = apps.find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
            const secondaryAuth = getAuth(secondaryApp);
            
            // Generate a random secure password that the user will never use
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "A1!";
            const email = adminEmail.trim().toLowerCase();
            
            // 2. Create Auth Account
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, randomPassword);
            const uid = userCredential.user.uid;
            
            // 3. Create Firestore Profile (Using primary firestore since platform admin is authenticated there)
            await setDoc(doc(firestore, 'users', uid), {
                uid: uid,
                id: uid,
                name: adminName,
                email: email,
                role: 'COLLEGE_ADMIN',
                collegeId: adminCollegeId,
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                suspicionScore: 0
            });
            
            // 4. Send Password Reset Email from Primary Auth
            await sendPasswordResetEmail(auth, email);
            
            // 5. Sign out secondary app
            await signOut(secondaryAuth);
            
            setAdminName('');
            setAdminEmail('');
            setAdminCollegeId('');
            toast({ title: 'Admin Account Created', description: `Setup email has been sent to ${email}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Creating Admin', description: error.message });
        } finally {
            setIsInvitingAdmin(false);
        }
    };

    const handleResendEmail = async (email: string) => {
        if (!auth) return;
        try {
            await sendPasswordResetEmail(auth, email);
            toast({ title: 'Email Sent', description: `Password setup email resent to ${email}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to Send Email', description: error.message });
        }
    };

    const handleUpdateAdminCollegeId = async (adminId: string, newCollegeId: string) => {
        if (!firestore || !newCollegeId) return;
        try {
            await updateDoc(doc(firestore, 'users', adminId), {
                collegeId: newCollegeId
            });
            toast({ title: 'Success', description: 'Admin has been assigned to the college.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle /> Add College</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddCollege} className="space-y-4">
                            <div className="space-y-2"><Label>College Name</Label><Input value={name} onChange={e=>setName(e.target.value)} required /></div>
                            <div className="space-y-2"><Label>College Code</Label><Input value={code} onChange={e=>setCode(e.target.value)} required /></div>
                            <Button type="submit" disabled={isSubmitting || !name || !code} className="w-full">
                                {isSubmitting && <Loader2 className="animate-spin mr-2 w-4 h-4" />} Add College
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><PlusCircle /> Create College Admin</CardTitle>
                        <p className="text-xs text-muted-foreground">Creates the account and emails them a setup link.</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <div className="space-y-2">
                                <Label>College</Label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={adminCollegeId} 
                                    onChange={e => setAdminCollegeId(e.target.value)} 
                                    required
                                >
                                    <option value="" disabled>Select College</option>
                                    {colleges?.map(c => <option key={c.id} value={c.id}>{c.collegeName}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2"><Label>Admin Name</Label><Input value={adminName} onChange={e=>setAdminName(e.target.value)} required /></div>
                            <div className="space-y-2"><Label>Admin Email</Label><Input type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} required /></div>
                            <Button type="submit" disabled={isInvitingAdmin || !adminName || !adminEmail || !adminCollegeId} className="w-full">
                                {isInvitingAdmin && <Loader2 className="animate-spin mr-2 w-4 h-4" />} Create Admin & Send Email
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            
            <div className="xl:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle>Colleges</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isLoading ? <TableRow><TableCell colSpan={3}><Loader2 className="animate-spin" /></TableCell></TableRow> :
                                    colleges && colleges.length > 0 ? colleges.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.collegeName}</TableCell>
                                            <TableCell>{c.collegeCode}</TableCell>
                                            <TableCell>{c.status}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">No colleges found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>College Admins</CardTitle>
                        <p className="text-xs text-muted-foreground">Note: Firebase's standard password reset email cannot be dynamically customized to display the College Name.</p>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Admin</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>College ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allAdmins?.map((admin: any) => (
                                    <TableRow key={admin.id}>
                                        <TableCell>{admin.name || admin.username}</TableCell>
                                        <TableCell>{admin.email}</TableCell>
                                        <TableCell>
                                            {admin.collegeId ? (
                                                <span className="font-mono text-xs">{admin.collegeId}</span>
                                            ) : (
                                                <select 
                                                    className="flex h-8 w-[140px] rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background"
                                                    onChange={e => handleUpdateAdminCollegeId(admin.id, e.target.value)}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Assign College...</option>
                                                    {colleges?.map(c => <option key={c.id} value={c.id}>{c.collegeName}</option>)}
                                                </select>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-semibold text-green-600 border border-green-200 bg-green-50 px-2 py-0.5 rounded">{admin.status || 'ACTIVE'}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => handleResendEmail(admin.email)} title="Resend Setup Email">
                                                <Mail className="w-4 h-4 mr-2" /> Resend
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!allAdmins?.length) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground h-24">No admins found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
