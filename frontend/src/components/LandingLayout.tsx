import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LandingLayoutProps {
  children: React.ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen bg-black font-sans selection:bg-orange-500 selection:text-white">
      <Navbar />
      <main>
        {children}
      </main>
      <Footer />
    </div>
  );
}
