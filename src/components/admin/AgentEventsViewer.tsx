"use client";

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserProfile } from '@/lib/types';
import { BrainCircuit } from 'lucide-react';

export function AgentEventsViewer({ user }: { user: UserProfile }) {
    const firestore = useFirestore();

    // Query builder based on role
    const eventsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        
        let q = collection(firestore, 'agentEvents');
        const constraints: any[] = [];
        
        if (user.role === 'FACULTY' || (user.role as string) === 'faculty') {
            constraints.push(where('collegeId', '==', user.collegeId || ''));
            constraints.push(where('divisionId', '==', user.divisionId || ''));
        } else if (user.role === 'COLLEGE_ADMIN') {
            constraints.push(where('collegeId', '==', user.collegeId || ''));
        }
        
        // Platform admin sees all, no constraints needed for them
        // Firestore requires orderBy to be compatible with where, since we didn't index timestamp with collegeId yet, we'll just limit
        // In a real app we'd create a composite index. For now, we'll fetch and sort in memory if needed, or rely on limit.
        constraints.push(limit(50));
        
        return query(q, ...constraints);
    }, [firestore, user.role, user.divisionId, user.collegeId]);

    const { data: events, isLoading } = useCollection<any>(eventsQuery);

    const getRiskBadge = (risk: string) => {
        switch (risk) {
            case 'CRITICAL': return 'destructive';
            case 'HIGH': return 'destructive';
            case 'MEDIUM': return 'default'; // yellow-ish ideally, but default is fine
            case 'LOW': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    AI Supervisor Agent Events
                </CardTitle>
                <CardDescription>
                    Real-time decisions and risk assessments made by the AI Supervisor across active exam sessions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Risk Level</TableHead>
                            <TableHead>Action Taken</TableHead>
                            <TableHead>Reasoning</TableHead>
                            <TableHead>Signals</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                </TableRow>
                            ))
                        ) : events && events.length > 0 ? (
                            events.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((event) => (
                                <TableRow key={event.id}>
                                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                        {new Date(event.timestamp).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="font-medium">{event.studentName}</TableCell>
                                    <TableCell>
                                        <Badge variant={getRiskBadge(event.riskLevel)}>{event.riskLevel}</Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-xs">
                                        {event.actionTaken}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {event.reasoningSummary}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {event.detectedSignals?.join(', ') || 'N/A'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                    No AI Supervisor events logged yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
