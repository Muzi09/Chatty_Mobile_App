import { User, Message, Conversation, Contact } from '../types';

export const currentUser: User = {
  id: 'user-1',
  name: 'Alex Thompson',
  initials: 'AT',
  email: 'alex.thompson@email.com',
};

const jenkinsMessages: Message[] = [
  {
    id: 'msg-1',
    text: "Hey! Are we still on for the gallery opening later tonight?",
    timestamp: new Date('2026-05-24T10:30:00'),
    isFromMe: false,
    status: 'read',
  },
  {
    id: 'msg-2',
    text: "Absolutely. I'm finishing up some work now. What time should I meet you there?",
    timestamp: new Date('2026-05-24T10:35:00'),
    isFromMe: true,
    status: 'delivered',
  },
  {
    id: 'msg-3',
    text: "They start the main exhibit at 7:00 PM. Maybe we can grab a quick drink nearby first? 🍸",
    timestamp: new Date('2026-05-24T10:40:00'),
    isFromMe: false,
    status: 'read',
  },
  {
    id: 'msg-4',
    text: "Perfect. There's that new place around the corner with the outdoor seating. See you at 8:15?",
    timestamp: new Date('2026-05-24T10:45:00'),
    isFromMe: true,
    status: 'delivered',
  },
];

const markMessages: Message[] = [
  {
    id: 'msg-5',
    text: "Hey, did you see the latest mockups for the redesign?",
    timestamp: new Date('2026-05-23T14:20:00'),
    isFromMe: false,
    status: 'read',
  },
  {
    id: 'msg-6',
    text: "Yes! The new direction is so much cleaner.",
    timestamp: new Date('2026-05-23T14:25:00'),
    isFromMe: true,
    status: 'read',
  },
  {
    id: 'msg-7',
    text: "We should discuss the UI direction in our next meeting. I have some ideas.",
    timestamp: new Date('2026-05-23T14:30:00'),
    isFromMe: false,
    status: 'read',
  },
];

const janeMessages: Message[] = [
  {
    id: 'msg-8',
    text: "Hi! I'm sending over the updated report.",
    timestamp: new Date('2026-05-23T11:15:00'),
    isFromMe: false,
    status: 'read',
  },
  {
    id: 'msg-9',
    text: "Got it! I'll review it this afternoon.",
    timestamp: new Date('2026-05-23T11:20:00'),
    isFromMe: true,
    status: 'read',
  },
  {
    id: 'msg-10',
    text: "Here's the file you requested: quarterly_report_v2.pdf",
    timestamp: new Date('2026-05-23T11:25:00'),
    isFromMe: false,
    status: 'read',
  },
];

const elenaMessages: Message[] = [
  {
    id: 'msg-11',
    text: "Can we confirm the dinner plans for Saturday?",
    timestamp: new Date('2026-05-22T18:45:00'),
    isFromMe: false,
    status: 'read',
  },
  {
    id: 'msg-12',
    text: "Sure! 7 PM at the Italian place downtown works for me.",
    timestamp: new Date('2026-05-22T18:50:00'),
    isFromMe: true,
    status: 'read',
  },
  {
    id: 'msg-13',
    text: "Perfect! See you then.",
    timestamp: new Date('2026-05-22T18:55:00'),
    isFromMe: false,
    status: 'read',
  },
];

const alexMessages: Message[] = [
  {
    id: 'msg-14',
    text: "Any updates from the dev team on the new feature?",
    timestamp: new Date('2026-05-21T09:30:00'),
    isFromMe: false,
    status: 'read',
  },
  {
    id: 'msg-15',
    text: "They're still testing. Should be ready by end of week.",
    timestamp: new Date('2026-05-21T09:35:00'),
    isFromMe: true,
    status: 'read',
  },
];

export const conversations: Conversation[] = [
  {
    id: 'conv-1',
    participant: { id: 'user-2', name: 'Sarah Jenkins', initials: 'SJ' },
    lastMessage: "Perfect. There's that new place around the corner with the outdoor seating. See you at 8:15?",
    lastMessageTime: new Date('2026-05-24T10:48:00'),
    unreadCount: 2,
    messages: jenkinsMessages,
  },
  {
    id: 'conv-2',
    participant: { id: 'user-3', name: 'Mark Thompson', initials: 'MT' },
    lastMessage: "We should discuss the UI direction in our next meeting. I have some ideas.",
    lastMessageTime: new Date('2026-05-23T14:30:00'),
    unreadCount: 0,
    messages: markMessages,
  },
  {
    id: 'conv-3',
    participant: { id: 'user-4', name: 'Jane Doe', initials: 'JD' },
    lastMessage: "Here's the file you requested: quarterly_report_v2.pdf",
    lastMessageTime: new Date('2026-05-23T11:25:00'),
    unreadCount: 1,
    messages: janeMessages,
  },
  {
    id: 'conv-4',
    participant: { id: 'user-5', name: 'Elena Rodriguez', initials: 'ER' },
    lastMessage: "Perfect! See you then.",
    lastMessageTime: new Date('2026-05-22T18:55:00'),
    unreadCount: 0,
    messages: elenaMessages,
  },
  {
    id: 'conv-5',
    participant: { id: 'user-6', name: 'Alex River', initials: 'AR' },
    lastMessage: "They're still testing. Should be ready by end of week.",
    lastMessageTime: new Date('2026-05-21T09:35:00'),
    unreadCount: 0,
    messages: alexMessages,
  },
];

export const allContacts: Contact[] = [
  { id: 'user-1', name: 'Alex Thompson', initials: 'AT' },
  { id: 'contact-1', name: 'Aaron Appleby', initials: 'AA' },
  { id: 'contact-2', name: 'Adam Davis', initials: 'AD' },
  { id: 'contact-3', name: 'Amanda Sinclair', initials: 'AS' },
  { id: 'contact-4', name: 'Barbara Evans', initials: 'BE' },
  { id: 'contact-5', name: 'Benjamin Moore', initials: 'BM' },
  { id: 'contact-6', name: 'Catherine Wright', initials: 'CW' },
  { id: 'contact-7', name: 'Chris Jenkins', initials: 'CJ' },
  { id: 'contact-8', name: 'Clara Peterson', initials: 'CP' },
  { id: 'contact-9', name: 'Daniel Ross', initials: 'DR' },
  { id: 'contact-10', name: 'David Kim', initials: 'DK' },
  { id: 'contact-11', name: 'Emily Foster', initials: 'EF' },
  { id: 'contact-12', name: 'Frank Martinez', initials: 'FM' },
  { id: 'contact-13', name: 'Grace Lee', initials: 'GL' },
  { id: 'contact-14', name: 'Henry Wilson', initials: 'HW' },
];