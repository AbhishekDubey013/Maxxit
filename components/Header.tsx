import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Home, BarChart3, FileText, Wallet, User, Copy, Check, LogOut, X, Menu, ChevronDown } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

export function Header() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isWalletModalOpen &&
        popupRef.current &&
        buttonRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsWalletModalOpen(false);
      }
    };

    if (isWalletModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isWalletModalOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/my-deployments', icon: Wallet, label: 'My Deployments' },
    { href: '/creator', icon: User, label: 'My Agents' },
    { href: '/docs', icon: FileText, label: 'Docs' },
    { href: '/create-agent', icon: Bot, label: 'Create Agent' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%]">
      <div className="relative rounded-full border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl shadow-black/50">
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-50 blur-xl -z-10" />
        
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <Link 
              href="/" 
              className="flex items-center gap-2 hover:opacity-90 transition-opacity group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full group-hover:bg-primary/50 transition-all" />
                <Bot className="h-8 w-8 text-primary relative z-10" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent">
                MAXXIT
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {/* Nav Items in Pill Container */}
              <div className="flex items-center gap-1 px-2 py-1 ">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={`
                          relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                          ${active 
                            ? 'text-white bg-primary shadow-lg shadow-primary/50' 
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                          }
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden lg:inline">{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>

              {/* Create Agent CTA */}
              {/* <Link href="/create-agent">
                <button
                  className={`
                    relative inline-flex items-center justify-center gap-2 px-5 py-2 ml-2 rounded-full text-sm font-semibold transition-all duration-300
                    ${isActive('/create-agent')
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-xl shadow-primary/50 scale-105'
                      : 'bg-gradient-to-r from-primary to-accent text-white hover:shadow-xl hover:shadow-primary/50 hover:scale-105'
                    }
                  `}
                >
                  <Bot className="h-4 w-4" />
                  <span>Create Agent</span>
                </button>
              </Link> */}

              {/* Wallet Connection */}
              {ready && (
                <div className="relative ml-2">
                  {authenticated ? (
                    <>
                      <button
                        ref={buttonRef}
                        onClick={() => setIsWalletModalOpen(!isWalletModalOpen)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-primary/30 bg-gradient-to-r from-primary to-accent text-white rounded-full text-sm font-semibold hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                      >
                        <Wallet className="h-4 w-4" />
                        <span className="font-mono">
                          {user?.wallet?.address ?
                            `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` :
                            'Wallet'}
                        </span>
                        <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isWalletModalOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Wallet Address Popup */}
                      {isWalletModalOpen && (
                        <div
                          ref={popupRef}
                          className="absolute right-0 top-full mt-3 w-80 z-50 rounded-2xl border border-white/10 bg-[#111111] backdrop-blur-2xl shadow-2xl"
                        >
                          <div className="p-5 space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary/20 rounded-xl">
                                  <Wallet className="h-4 w-4 text-primary" />
                                </div>
                                <h3 className="text-sm font-semibold text-white">Wallet Connected</h3>
                              </div>
                              <button
                                onClick={() => setIsWalletModalOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Address Display */}
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                              <p className="text-xs text-gray-400 mb-2 font-medium">Account Address</p>
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-mono text-xs break-all text-white leading-relaxed">
                                  {user?.wallet?.address || 'No address'}
                                </p>
                                <button
                                  onClick={async () => {
                                    if (user?.wallet?.address) {
                                      await navigator.clipboard.writeText(user.wallet.address);
                                      setCopied(true);
                                      setTimeout(() => setCopied(false), 2000);
                                    }
                                  }}
                                  className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110"
                                  title="Copy address"
                                >
                                  {copied ? (
                                    <Check className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Sign Out Button */}
                            <button
                              onClick={() => {
                                logout();
                                setIsWalletModalOpen(false);
                              }}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
                            >
                              <LogOut className="h-4 w-4" />
                              Log Out
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={login}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2 border border-primary/30 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                    >
                      <Wallet className="h-4 w-4" />
                      <span>Connect Wallet</span>
                    </button>
                  )}
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10">
            <nav className="flex flex-col p-4 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={`
                        w-full inline-flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${active 
                          ? 'text-white bg-primary shadow-lg shadow-primary/30' 
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  </Link>
                );
              })}

              {/* <Link href="/create-agent">
                <button
                  className={`
                    w-full inline-flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isActive('/create-agent')
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-xl shadow-primary/30'
                      : 'bg-gradient-to-r from-primary to-accent text-white hover:shadow-xl hover:shadow-primary/30'
                    }
                  `}
                >
                  <Bot className="h-5 w-5" />
                  <span>Create Agent</span>
                </button>
              </Link> */}

              {ready && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  {authenticated ? (
                    <>
                      <div className="mb-2 p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-gray-400 mb-1">Connected</p>
                        <p className="font-mono text-xs text-white">
                          {user?.wallet?.address ?
                            `${user.wallet.address.slice(0, 10)}...${user.wallet.address.slice(-8)}` :
                            'No address'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full inline-flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all duration-200 border border-red-500/20"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Log Out</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={login}
                      className="w-full inline-flex items-center gap-3 px-4 py-3 border border-primary/30 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-all duration-200"
                    >
                      <Wallet className="h-5 w-5" />
                      <span>Connect Wallet</span>
                    </button>
                  )}
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}