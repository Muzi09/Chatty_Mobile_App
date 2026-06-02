import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, SectionList, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { userService } from '../../../services/userService';
import { chatService } from '../../../services/chatService';
import { useAuth } from '../../../contexts/AuthContext';
import { ContactListItem } from '../../../components/contacts/ContactListItem';
import { SearchBar } from '../../../components/common/SearchBar';
import { Contact, UserProfile } from '../../../types';
import { colors } from '../../../constants/colors';
import { spacing, fontSizes } from '../../../constants/theme';

interface ContactSection {
  title: string;
  data: Contact[];
}

function profileToContact(p: UserProfile): Contact {
  const first = (p.firstName ?? '').trim();
  const last = (p.lastName ?? '').trim();
  const name =
    [first, last].filter(Boolean).join(' ') ||
    p.name ||
    p.username ||
    'Unknown user';
  const initials =
    (first.charAt(0) + (last.charAt(0) || '')).toUpperCase() ||
    (p.username ?? '').charAt(0).toUpperCase() ||
    '?';
  return {
    id: p.uid,
    name,
    avatar: p.photoURL || undefined,
    initials,
    email: p.email,
  };
}

export default function ContactsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await userService.listAll();
        if (!cancelled) {
          setUsers(list.filter((p) => p.uid !== user?.uid));
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[contacts] failed to load users', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const sections = useMemo<ContactSection[]>(() => {
    const filtered = searchQuery.trim()
      ? users.filter((p) => {
          const q = searchQuery.trim().toLowerCase();
          const fullName =
            [p.firstName, p.lastName].filter(Boolean).join(' ').toLowerCase() ||
            p.name.toLowerCase();
          return (
            fullName.includes(q) ||
            (p.username ?? '').toLowerCase().includes(q) ||
            (p.email ?? '').toLowerCase().includes(q)
          );
        })
      : users;

    const grouped: Record<string, Contact[]> = {};
    for (const p of filtered) {
      const contact = profileToContact(p);
      const letter = (contact.name.charAt(0) || '?').toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(contact);
    }
    return Object.keys(grouped)
      .sort()
      .map((letter) => ({ title: letter, data: grouped[letter] }));
  }, [users, searchQuery]);

  const handleContactPress = useCallback(
    async (contact: Contact) => {
      if (!contact.id || opening) return;
      setOpening(contact.id);
      try {
        const chatId = await chatService.openDirectChat(contact.id);
        // @ts-ignore - dynamic route path
        router.push({ pathname: '/chat/[id]', params: { id: chatId } });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[contacts] openDirectChat failed', e);
      } finally {
        setOpening(null);
      }
    },
    [router, opening],
  );

  const renderItem = ({ item }: { item: Contact }) => (
    <ContactListItem contact={item} onPress={handleContactPress} />
  );

  const renderSectionHeader = ({ section }: { section: ContactSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
      </View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name, username, or email"
      />
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No matches for that search.'
                : 'No other users yet — invite someone!'}
            </Text>
          </View>
        }
      />
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
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.largeTitle,
    fontWeight: 'bold',
    color: colors.text,
  },
  list: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontSize: fontSizes.footnote,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 80,
  },
  empty: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
  },
});
