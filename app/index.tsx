import { Redirect } from 'expo-router';
import { AuthRouter } from '@/template';

export default function Index() {
  return (
    <AuthRouter loginRoute="/get-started" excludeRoutes={['/auth']}>
      <Redirect href="/(tabs)" />
    </AuthRouter>
  );
}
