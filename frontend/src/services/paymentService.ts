import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = '/api';

export interface PayHerePayment {
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  custom_1: string; // userId
  custom_2: string; // packageId
}

declare const payhere: any;

export const startPayment = async (userId: number, pkg: any, user: any) => {
  try {
    const orderId = `ORDER_${Date.now()}`;
    const amount = Number(pkg.price).toFixed(2);
    const currency = 'LKR';

    // Fetch full profile to get phone number
    const profileRes = await axios.get(`${API_URL}/member/profile/${userId}`);
    const phone = profileRes.data?.phone || '0770000000';

    // 1. Get Hash from Backend
    const hashRes = await axios.post(`${API_URL}/payments/payhere/hash`, {
      order_id: orderId,
      amount,
      currency
    });

    const payment: PayHerePayment = {
      sandbox: true, // Set to false for production
      merchant_id: '1235459',
      return_url: `${window.location.origin}/member/payments?status=success`,
      cancel_url: `${window.location.origin}/member/payments?status=cancel`,
      notify_url: hashRes.data.notify_url, // Use public URL from backend (ngrok)
      order_id: orderId,
      items: pkg.name,
      amount: amount.toString(),
      currency: currency,
      hash: hashRes.data.hash,
      first_name: user.name.split(' ')[0],
      last_name: user.name.split(' ')[1] || 'User',
      email: user.email,
      phone: phone,
      address: 'Narrow Fitness Gym',
      city: 'Colombo',
      country: 'Sri Lanka',
      custom_1: userId.toString(),
      custom_2: pkg.id.toString()
    };

    payhere.onCompleted = function(orderId: string) {
      console.log("Payment completed. OrderID:" + orderId);
      window.location.href = '/member/payments?status=completed';
    };

    payhere.onDismissed = function() {
      console.log("Payment dismissed");
    };

    payhere.onError = function(error: string) {
      console.log("Error:"  + error);
    };

    payhere.startPayment(payment);

  } catch (error) {
    console.error("Payment Error:", error);
    toast.error("Could not initiate payment. Please try again.");
  }
};

export const recordCashPayment = async (userId: number, packageId: number, amountPaid: number) => {
  return axios.post(`${API_URL}/payments/manual-cash`, {
    userId,
    packageId,
    amountPaid
  });
};

export const identifyWallQRUser = async (email: string) => {
  return axios.post(`${API_URL}/payments/wall-qr/identify`, { email });
};
