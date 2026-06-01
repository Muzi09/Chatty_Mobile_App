export interface User {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  phone?: string;
  email?: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isFromMe: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

export interface Contact {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface SettingsItem {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  type: 'navigation' | 'action' | 'danger';
}