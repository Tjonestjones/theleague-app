import { ClerkProvider } from '@clerk/nextjs'
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TheLeague - Fantasy Football League Management",
  description: "The ultimate fantasy football league management platform. Import, track, and analyze your league history forever.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`} >
<header className="flex justify-end items-center p-4 gap-4">
    <SignedOut>
      <SignInButton />
      <SignUpButton />
    </SignedOut>
    <SignedIn>
      <UserButton />
    </SignedIn>
  </header>
  {children}
</body>
      </html>
    </ClerkProvider>
  );
}
