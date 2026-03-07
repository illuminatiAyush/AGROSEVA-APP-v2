/**
 * Notifications Screen
 *
 * Displays all in-app sensor and system alerts from useNotificationStore.
 * Marks all as read on mount. Shows icon, severity colour, metric, and time-ago.
 */

import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore, SensorAlert } from '@/store/useNotificationStore';
import { colors } from '@/theme/colors';

// ── Time-ago formatter ────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ── Per-type icon and colour ──────────────────────────────────────────────────
function getAlertStyle(alert: SensorAlert): { icon: keyof typeof Ionicons.glyphMap; bg: string; iconColor: string } {
    if (alert.severity === 'critical') {
        return { icon: 'alert-circle', bg: '#FFEBEE', iconColor: '#C62828' };
    }
    if (alert.metric === 'pH_low' || alert.metric === 'pH_high') {
        return { icon: 'flask', bg: '#F3E5F5', iconColor: '#6A1B9A' };
    }
    if (alert.metric?.startsWith('moisture')) {
        return { icon: 'water', bg: '#E3F2FD', iconColor: '#0277BD' };
    }
    if (alert.metric?.startsWith('temp')) {
        return { icon: 'thermometer', bg: '#FFF3E0', iconColor: '#E65100' };
    }
    if (alert.metric?.startsWith('humidity')) {
        return { icon: 'cloud', bg: '#E8F5E9', iconColor: '#2E7D32' };
    }
    if (alert.type === 'irrigation') {
        return { icon: 'water-outline', bg: '#E3F2FD', iconColor: '#1565C0' };
    }
    if (alert.type === 'weather') {
        return { icon: 'partly-sunny', bg: '#FFF8E1', iconColor: '#F9A825' };
    }
    return { icon: 'notifications', bg: '#F5F5F5', iconColor: '#546E7A' };
}

// ── Alert card ────────────────────────────────────────────────────────────────
const AlertCard = ({ alert }: { alert: SensorAlert }) => {
    const { icon, bg, iconColor } = getAlertStyle(alert);
    return (
        <View style={[styles.card, alert.severity === 'critical' && styles.cardCritical]}>
            <View style={[styles.iconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={22} color={iconColor} />
            </View>
            <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{alert.title}</Text>
                    <Text style={styles.cardTime}>{timeAgo(alert.timestamp)}</Text>
                </View>
                <Text style={styles.cardMessage}>{alert.message}</Text>
                {alert.severity === 'critical' && (
                    <View style={styles.criticalBadge}>
                        <Text style={styles.criticalBadgeText}>URGENT</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

// ── Screen ────────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
    const navigation = useNavigation();
    const { alerts, clearAlerts, markAsRead } = useNotificationStore();

    // Mark all as read when screen is viewed
    useEffect(() => {
        markAsRead();
    }, []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
                <View style={styles.headerNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>🔔 Farm Alerts</Text>
                        <Text style={styles.headerSub}>Live sensor notifications</Text>
                    </View>
                    <View style={{ width: 38 }} />
                </View>
            </LinearGradient>

            {/* Toolbar */}
            <View style={styles.toolbar}>
                <Text style={styles.toolbarCount}>
                    {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                </Text>
                {alerts.length > 0 && (
                    <TouchableOpacity onPress={clearAlerts} style={styles.clearBtn}>
                        <Ionicons name="trash-outline" size={16} color="#C62828" />
                        <Text style={styles.clearBtnText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Alert list */}
            <FlatList
                data={alerts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AlertCard alert={item} />}
                contentContainerStyle={alerts.length === 0 ? styles.emptyContainer : styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-circle" size={64} color="#A5D6A7" />
                        <Text style={styles.emptyTitle}>All Clear! 🌾</Text>
                        <Text style={styles.emptyDesc}>
                            No alerts — your farm sensors are reading normal values.
                        </Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },

    header: {
        paddingTop: Platform.OS === 'ios' ? 56 : 48,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerNav: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
    headerSub: { fontSize: 12, color: '#A5D6A7', marginTop: 2, letterSpacing: 0.5 },

    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    toolbarCount: { fontSize: 13, color: '#78909C', fontWeight: '600' },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#FFEBEE',
    },
    clearBtnText: { fontSize: 12, color: '#C62828', fontWeight: '700' },

    listContent: { padding: 16, gap: 10 },

    // Alert card
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 14,
        alignItems: 'flex-start',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        gap: 12,
    },
    cardCritical: {
        borderLeftWidth: 4,
        borderLeftColor: '#C62828',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBody: { flex: 1 },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#263238',
        flex: 1,
        marginRight: 8,
    },
    cardTime: { fontSize: 11, color: '#90A4AE', fontWeight: '500' },
    cardMessage: { fontSize: 13, color: '#546E7A', lineHeight: 19 },
    criticalBadge: {
        alignSelf: 'flex-start',
        marginTop: 6,
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    criticalBadgeText: { fontSize: 9, color: '#C62828', fontWeight: '800', letterSpacing: 0.6 },

    // Empty state
    emptyContainer: { flex: 1 },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyTitle: { fontSize: 22, fontWeight: '800', color: '#37474F', marginTop: 16 },
    emptyDesc: {
        fontSize: 14,
        color: '#78909C',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 21,
    },
});
