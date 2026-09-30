import { collection, addDoc, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';

export type AuditAction = 'LOGIN' | 'CREATE_USER' | 'ASSIGN_ROLE' | 'CREATE_EXAM' | 'CREATE_QUESTION_BANK' | 'UPDATE_SETTINGS' | 'TERMINATE_EXAM';

export async function logAuditAction(
    userId: string,
    userEmail: string,
    action: AuditAction,
    details: string,
    targetId?: string
) {
    try {
        const db = getFirestore(getApp());
        const auditRef = collection(db, 'auditLogs');
        await addDoc(auditRef, {
            userId,
            userEmail,
            action,
            details,
            targetId: targetId || null,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        // Use console.warn instead of console.error to prevent Next.js from throwing a full-screen red error overlay in development
        console.warn("Failed to write audit log (Likely due to missing Firestore rules on the server)", e);
    }
}
