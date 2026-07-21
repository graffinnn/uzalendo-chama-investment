import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { gql, useMutation } from '@apollo/client';

const REGISTER_MEMBER = gql`
  mutation RegisterMember($input: RegisterMemberInput!) {
    registerMember(input: $input) {
      id
      full_name
      member_number
      status
    }
  }
`;

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');

  const [registerMember, { loading }] = useMutation(REGISTER_MEMBER);

  const handleRegister = async () => {
    if (!fullName || !phone || !nationalId || !password) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }

    try {
      const { data } = await registerMember({
        variables: {
          input: {
            full_name: fullName,
            phone,
            national_id: nationalId,
            password
          }
        }
      });

      Alert.alert(
        'Registration successful',
        `Your member number is ${data.registerMember.member_number}. Your account is pending activation by the Treasurer.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Registration failed', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join Uzalendo Chama Investment Group</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor="#999"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone number"
        placeholderTextColor="#999"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="National ID number"
        placeholderTextColor="#999"
        value={nationalId}
        onChangeText={setNationalId}
        keyboardType="number-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Already have an account? Log In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
    backgroundColor: '#F5F7F5'
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1B5E20',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#4B4B4B',
    textAlign: 'center',
    marginBottom: 28
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  button: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  linkText: {
    textAlign: 'center',
    color: '#2E7D32',
    marginTop: 20,
    fontSize: 14
  }
});