import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => { });

interface AnimatedSplashScreenProps {
    onAnimationFinished: () => void;
    isReady: boolean;
}

export default function AnimatedSplashScreen({ onAnimationFinished, isReady }: AnimatedSplashScreenProps) {
    const scale = useRef(new Animated.Value(0.4)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    // Initial enter animation
    useEffect(() => {
        // Once our component mounts, we can hide the native splash securely
        SplashScreen.hideAsync().catch(() => { });

        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                tension: 10,
                friction: 2,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            })
        ]).start();
    }, [scale, opacity]);

    // Exit animation when app is fully ready
    useEffect(() => {
        if (isReady) {
            // Hold for a moment so the farmer can see the engaged logo animation
            const timeout = setTimeout(() => {
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }).start(() => {
                    onAnimationFinished();
                });
            }, 1200);

            return () => clearTimeout(timeout);
        }
    }, [isReady, opacity, onAnimationFinished]);

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            <Animated.Image
                source={require('../../assets/icon.png')}
                style={[styles.logo, { transform: [{ scale }] }]}
                resizeMode="contain"
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#ffffff', // Clean white background ensuring no borders
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    logo: {
        width: 250,
        height: 250,
    }
});
