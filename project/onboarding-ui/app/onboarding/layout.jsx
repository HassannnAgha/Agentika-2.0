import { OnboardingProvider } from '../../components/onboarding/state';

/** Every onboarding screen reads and writes the same record. */
export default function OnboardingLayout({ children }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}
