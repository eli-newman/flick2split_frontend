import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated,
  SafeAreaView, FlatList, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboarding } from './config/OnboardingContext';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'camera-outline',
    title: 'Snap your receipt',
    subtitle: 'Point your camera at any restaurant bill. Our AI reads every item, tax, and tip in seconds.',
    color: '#4CDE80',
    gradient: ['rgba(76,222,128,0.35)', 'rgba(76,222,128,0.05)'],
  },
  {
    icon: 'sparkles',
    title: 'AI reads everything',
    subtitle: 'Every item is automatically extracted. Edit anything that looks off before splitting.',
    color: '#FFDF00',
    gradient: ['rgba(255,223,0,0.35)', 'rgba(255,223,0,0.05)'],
  },
  {
    icon: 'people',
    title: 'Split in seconds',
    subtitle: 'Tap who ordered what. Everyone gets an exact total with a Venmo button to pay instantly.',
    color: '#FF6B6B',
    gradient: ['rgba(255,107,107,0.35)', 'rgba(255,107,107,0.05)'],
  },
];

function BackgroundOrbs() {
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(val, { toValue: 0, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
      ).start();
    loop(orb1, 14000);
    loop(orb2, 18000);
    loop(orb3, 22000);
  }, [orb1, orb2, orb3]);

  const o1 = {
    transform: [
      { translateX: orb1.interpolate({ inputRange: [0, 1], outputRange: [-40, 60] }) },
      { translateY: orb1.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }) },
      { scale: orb1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) },
    ],
  };
  const o2 = {
    transform: [
      { translateX: orb2.interpolate({ inputRange: [0, 1], outputRange: [60, -50] }) },
      { translateY: orb2.interpolate({ inputRange: [0, 1], outputRange: [-30, 70] }) },
      { scale: orb2.interpolate({ inputRange: [0, 1], outputRange: [1.15, 0.95] }) },
    ],
  };
  const o3 = {
    transform: [
      { translateX: orb3.interpolate({ inputRange: [0, 1], outputRange: [-30, 50] }) },
      { translateY: orb3.interpolate({ inputRange: [0, 1], outputRange: [40, -40] }) },
      { scale: orb3.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) },
    ],
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.orb, styles.orbA, o1]} />
      <Animated.View style={[styles.orb, styles.orbB, o2]} />
      <Animated.View style={[styles.orb, styles.orbC, o3]} />
    </View>
  );
}

function Slide({ slide, index, scrollX }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const iconScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.6, 1, 0.6],
    extrapolate: 'clamp',
  });
  const iconRotate = scrollX.interpolate({
    inputRange,
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const iconOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const titleTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [40, 0, -40],
    extrapolate: 'clamp',
  });
  const subtitleTranslate = scrollX.interpolate({
    inputRange,
    outputRange: [60, 0, -60],
    extrapolate: 'clamp',
  });
  const textOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  // Continuous halo pulse on the active icon
  const halo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(halo, { toValue: 0, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ])
    ).start();
  }, [halo]);
  const haloStyle = {
    opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }),
    transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
  };
  const haloStyle2 = {
    opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.1] }),
    transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1.4] }) }],
  };

  return (
    <View style={styles.slide}>
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.halo,
            { backgroundColor: slide.color, shadowColor: slide.color },
            haloStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.halo,
            styles.haloOuter,
            { borderColor: slide.color },
            haloStyle2,
          ]}
        />
        <Animated.View
          style={{
            opacity: iconOpacity,
            transform: [{ scale: iconScale }, { rotate: iconRotate }],
          }}
        >
          <LinearGradient
            colors={slide.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.iconContainer, { borderColor: `${slide.color}55` }]}
          >
            <Ionicons name={slide.icon} size={76} color={slide.color} />
          </LinearGradient>
        </Animated.View>
      </View>

      <Animated.Text
        style={[
          styles.title,
          { opacity: textOpacity, transform: [{ translateY: titleTranslate }] },
        ]}
      >
        {slide.title}
      </Animated.Text>
      <Animated.Text
        style={[
          styles.subtitle,
          { opacity: textOpacity, transform: [{ translateY: subtitleTranslate }] },
        ]}
      >
        {slide.subtitle}
      </Animated.Text>
    </View>
  );
}

function Dot({ index, scrollX }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  const dotWidth = scrollX.interpolate({
    inputRange,
    outputRange: [8, 28, 8],
    extrapolate: 'clamp',
  });
  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.35, 1, 0.35],
    extrapolate: 'clamp',
  });
  return <Animated.View style={[styles.dot, { width: dotWidth, opacity }]} />;
}

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Subtle button pulse
  const buttonScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 1.035, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(buttonScale, { toValue: 1, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ])
    ).start();
  }, [buttonScale]);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await completeOnboarding();
    router.replace('/');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <LinearGradient
      colors={['#2A36B8', '#5B42E8', '#7451FB', '#8360FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <BackgroundOrbs />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>FLICK</Text>
            <Text style={styles.brandAccent}>2</Text>
            <Text style={styles.brand}>SPLIT</Text>
          </View>
          <TouchableOpacity style={styles.skipButton} onPress={finish} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Animated.FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(_, i) => `slide-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          renderItem={({ item, index }) => (
            <Slide slide={item} index={index} scrollX={scrollX} />
          )}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(i);
          }}
          scrollEventThrottle={16}
          style={styles.list}
        />

        <View style={styles.bottom}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <Dot key={i} index={i} scrollX={scrollX} />
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
            <TouchableOpacity style={styles.button} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.buttonText}>
                {isLast ? 'Get Started — Free' : 'Continue'}
              </Text>
              <View style={styles.buttonIconBubble}>
                <Ionicons
                  name={isLast ? 'arrow-forward' : 'chevron-forward'}
                  size={18}
                  color="white"
                />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.freeNote}>
            {isLast ? '2 free scans to start · No credit card needed' : 'Swipe to learn more'}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const ORB_SIZE = Math.max(width, height) * 0.7;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  orb: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    opacity: 0.35,
  },
  orbA: {
    backgroundColor: '#A88BFF',
    top: -ORB_SIZE * 0.4,
    left: -ORB_SIZE * 0.3,
  },
  orbB: {
    backgroundColor: '#5B42E8',
    bottom: -ORB_SIZE * 0.45,
    right: -ORB_SIZE * 0.35,
  },
  orbC: {
    backgroundColor: '#FF8FA3',
    top: height * 0.25,
    right: -ORB_SIZE * 0.5,
    opacity: 0.18,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brand: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandAccent: {
    color: '#FFDF00',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  skipButton: { paddingVertical: 8, paddingHorizontal: 6 },
  skipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },

  list: { flex: 1 },

  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  halo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
  },
  haloOuter: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  iconContainer: {
    width: 168,
    height: 168,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 340,
  },

  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
    height: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3442C6',
    letterSpacing: 0.2,
  },
  buttonIconBubble: {
    marginLeft: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3442C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeNote: {
    marginTop: 14,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    fontWeight: '500',
  },
});
