import './globals.css';

export const metadata = {
  title: 'Bizzii — Owner Console',
  description:
    'Proposed interface for the Bizzii owner console. Screens referenced to the use cases of Chapter 4.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
