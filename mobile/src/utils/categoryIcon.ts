import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Pick an icon from the category name; falls back to a generic one.
export function categoryIcon(name: string): IconName {
  const n = name.toLowerCase();
  if (n.includes('errand') || n.includes('deliver')) return 'checkbox-outline';
  if (n.includes('home') || n.includes('repair')) return 'home-outline';
  if (n.includes('business') || n.includes('workforce')) return 'briefcase-outline';
  if (n.includes('travel')) return 'location-outline';
  if (n.includes('health') || n.includes('medical')) return 'heart-outline';
  if (n.includes('senior')) return 'people-outline';
  if (n.includes('event')) return 'calendar-outline';
  if (n.includes('digital') || n.includes('tech')) return 'wifi-outline';
  if (n.includes('personal') || n.includes('lifestyle')) return 'person-outline';
  return 'apps-outline';
}