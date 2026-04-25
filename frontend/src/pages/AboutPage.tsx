import LandingLayout from '../components/LandingLayout';
import About from '../components/About';
import { motion } from 'motion/react';

export default function AboutPage() {
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
              Our <span className="text-orange-500">Story</span>
            </h1>
            <p className="text-gray-400 mt-6 max-w-2xl mx-auto text-lg">
              Learn about our journey, our mission, and why we are the best choice for your fitness goals.
            </p>
          </motion.div>
        </div>
        <About />
      </div>
    </LandingLayout>
  );
}
