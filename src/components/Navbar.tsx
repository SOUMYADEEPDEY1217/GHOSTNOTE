import React, { useState } from 'react';
import { Menu, X, User as UserIcon, Cloud } from 'lucide-react';
import { User } from 'firebase/auth';
import { AppView } from '../types/ghostnote';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  archiveCount: number;
  currentUser: User | null;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  archiveCount,
  currentUser,
  onOpenAuthModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'landing', label: 'Sanctum' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'archive', label: `Catalog (${archiveCount})` },
    { id: 'settings', label: 'Provider & History' },
  ];

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0D0E11]/90 border-b border-white/10">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6 px-6 sm:px-10 py-4">
        {/* Zone 1: Brand wordmark styled after the reference top-left geometric logo */}
        <button
          type="button"
          onClick={() => handleNavClick('landing')}
          className="text-lg sm:text-xl font-bold tracking-[0.22em] text-[#E5E7EB] hover:text-white transition-colors whitespace-nowrap shrink-0 font-monolith focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DC2626]"
        >
          GH<span className="text-[#9CA3AF]">O</span>STN<span className="text-[#B91C1C]">O</span>TE
        </button>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-10 text-sm font-medium text-[#D1D5DB]"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DC2626] ${
                  isActive
                    ? 'text-white after:content-[""] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-[#DC2626]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Auth & Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#E5E7EB] hover:text-white bg-[#16181D] hover:bg-[#22262E] border border-white/20 rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
          >
            {currentUser ? (
              <>
                <Cloud
                  className={`w-3.5 h-3.5 ${
                    currentUser.emailVerified ? 'text-[#34D399]' : 'text-[#FBBF24]'
                  }`}
                />
                <span className="max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0] || 'Vault'}
                </span>
              </>
            ) : (
              <>
                <UserIcon className="w-3.5 h-3.5 text-[#F87171]" />
                <span>Sign In / Sign Up</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('workspace')}
            className="hidden sm:inline-flex px-4 py-1.5 text-xs font-semibold tracking-[0.16em] uppercase text-[#F87171] hover:text-white bg-[#0B0C0E] hover:bg-[#991B1B] border border-[#9CA3AF]/70 rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
          >
            Write Entry
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2 text-[#D1D5DB] hover:text-white rounded-sm border border-white/15 focus-visible:outline-2 focus-visible:outline-[#DC2626]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-white/10 bg-[#0D0E11] px-6 py-4 flex flex-col gap-3"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`text-left py-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-[#F87171]' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenAuthModal();
            }}
            className="text-left py-2 text-sm font-medium text-[#FCA5A5] hover:text-white border-t border-white/10 pt-3"
          >
            {currentUser
              ? `Account Vault (${currentUser.email})`
              : 'Sign In / Sign Up (Firebase)'}
          </button>
        </nav>
      )}
    </header>
  );
};
