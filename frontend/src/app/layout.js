import './globals.css';
import MetricsHUD from '../components/MetricsHUD';

export const metadata = {
  title: 'SNEAKERPULSE VAULT // Authenticated Footwear & Predictive Data-Fetching',
  description: 'An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching in Full-Stack Web Applications - Jarin Tasnim & Fati Tahiru',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <MetricsHUD />
      </body>
    </html>
  );
}
