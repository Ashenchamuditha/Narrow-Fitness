import React, { useState } from 'react';
import MemberLayout from '../components/MemberLayout';
import { Utensils, Plus, TrendingUp, Clock, Activity, ChevronRight, Apple, Coffee, Pizza } from 'lucide-react';
import { motion } from 'motion/react';

export default function MemberDiet() {
  const [meals, setMeals] = useState([
    { id: 1, name: 'Oatmeal with Blueberries', type: 'Breakfast', time: '08:00 AM', calories: 350, protein: 15, carbs: 55, fats: 8, icon: Coffee },
    { id: 2, name: 'Grilled Chicken Salad', type: 'Lunch', time: '01:30 PM', calories: 450, protein: 45, carbs: 15, fats: 22, icon: Apple },
    { id: 3, name: 'Protein Shake', type: 'Snack', time: '04:00 PM', calories: 200, protein: 30, carbs: 10, fats: 4, icon: Activity },
    { id: 4, name: 'Salmon & Quinoa', type: 'Dinner', time: '07:30 PM', calories: 550, protein: 40, carbs: 45, fats: 25, icon: Pizza },
  ]);

  const nutrition = [
    { label: 'Protein', value: 130, target: 180, color: 'bg-orange-500' },
    { label: 'Carbs', value: 125, target: 250, color: 'bg-blue-500' },
    { label: 'Fats', value: 59, target: 70, color: 'bg-purple-500' },
  ];

  return (
    <MemberLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Diet Tracker</h1>
          <p className="text-gray-500 font-medium tracking-tight">Monitor your daily nutrition and stay on track with your goals.</p>
        </div>
        <button className="flex items-center gap-2 bg-black text-white hover:bg-orange-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all transform hover:scale-105">
          <Plus className="w-4 h-4" />
          Add Meal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-black uppercase italic tracking-tighter mb-8">Daily Meals</h3>
            <div className="space-y-4">
              {meals.map((meal) => (
                <div key={meal.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-orange-200 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <meal.icon className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <div className="font-bold text-black uppercase tracking-tight">{meal.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{meal.type} • {meal.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center hidden sm:block">
                      <div className="text-sm font-black text-black">{meal.calories}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Kcal</div>
                    </div>
                    <div className="text-center hidden sm:block">
                      <div className="text-sm font-black text-orange-600">{meal.protein}g</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Protein</div>
                    </div>
                    <button className="p-2 rounded-lg bg-white border border-gray-200 text-gray-400 group-hover:text-orange-500 group-hover:border-orange-500 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-black uppercase italic tracking-tighter mb-8">Nutrition Summary</h3>
            <div className="space-y-8">
              {nutrition.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{item.label}</span>
                    <span className="text-xs font-bold text-black">{item.value}g / {item.target}g</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / item.target) * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 p-4 rounded-2xl bg-orange-50 border border-orange-100">
              <div className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Recommendation</div>
              <p className="text-xs text-orange-800 font-medium leading-relaxed">You've reached 72% of your protein goal. Keep it up!</p>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}
