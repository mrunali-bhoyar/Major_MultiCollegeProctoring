"use client";

import React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function AuditLogViewer() {
    const firestore = useFirestore();

    const auditQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100)) : null, [firestore]);
    const { data: logs, isLoading } = useCollection<any>(auditQuery);

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User Email</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="animate-spin inline" /></TableCell></TableRow>
                        ) : logs && logs.length > 0 ? (
                            logs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell>{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                                    <TableCell>{log.userEmail}</TableCell>
                                    <TableCell className="font-semibold">{log.action}</TableCell>
                                    <TableCell>{log.details}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No audit logs found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
