import LandingLayout from '../components/LandingLayout';
import Classes from '../components/Classes';
import { motion } from 'motion/react';

export default function ClassesPage() {
  return (
    <LandingLayout>
      <div className="pt-24">
        <div className="bg-gray-900 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4"
          >
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter">
              Class <span className="text-orange-500">Schedule</span>
            </h1>
            <p className="text-gray-400 mt-6 max-w-2xl mx-auto text-lg">
              Find the perfect time to sweat and crush your goals.
            </p>
          </motion.div>
        </div>
        <Classes />
      </div>
    </LandingLayout>
  );
}
