import Razorpay from 'razorpay';
import { env } from '../config.js';

let client: Razorpay | undefined;
export const razorpay = () => (client ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET }));
