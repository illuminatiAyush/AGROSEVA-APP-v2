import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme/colors';
import { useTranslation } from '@/utils/i18n';
import { SchemesService, Scheme } from '@/services/SchemesService';

export default function SchemesScreen({ navigation }: any) {
    const t = useTranslation();

    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadSchemes = async () => {
        try {
            const response = await SchemesService.getSchemes();
            setSchemes(response.data);
            setIsOffline(response.isOffline);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadSchemes();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadSchemes();
    };

    const handleApply = (url: string) => {
        Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* HEADER */}
            <LinearGradient colors={[colors.primary, '#004D40']} style={styles.headerGradient}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Government Schemes</Text>
                    <View style={{ width: 40 }} /> {/* Spacer */}
                </View>
            </LinearGradient>

            {/* CACHE WARNING BANNER */}
            {isOffline && !loading && (
                <View style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline" size={20} color="#E65100" />
                    <Text style={styles.offlineText}>
                        You are offline. Showing cached schemes. Connect to internet to fetch the latest additions.
                    </Text>
                </View>
            )}

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <Text style={{ color: '#90A4AE', marginTop: 10 }}>Loading schemes...</Text>
                </View>
            ) : schemes.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="document-text-outline" size={50} color="#CFD8DC" />
                    <Text style={styles.emptyText}>No schemes available offline.</Text>
                    <Text style={styles.emptySubText}>Please connect to the internet to download them.</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {schemes.map((scheme) => (
                        <View key={scheme.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="ribbon" size={24} color={colors.primary} />
                                <Text style={styles.cardTitle}>{scheme.title}</Text>
                            </View>

                            <Text style={styles.description}>{scheme.description}</Text>

                            <View style={styles.detailRow}>
                                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                <Text style={styles.detailTitle}>Eligibility:</Text>
                            </View>
                            <Text style={styles.detailText}>{scheme.eligibility}</Text>

                            <View style={styles.detailRow}>
                                <Ionicons name="gift" size={16} color="#FF9800" />
                                <Text style={styles.detailTitle}>Benefits:</Text>
                            </View>
                            <Text style={styles.detailText}>{scheme.benefits}</Text>

                            <TouchableOpacity
                                style={styles.applyBtn}
                                onPress={() => handleApply(scheme.applyLink)}
                            >
                                <Text style={styles.applyText}>Learn More & Apply</Text>
                                <Ionicons name="open-outline" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    headerGradient: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },

    offlineBanner: {
        flexDirection: 'row',
        backgroundColor: '#FFF3E0',
        padding: 12,
        marginHorizontal: 15,
        marginTop: -15, // Overlap the header slightly
        borderRadius: 10,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5,
        zIndex: 11,
    },
    offlineText: { fontSize: 13, color: '#E65100', marginLeft: 10, flex: 1, lineHeight: 18 },

    scrollContent: { padding: 20, paddingTop: 10, paddingBottom: 40 },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#455A64', marginTop: 15 },
    emptySubText: { fontSize: 14, color: '#90A4AE', textAlign: 'center', marginTop: 5 },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#263238', marginLeft: 10, flex: 1 },
    description: { fontSize: 14, color: '#546E7A', marginBottom: 15, lineHeight: 22 },

    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    detailTitle: { fontSize: 14, fontWeight: 'bold', color: '#37474F', marginLeft: 6 },
    detailText: { fontSize: 14, color: '#78909C', marginBottom: 15, lineHeight: 20 },

    applyBtn: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    applyText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }
});
