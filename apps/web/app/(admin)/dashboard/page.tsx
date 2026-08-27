import { redirect } from 'next/navigation';

/**
 * The College Admin / Placement Officer home used to live here. It has been
 * folded into the single, full-fledged Placement Dashboard at /placement —
 * this route stays only as a redirect so old bookmarks/links keep working.
 */
export default function DashboardPage() {
  redirect('/placement');
}
