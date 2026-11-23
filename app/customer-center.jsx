import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';

export default function CustomerCenter() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <RevenueCatUI.CustomerCenterView
        style={styles.container}
        onDismiss={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
