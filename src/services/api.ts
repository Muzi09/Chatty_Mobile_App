import { Conversation, Contact, User } from '../types';
import { conversations, allContacts, currentUser } from '../data/mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const messagesApi = {
  async getConversations(): Promise<Conversation[]> {
    await delay(100);
    return conversations;
  },

  async getConversation(id: string): Promise<Conversation | null> {
    await delay(100);
    return conversations.find((c) => c.id === id) || null;
  },

  async sendMessage(conversationId: string, text: string): Promise<void> {
    await delay(100);
    console.log(`Sending message to ${conversationId}: ${text}`);
  },
};

export const contactsApi = {
  async getContacts(): Promise<Contact[]> {
    await delay(100);
    return allContacts;
  },

  async getContact(id: string): Promise<Contact | null> {
    await delay(100);
    return allContacts.find((c) => c.id === id) || null;
  },

  async searchContacts(query: string): Promise<Contact[]> {
    await delay(100);
    const lowerQuery = query.toLowerCase();
    return allContacts.filter((c) => c.name.toLowerCase().includes(lowerQuery));
  },
};

export const userApi = {
  async getCurrentUser(): Promise<User> {
    await delay(100);
    return currentUser;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    await delay(100);
    return { ...currentUser, ...data };
  },
};