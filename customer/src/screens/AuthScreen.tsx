import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface AuthScreenProps {
  onAuthenticated: (passengerId: string) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [phone, setPhone] = useState('+998');

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>ANGREN TAXI</Text>
      <Text style={styles.subtitle}>Вход или регистрация</Text>

      <TextInput
        keyboardType="phone-pad"
        onChangeText={setPhone}
        placeholder="+998 90 123 45 67"
        style={styles.input}
        value={phone}
      />

      <Pressable
        onPress={() => onAuthenticated(`passenger:${phone}`)}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Продолжить</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 18,
    color: '#475569',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    fontSize: 16,
  },
  primaryButton: {
    height: 52,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
