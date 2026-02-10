import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import { useAuth } from './config/AuthContext';

export default function Settings() {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const scanCount = (() => {
    if (!userProfile) return 0;
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    return userProfile.scanResetDate === currentMonth ? (userProfile.scanCount || 0) : 0;
  })();

  const handleEditVenmo = () => {
    Alert.prompt(
      'Edit Venmo Username',
      'Enter your Venmo username (without @)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value) => {
            const username = (value || '').replace(/^@/, '').trim();
            try {
              await updateDoc(doc(db, 'users', user.uid), { venmoUsername: username });
              Alert.alert('Saved', username ? `Venmo set to @${username}` : 'Venmo username removed.');
            } catch (e) {
              Alert.alert('Error', 'Failed to update Venmo username.');
            }
          },
        },
      ],
      'plain-text',
      userProfile?.venmoUsername || ''
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            // AuthGate in _layout.jsx handles redirect to sign-in
          } catch (e) {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const MenuItem = ({ icon, label, detail, onPress, color }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: color || 'rgba(52, 66, 198, 0.1)' }]}>
          <Ionicons name={icon} size={20} color={color ? 'white' : '#3442C6'} />
        </View>
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {detail && <Text style={styles.menuItemDetail}>{detail}</Text>}
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <LinearGradient
        colors={['#3442C6', '#5B42E8', '#7451FB', '#8360FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <StatusBar style="light" />

          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Settings</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color="#3442C6" />
              </View>
              <Text style={styles.email}>{user?.email || 'Not signed in'}</Text>
              <View style={styles.statusBadge}>
                <Ionicons
                  name={userProfile?.isPremium ? 'diamond' : 'scan-outline'}
                  size={14}
                  color={userProfile?.isPremium ? '#FFDF00' : 'rgba(255,255,255,0.7)'}
                />
                <Text style={styles.statusText}>
                  {userProfile?.isPremium ? 'Premium' : `${scanCount}/3 free scans this month`}
                </Text>
              </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuCard}>
              {!userProfile?.isPremium && (
                <MenuItem
                  icon="diamond-outline"
                  label="Upgrade to Premium"
                  detail="Unlimited scans"
                  onPress={() => router.push('/paywall')}
                  color="#FFDF00"
                />
              )}
              <MenuItem
                icon="time-outline"
                label="Past Receipts"
                onPress={() => router.push('/history')}
              />
              <MenuItem
                icon="logo-venmo"
                label="Edit Venmo"
                detail={userProfile?.venmoUsername ? `@${userProfile.venmoUsername}` : 'Not set'}
                onPress={handleEditVenmo}
              />
              <MenuItem
                icon="receipt-outline"
                label="Restore Purchases"
                onPress={async () => {
                  try {
                    const { restorePurchases } = require('./config/purchases');
                    await restorePurchases();
                    Alert.alert('Restored', 'Your purchases have been restored.');
                  } catch (e) {
                    Alert.alert('Restore Failed', 'No previous purchases found.');
                  }
                }}
              />
            </View>

            {/* Sign Out */}
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Flick2Split v1.0</Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 40,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
  },
  content: {
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemDetail: {
    fontSize: 13,
    color: '#999',
    marginRight: 6,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginBottom: 30,
  },
});
