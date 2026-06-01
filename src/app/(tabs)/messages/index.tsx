import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Conversation } from '../../../types';
import { messagesApi } from '../../../services/api';
import { ConversationListItem } from '../../../components/chat/ConversationListItem';
import { SearchBar } from '../../../components/common/SearchBar';
import { colors } from '../../../constants/colors';
import { spacing, fontSizes } from '../../../constants/theme';

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    messagesApi.getConversations().then(setConversations);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredConversations(
        conversations.filter((c) =>
          c.participant.name.toLowerCase().includes(query) ||
          c.lastMessage.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const handleConversationPress = (conversation: Conversation) => {
    // @ts-ignore - dynamic route path
    router.push({ pathname: '/chat/[id]', params: { id: conversation.id } });
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <ConversationListItem
      conversation={item}
      onPress={handleConversationPress}
    />
  );

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search"
      />
      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.list}
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
  edit: {
    fontSize: fontSizes.body,
    color: colors.primary,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 80,
  },
});