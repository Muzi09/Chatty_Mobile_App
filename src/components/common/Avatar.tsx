import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../../constants/colors';
import { fontSizes, borderRadius } from '../../constants/theme';

interface AvatarProps {
  uri?: string;
  initials?: string;
  name?: string;
  size?: 'small' | 'medium' | 'large';
}

const sizes = {
  small: 36,
  medium: 48,
  large: 80,
};

const fontSizeMap = {
  small: fontSizes.footnote,
  medium: fontSizes.body,
  large: fontSizes.title,
};

export function Avatar({ uri, initials, name, size = 'medium' }: AvatarProps) {
  const dimension = sizes[size];
  const fontSize = fontSizeMap[size];

  const getInitials = () => {
    if (initials) return initials;
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const getBackgroundColor = () => {
    if (name) {
      const charCode = name.charCodeAt(0);
      const hue = (charCode * 137.508) % 360;
      return `hsl(${hue}, 50%, 50%)`;
    }
    return colors.textTertiary;
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: dimension, height: dimension, borderRadius: dimension / 2 },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.initialsContainer,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.textTertiary,
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '600',
  },
});