import React from 'react';
import { Stack } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../../components/common/Avatar';
import { colors } from '../../constants/colors';
import { spacing, fontSizes } from '../../constants/theme';

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}