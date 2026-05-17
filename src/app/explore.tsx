import { Link } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

import { chatUsers } from '@/data/chat-data';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function ContactsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Contacts</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Tap a contact to open the chat.
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.contactList}>
          {chatUsers.map((chat) => (
            <Link key={chat.id} href={`/chat/${chat.id}`} asChild>
              <Pressable style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}>
                <View style={styles.avatar}>{chat.name[0]}</View>
                <View style={styles.contactInfo}>
                  <ThemedText type="default" style={styles.contactName}>
                    {chat.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {chat.subtitle}
                  </ThemedText>
                </View>
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  subtitle: {
    maxWidth: '85%',
  },
  contactList: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: '#F2F2F7',
  },
  pressed: {
    opacity: 0.75,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFC34D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    gap: Spacing.one,
  },
  contactName: {
    fontWeight: '700',
  },
});
