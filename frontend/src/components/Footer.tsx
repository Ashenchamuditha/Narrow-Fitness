import { Link } from 'react-router-dom'; // Added for internal navigation
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  MapPin, 
  Phone, 
  Mail, 
  ArrowRight 
} from 'lucide-react';
import { GYM_HOURS } from '../lib/gymHours';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  // Social links configuration
  const socialLinks = [
    { name: 'Instagram', Icon: Instagram, href: 'https://instagram.com/narrowfitness' },
    { name: 'Twitter', Icon: Twitter, href: 'https://twitter.com/narrowfitness' },
    { name: 'Facebook', Icon: Facebook, href: 'https://facebook.com/narrowfitness' },
    { name: 'Youtube', Icon: Youtube, href: 'https://youtube.com/narrowfitness' },
  ];

  // Legal links configuration
  const legalLinks = [
    { name: 'Privacy Policy', path: '/privacy' },
    { name: 'Terms of Service', path: '/terms' },
    { name: 'Cookie Policy', path: '/cookies' },
  ];

  return (
    <footer className="bg-black text-white pt-24 pb-12 overflow-hidden border-t border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          
          {/* Column 1: Brand & Desc */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-xl overflow-hidden p-1.5 shadow-lg shadow-orange-500/20">
                <img
                  src="/logo.jpeg"
                  alt="Narrow Fitness Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-3xl font-black tracking-tighter uppercase italic leading-none">
                Narrow<br/><span className="text-orange-500">Fitness</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs uppercase tracking-tight font-medium">
              Empowering individuals to reach their full potential through elite training, state-of-the-art facilities, and a supportive community.
            </p>
            <div className="flex gap-5">
              {socialLinks.map((item, i) => (
                <a 
                  key={i} 
                  href={item.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-500 transition-all group"
                  title={item.name}
                >
                  <item.Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-8 italic text-orange-500">Quick Links</h4>
            <ul className="space-y-4">
              {['Home', 'About Us', 'Trainers', 'Membership', 'Gallery', 'Contact'].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase().replace(' ', '')}`} className="text-xs text-gray-400 hover:text-white transition-colors font-black uppercase tracking-widest flex items-center gap-2 group">
                    <div className="w-1.5 h-px bg-orange-600 transition-all group-hover:w-4" />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Hours */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-8 italic text-orange-500">Opening Hours</h4>
            <ul className="space-y-4">
              {GYM_HOURS.map((item, idx) => (
                <li key={idx} className="flex flex-col gap-1 border-l-2 border-gray-900 pl-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.day}</span>
                  <span className="text-sm text-white font-bold">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Find Our Arena */}
          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-8 italic text-orange-500">Find Our Arena</h4>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-sm text-gray-400 font-bold leading-snug uppercase tracking-tight">
                  182/1/D Ganemulla Rd  , <br />
                  Sooriyagama, <br />
                  Kadawatha, Sri Lanka
                </p>
              </div>

              <div className="flex gap-4">
                <Phone className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-sm text-gray-400 font-bold uppercase">+94 11 234 5678</p>
              </div>

              <div className="flex gap-4">
                <Mail className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-sm text-gray-400 font-bold lowercase">hello@narrowfitness.lk</p>
              </div>

              <a 
                href="https://www.google.com/maps/place/Narrow+fitness+Gym+182%2F1%2FD+Ganemulla+Rd+Surriyagama+Kadawatha/@7.0248143,79.9571436,18.5z/data=!4m14!1m7!3m6!1s0x3ae2f900318f7329:0x30e54c98ba46dfb6!2sNarrow+fitness+Gym+182%2F1%2FD+Ganemulla+Rd+Surriyagama+Kadawatha!8m2!3d7.0247685!4d79.9571566!16s%2Fg%2F11wfk6tgyj!3m5!1s0x3ae2f900318f7329:0x30e54c98ba46dfb6!8m2!3d7.0247685!4d79.9571566!16s%2Fg%2F11wfk6tgyj?entry=ttu&g_ep=EgoyMDI2MDQxNS4wIKXMDSoASAFQAw%3D%3D" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all shadow-lg shadow-orange-600/10"
              >
                Get Directions <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
            &copy; {currentYear} Narrow Fitness Management • Sri Lanka. All rights reserved.
          </p>
          
          {/* UPDATED: Functional Policy Links */}
          <div className="flex flex-wrap justify-center gap-8">
            {legalLinks.map((item) => (
              <Link 
                key={item.name} 
                to={item.path} 
                className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}