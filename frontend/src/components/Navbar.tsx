import { useState, useEffect } from 'react';
import { Menu, X, LogIn, LayoutDashboard, User } from 'lucide-react'; // Added icons
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get user session data
  const userStr = localStorage.getItem('narrow_fitness_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Classes', path: '/classes' },
    { name: 'Trainers', path: '/trainers' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/90 backdrop-blur-md py-4 shadow-lg' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 overflow-hidden rounded-lg">
            <img 
              src="/logo.jpeg" 
              alt="Narrow Fitness Logo" 
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white uppercase italic">Narrow Fitness</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="text-sm font-semibold text-gray-300 hover:text-orange-500 transition-colors uppercase tracking-widest"
            >
              {link.name}
            </Link>
          ))}

          {/* --- SESSION LOGIC (Desktop) --- */}
          {user ? (
            <Link 
              to={user.role === 'admin' ? '/admin' : '/member'} 
              className="flex items-center gap-2 bg-white text-black hover:bg-orange-600 hover:text-white px-6 py-2 rounded-full font-bold transition-all transform hover:scale-105"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link 
              to="/auth" 
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-full font-bold transition-all transform hover:scale-105"
            >
              <LogIn className="w-4 h-4" />
              <span>Join Now</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-white">
            {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black border-t border-gray-800 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block text-lg font-bold text-gray-300 hover:text-orange-500 transition-colors uppercase"
                >
                  {link.name}
                </Link>
              ))}

              {/* --- SESSION LOGIC (Mobile) --- */}
              <div className="pt-4 border-t border-gray-900">
                {user ? (
                  <Link 
                    to={user.role === 'admin' ? '/admin' : '/member'} 
                    onClick={() => setIsOpen(false)} 
                    className="w-full flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Go to Dashboard</span>
                  </Link>
                ) : (
                  <Link 
                    to="/auth" 
                    onClick={() => setIsOpen(false)} 
                    className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl font-bold"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Join Elite Now</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}