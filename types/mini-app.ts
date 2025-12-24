export interface MiniApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  color: string;
  tags?: string[];
  isNew?: boolean;
  isComingSoon?: boolean;
}
