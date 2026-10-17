"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Mail, MessageSquare, CheckCircle, Clock, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SupportInbox() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [filterRole, setFilterRole] = useState('ALL');
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadMessages = async () => {
        setIsLoading(true);
        let localMsgs: any[] = [];
        try {
            const raw = localStorage.getItem('myproctor_support_messages_all');
            if (raw) localMsgs = JSON.parse(raw);
        } catch (e) {
            console.warn('Could not read local messages', e);
        }

        if (firestore) {
            try {
                const snap = await getDocs(collection(firestore, 'supportMessages'));
                const remoteMsgs: any[] = snap.docs.map(d => ({ ...(d.data() as any), id: d.id }));
                // Merge remote messages and local messages (deduplicated by id)
                const map = new Map<string, any>();
                localMsgs.forEach((m: any) => map.set(m.id || m.subject, m));
                remoteMsgs.forEach((m: any) => map.set(m.id || m.subject, m));
                setMessages(Array.from(map.values()));
            } catch (err: any) {
                // If cloud rules deny read on supportMessages, fallback to local seamlessly
                console.warn('Remote support messages not available:', err?.message || err);
                setMessages(localMsgs);
            }
        } else {
            setMessages(localMsgs);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadMessages();
    }, [firestore]);

    const handleUpdateStatus = async (msgId: string, status: string) => {
        // Update local state first
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status } : m));
        try {
            const raw = localStorage.getItem('myproctor_support_messages_all');
            if (raw) {
                const list = JSON.parse(raw);
                localStorage.setItem('myproctor_support_messages_all', JSON.stringify(
                    list.map((m: any) => m.id === msgId ? { ...m, status } : m)
                ));
            }
        } catch (e) {}

        if (firestore) {
            try {
                await updateDoc(doc(firestore, 'supportMessages', msgId), { status });
            } catch (err: any) {
                console.warn('Could not update status remotely:', err?.message || err);
            }
        }
        toast({ title: 'Status Updated', description: `Message marked as ${status}.` });
    };

    const handleReply = (email: string, subject: string) => {
        const mailSubject = encodeURIComponent(`Re: ${subject}`);
        window.open(`mailto:${email}?subject=${mailSubject}`, '_blank');
    };

    const filteredMessages = messages?.filter(m => {
        if (filterRole === 'ALL') return true;
        return m.senderRole?.toUpperCase() === filterRole.toUpperCase();
    }) || [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Support & Institutional Inquiries
                    </CardTitle>
                    <CardDescription>
                        Messages sent from College Admins, Faculty, and Students seeking onboarding and technical support.
                    </CardDescription>
                </div>
                <div className="w-48">
                    <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by Sender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Roles</SelectItem>
                            <SelectItem value="COLLEGE_ADMIN">College Admins</SelectItem>
                            <SelectItem value="FACULTY">Faculty</SelectItem>
                            <SelectItem value="STUDENT">Students</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sender</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading inquiries...</TableCell></TableRow>
                        ) : filteredMessages && filteredMessages.length > 0 ? (
                            filteredMessages.map(msg => (
                                <TableRow key={msg.id}>
                                    <TableCell>
                                        <div className="font-medium">{msg.senderName}</div>
                                        <div className="text-xs text-muted-foreground">{msg.senderEmail}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{msg.senderRole || 'N/A'}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[220px]">
                                        <div className="font-medium truncate">{msg.subject}</div>
                                        <div className="text-xs text-muted-foreground truncate">{msg.message}</div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {msg.category || 'General'}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={msg.status === 'RESOLVED' ? 'secondary' : 'default'}>
                                            {msg.status || 'SENT'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleReply(msg.senderEmail, msg.subject)}
                                                title="Reply via Email"
                                            >
                                                <Mail className="w-3.5 h-3.5 mr-1" /> Reply
                                            </Button>
                                            {msg.status !== 'RESOLVED' && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus(msg.id, 'RESOLVED')}
                                                    title="Mark Resolved"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No support inquiries found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
