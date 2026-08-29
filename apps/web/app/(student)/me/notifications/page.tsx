import { NotificationsFeed } from '../../../../components/notifications-feed';

// This route isn't one of the bottom nav's 4 main tabs, so the nav hides
// here — homeHref adds this page's own way back (the admin shell that also
// renders NotificationsFeed keeps its sidebar visible always, so it never
// needs this).
export default function StudentNotificationsPage() {
  return <NotificationsFeed homeHref="/me" />;
}
