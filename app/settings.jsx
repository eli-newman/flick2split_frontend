import React, { useState, useEffect } from 'react';
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
import {
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import { auth, db, functions } from './config/firebase';
import { useAuth } from './config/AuthContext';
import { signInWithGoogle } from './config/googleAuth';

function computeSavingsStats(splits) {
  let totalBilled = 0;
  let totalSaved = 0;
  for (const split of splits) {
    const total = split.bill?.total || 0;
    const guests = split.guests || [];
    if (guests.length < 2) continue;
    const evenShare = total / guests.length;
    totalBilled += total;
    for (const guest of guests) {
      const saved = evenShare - (guest.total || 0);
      if (saved > 0) totalSaved += saved;
    }
  }
  return { totalSplits: splits.length, totalBilled, totalSaved };
}

const StatBubble = ({ label, value, highlight }) => (
  <View style={styles.statBubble}>
    <Text style={[styles.statValue, highlight && styles.statValueGreen]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function Settings() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [splitsStats, setSplitsStats] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(collection(db, 'users', user.uid, 'splits'))
      .then(snap => setSplitsStats(computeSavingsStats(snap.docs.map(d => d.data()))))
      .catch(() => {});
  }, [user]);

  const scanInfo = (() => {
    if (!userProfile) return { text: '0 free scans remaining' };
    if (userProfile.isPremium) return { text: 'Premium' };
    const freeRemaining = Math.max(0, 2 - (userProfile.freeScansUsed || 0));
    const credits = userProfile.scanCredits || 0;
    if (freeRemaining > 0) return { text: `${freeRemaining} free scan${freeRemaining !== 1 ? 's' : ''} remaining` };
    if (credits > 0) return { text: `${credits} scan credit${credits !== 1 ? 's' : ''}` };
    return { text: 'No scans remaining' };
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'This permanently deletes your account, all scans, all splits, and your purchase history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => promptDeleteConfirmation(),
        },
      ]
    );
  };

  const promptDeleteConfirmation = () => {
    Alert.prompt(
      'Confirm Deletion',
      'Type DELETE to confirm. This is permanent.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: (value) => {
            if ((value || '').trim().toUpperCase() === 'DELETE') {
              performAccountDeletion();
            } else {
              Alert.alert(
                'Not Deleted',
                'You must type DELETE exactly to confirm. Your account is unchanged.'
              );
            }
          },
        },
      ],
      'plain-text',
      ''
    );
  };

  const performAccountDeletion = async () => {
    const method = userProfile?.authMethod || 'email';
    try {
      let appleAuthCode = null;

      if (method === 'apple') {
        appleAuthCode = await reauthAppleAndGetAuthCode();
      } else if (method === 'google') {
        await reauthGoogle();
      } else {
        await reauthEmail();
      }

      const deleteFn = httpsCallable(functions, 'delete_user_account');
      await deleteFn(appleAuthCode ? { appleAuthCode } : {});

      try {
        await signOut(auth);
      } catch {
        // ignore — Auth user is already gone server-side
      }
      Alert.alert('Account Deleted', 'Your account and all data have been deleted.');
      // AuthGate redirects to sign-in
    } catch (e) {
      if (e?.code === 'auth/user-cancelled' || e?.code === 'apple/cancelled' || e?.code === 'google/cancelled') {
        return; // silent
      }
      console.error('[deleteAccount] failed:', e);
      Alert.alert(
        'Deletion Failed',
        e?.message || 'Could not delete your account. Please try again or contact support.'
      );
    }
  };

  const reauthEmail = async () => {
    return new Promise((resolve, reject) => {
      Alert.prompt(
        'Confirm Password',
        'Enter your password to delete your account.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject({ code: 'auth/user-cancelled' }),
          },
          {
            text: 'Confirm',
            onPress: async (password) => {
              if (!password) {
                reject(new Error('Password required.'));
                return;
              }
              try {
                const cred = EmailAuthProvider.credential(user.email, password);
                await reauthenticateWithCredential(auth.currentUser, cred);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
          },
        ],
        'secure-text'
      );
    });
  };

  const reauthGoogle = async () => {
    // signInWithGoogle handles credential exchange + Firestore profile write,
    // which is equivalent to a fresh sign-in for re-auth purposes.
    await signInWithGoogle();
  };

  const reauthAppleAndGetAuthCode = async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In re-auth is only available on iOS.');
    }
    let AppleAuthentication;
    let Crypto;
    try {
      AppleAuthentication = require('expo-apple-authentication');
      Crypto = require('expo-crypto');
    } catch (e) {
      throw new Error('Apple Sign-In native module is not linked. Rebuild the app.');
    }

    const random = await Crypto.getRandomBytesAsync(32);
    let raw = '';
    for (let i = 0; i < random.length; i++) raw += String.fromCharCode(random[i]);
    const rawNonce = (typeof btoa === 'function' ? btoa(raw) : Buffer.from(raw, 'binary').toString('base64'))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    let credential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (err) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        throw { code: 'apple/cancelled' };
      }
      throw err;
    }

    const { identityToken, authorizationCode } = credential;
    if (!identityToken) {
      throw new Error('Apple did not return an identity token.');
    }
    if (!authorizationCode) {
      throw new Error('Apple did not return an authorization code (required for revoke).');
    }

    const oauth = new OAuthProvider('apple.com');
    const firebaseCred = oauth.credential({ idToken: identityToken, rawNonce });
    await reauthenticateWithCredential(auth.currentUser, firebaseCred);

    return authorizationCode;
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
              <Text style={styles.email}>{user?.isAnonymous ? 'Guest User' : (user?.email || 'Not signed in')}</Text>
              <View style={styles.statusBadge}>
                <Ionicons
                  name={userProfile?.isPremium ? 'diamond' : 'scan-outline'}
                  size={14}
                  color={userProfile?.isPremium ? '#FFDF00' : 'rgba(255,255,255,0.7)'}
                />
                <Text style={styles.statusText}>
                  {scanInfo.text}
                </Text>
              </View>
              {splitsStats?.totalSplits > 0 && (
                <>
                  <View style={styles.statsStrip}>
                    <StatBubble label="splits" value={String(splitsStats.totalSplits)} />
                    <StatBubble label="billed" value={`$${splitsStats.totalBilled.toFixed(0)}`} />
                    <StatBubble label="saved" value={`$${splitsStats.totalSaved.toFixed(2)}`} highlight />
                  </View>
                  <Text style={styles.statsSub}>vs. splitting evenly</Text>
                </>
              )}
            </View>

            {/* Menu Items */}
            <View style={styles.menuCard}>
              {!userProfile?.isPremium && !user?.isAnonymous && (
                <MenuItem
                  icon="diamond-outline"
                  label="Upgrade to Premium"
                  detail="Unlimited scans"
                  onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })}
                  color="#FFDF00"
                />
              )}
              {userProfile?.isPremium && (
                <MenuItem
                  icon="settings-outline"
                  label="Manage Subscription"
                  onPress={() => router.push('/customer-center')}
                />
              )}
              <MenuItem
                icon="time-outline"
                label="Past Receipts"
                onPress={() => router.push('/history')}
              />
              {!user?.isAnonymous && (
                <>
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
                </>
              )}
            </View>

            {/* Create Account (anonymous) or Sign Out (real user) */}
            {user?.isAnonymous ? (
              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={() => router.push('/(auth)/sign-in')}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={20} color="#3442C6" />
                <Text style={styles.createAccountText}>Create Account / Sign In</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
                  <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteAccountButton}
                  onPress={handleDeleteAccount}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.deleteAccountText}>Delete Account</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.version}>Flick2Split v2.1.0</Text>
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
  statsStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statBubble: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  statValueGreen: {
    color: '#4CDE80',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  statsSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
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
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  createAccountText: {
    color: '#3442C6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 12,
  },
  deleteAccountText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
    textDecorationLine: 'underline',
  },
  version: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginBottom: 30,
  },
});
