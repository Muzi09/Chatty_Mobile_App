import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useInbox } from '../../../hooks/useInbox';
import { useAuth } from '../../../contexts/AuthContext';
import { ConversationListItem } from '../../../components/chat/ConversationListItem';
import { SearchBar } from '../../../components/common/SearchBar';
import { colors } from '../../../constants/colors';
import { spacing, fontSizes } from '../../../constants/theme';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../../../firebase/config';
import { TouchableOpacity } from 'react-native';

export default function MessagesScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { items, loading, error } = useInbox();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.lastMessage ?? '').toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const handleConversationPress = (item: (typeof items)[number]) => {
    // @ts-ignore - dynamic route path
    router.push({ pathname: '/chat/[id]', params: { id: item.chatId } });
  };

  const renderItem = ({ item }: { item: (typeof items)[number] }) => (
    <ConversationListItem item={item} onPress={handleConversationPress} />
  );

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          onPress={async () => {
            try {
              await signOut(getFirebaseAuth());
            } catch {
              // ignore — AuthGate will pick up the change
            }
          }}
        >
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.greetingRow}>
        <Text style={styles.greeting}>
          Hi {profile?.firstName ?? user?.displayName ?? 'there'}!
        </Text>
      </View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search"
      />
      {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.chatId}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={[
            styles.list,
            filtered.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyHint}>
                Open the Contacts tab to start a chat with another user.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  greetingRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: fontSizes.subhead,
    color: colors.textSecondary,
  },
  title: {
    fontSize: fontSizes.largeTitle,
    fontWeight: 'bold',
    color: colors.text,
  },
  signOut: {
    fontSize: fontSizes.footnote,
    color: colors.primary,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 80,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSizes.headline,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.footnote,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
