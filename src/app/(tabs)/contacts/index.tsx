import React, { useState, useEffect, useMemo } from 'react';
import { View, SectionList, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Contact } from '../../../types';
import { contactsApi } from '../../../services/api';
import { ContactListItem } from '../../../components/contacts/ContactListItem';
import { SearchBar } from '../../../components/common/SearchBar';
import { colors } from '../../../constants/colors';
import { spacing, fontSizes } from '../../../constants/theme';

interface ContactSection {
  title: string;
  data: Contact[];
}

export default function ContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    contactsApi.getContacts().then(setContacts);
  }, []);

  const sections = useMemo<ContactSection[]>(() => {
    const filtered = searchQuery.trim()
      ? contacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : contacts;

    const grouped: Record<string, Contact[]> = {};
    filtered.forEach((contact) => {
      const letter = contact.name.charAt(0).toUpperCase();
      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push(contact);
    });

    return Object.keys(grouped)
      .sort()
      .map((letter) => ({
        title: letter,
        data: grouped[letter],
      }));
  }, [contacts, searchQuery]);

  const handleContactPress = (contact: Contact) => {
    console.log('Contact pressed:', contact);
  };

  const renderItem = ({ item }: { item: Contact }) => (
    <ContactListItem contact={item} onPress={handleContactPress} />
  );

  const renderSectionHeader = ({ section }: { section: ContactSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
      </View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search contacts"
      />
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  addButton: {
    fontSize: 28,
    color: colors.primary,
  },
  list: {
    paddingBottom: spacing.xl,
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
});