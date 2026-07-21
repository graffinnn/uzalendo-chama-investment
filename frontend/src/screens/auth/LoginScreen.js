import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { gql, useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';

const LOGIN_MEMBER = gql`
  mutation LoginMember($phone: String!, $password: String!) {
    loginMember(phone: $phone, password: $password) {
      token
      member {
        id
        full_name
        member_number
        status
      }
    }
  }
`;

const LOGIN_ADMIN = gql`
  mutation LoginAdmin($email: String!, $password: String!) {
    loginAdmin(email: $email, password: $password) {
      token
      admin {
        id
        full_name
      }
    }
  }
`;

export default function LoginScreen({ navigation }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const [loginMember, { loading: memberLoading }] = useMutation(LOGIN_MEMBER);
  const [loginAdmin, { loading: adminLoading }] = useMutation(LOGIN_ADMIN);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }

    try {
      if (isAdmin) {
        const { data } = await loginAdmin({
          variables: { email: identifier, password }
        });
        await login(data.loginAdmin.token, data.loginAdmin.admin, 'ADMIN');
      } else {
        const { data } = await loginMember({
          variables: { phone: identifier, password }
        });
        await login(data.loginMember.token, data.loginMember.member, 'MEMBER');
      }
    } catch (error) {
      Alert.alert('Login failed', error.message);
    }
  };

  const loading = memberLoading || adminLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Uzalendo Chama</Text>
      <Text style={styles.subtitle}>Investment Group</Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, !isAdmin && styles.toggleButtonActive]}
          onPress={() => setIsAdmin(false)}
        >
          <Text style={[styles.toggleText, !isAdmin && styles.toggleTextActive]}>
            Member
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, isAdmin && styles.toggleButtonActive]}
          onPress={() => setIsAdmin(true)}
        >
          <Text style={[styles.toggleText, isAdmin && styles.toggleTextActive]}>
            Treasurer
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder={isAdmin ? 'Email' : 'Phone number'}
        placeholderTextColor="#999"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType={isAdmin ? 'email-address' : 'phone-pad'}
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
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      {!isAdmin && (
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>
            Don't have an account? Register
          </Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F5F7F5'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B5E20',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#4B4B4B',
    textAlign: 'center',
    marginBottom: 32
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    marginBottom: 24,
    overflow: 'hidden'
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  toggleButtonActive: {
    backgroundColor: '#2E7D32'
  },
  toggleText: {
    color: '#4B4B4B',
    fontWeight: '600'
  },
  toggleTextActive: {
    color: '#fff'
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