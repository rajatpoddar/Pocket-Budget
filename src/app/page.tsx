import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
  // redirect() throws an error to stop rendering, so no need to return null explicitly.
}
