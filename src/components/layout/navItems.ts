import {
  Home,
  Compass,
  Bell,
  User,
  Settings,
  MessageSquare,
  Hash,
  List,
  Bookmark,
} from 'lucide-react';

export const navItems = [
  { icon: Home, label: 'Home', path: '/feed' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: Hash, label: 'Feeds', path: '/feeds' },
  { icon: List, label: 'Lists', path: '/lists' },
  { icon: Bookmark, label: 'Saved', path: '/saved' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const mobilePrimaryNav = [
  { icon: Home, label: 'Home', path: '/feed' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: MessageSquare, label: 'Messages', path: '/chat' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
];
