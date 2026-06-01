import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';
import { fontSizes, spacing } from '../../constants/theme';

type IconName = 'messages' | 'contacts' | 'settings';

interface TabBarProps {
  activeTab: IconName;
  onTabPress: (tab: IconName) => void;
}

const icons: Record<IconName, string> = {
  messages: '💬',
  contacts: '👤',
  settings: '⚙️',
};

const labels: Record<IconName, string> = {
  messages: 'Messages',
  contacts: 'Contacts',
  settings: 'Settings',
};

export function TabBar({ activeTab, onTabPress }: TabBarProps) {
  return (
    <View style={styles.container}>
      {(['messages', 'contacts', 'settings'] as IconName[]).map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => onTabPress(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, isActive && styles.activeIcon]}>
              {icons[tab]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  icon: {
    fontSize: 24,
    opacity: 0.5,
  },
  activeIcon: {
    opacity: 1,
  },
  label: {
    fontSize: fontSizes.caption,
    color: colors.inactive,
    marginTop: spacing.xs,
  },
  activeLabel: {
    color: colors.primary,
  },
});