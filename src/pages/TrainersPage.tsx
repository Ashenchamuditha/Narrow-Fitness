import LandingLayout from '../components/LandingLayout';
import Trainers from '../components/Trainers';
import { motion } from 'framer-motion';

export default function TrainersPage() {
  return (
    <LandingLayout>
      {/* 
          1. The outer div is bg-black. 
          This ensures the area behind your fixed Navbar stays dark 
          so the Navbar looks "as previous".
      */}
      <div className="pt-24 bg-black">
        
        {/* 
            2. The White Section starts here.
            Added rounded-t-[3rem] for a premium "overlap" effect.
        */}
        <div className="bg-white min-h-screen rounded-t-[3rem] overflow-hidden">
          
          {/* HEADER SECTION: Now Pure White */}
          <div className="py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto px-4"
            >
              {/* Narrow Fitness Elite Tag */}
              <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-[10px] mb-4 block">
                Narrow Fitness Elite
              </span>

              {/* Elite Guide Title */}
              <h1 className="text-5xl md:text-8xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                Elite <span className="text-orange-600">Guide</span>
              </h1>

              {/* Subtext */}
              <p className="text-gray-600 mt-8 max-w-2xl mx-auto text-lg font-medium leading-relaxed">
                Our world-class instructors are dedicated to your transformation.
              </p>
              
              <div className="mt-10 w-12 h-1 bg-slate-100 mx-auto rounded-full" />
            </motion.div>
          </div>

          {/* The Trainers component continues the white background */}
          <Trainers />
        </div>
      </div>
    </LandingLayout>
  );
}