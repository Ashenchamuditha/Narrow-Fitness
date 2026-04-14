export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  image: string;
  bio: string;
  socials: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  isPopular?: boolean;
}

export interface Class {
  id: string;
  name: string;
  trainerId: string;
  time: string;
  day: string;
  capacity: number;
  enrolled: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'member' | 'admin';
  membershipStatus: 'active' | 'inactive' | 'pending';
  planId?: string;
  joinedDate: string;
  workoutLog?: WorkoutLog[];
  dietLog?: DietLog[];
}

export interface WorkoutLog {
  id: string;
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface DietLog {
  id: string;
  date: string;
  meal: string;
  calories: number;
  protein: number;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  date: string;
  status: 'success' | 'failed' | 'pending';
  planId: string;
}
