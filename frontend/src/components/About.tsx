import { motion } from 'motion/react';
import { Target, Zap, Shield, Users } from 'lucide-react';

export default function About() {
  const features = [
    {
      icon: <Target className="w-8 h-8 text-orange-500" />,
      title: 'Personalized Training',
      description: 'Our expert trainers create custom workout plans tailored to your specific goals and fitness level.',
    },
    {
      icon: <Zap className="w-8 h-8 text-orange-500" />,
      title: 'Modern Equipment',
      description: 'Access the latest state-of-the-art fitness technology and high-performance training gear.',
    },
    {
      icon: <Shield className="w-8 h-8 text-orange-500" />,
      title: 'Safe Environment',
      description: 'We prioritize your health and safety with rigorous cleaning protocols and professional supervision.',
    },
    {
      icon: <Users className="w-8 h-8 text-orange-500" />,
      title: 'Community Focus',
      description: 'Join a supportive community of fitness enthusiasts who motivate and inspire each other.',
    },
  ];

  return (
    <section id="about" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80&w=1000"
                alt="Gym Interior"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-orange-500 rounded-2xl -z-0 hidden md:block" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-4 border-black rounded-2xl -z-10 translate-x-4 translate-y-4 hidden md:block" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <span className="text-orange-600 font-black uppercase tracking-widest mb-4 block">Our Story</span>
            <h2 className="text-4xl md:text-5xl font-black text-black leading-tight uppercase italic tracking-tighter mb-8">
              More Than Just A <span className="text-orange-500">Gym</span>
            </h2>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">
              Founded in 2010, Narrow Fitness has been the cornerstone of fitness excellence. We believe that everyone has the potential to achieve greatness, and we provide the tools, guidance, and environment to make it happen.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {features.map((feature, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-black uppercase tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
