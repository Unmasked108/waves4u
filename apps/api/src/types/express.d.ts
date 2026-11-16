export {};
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'user' | 'admin';
        /** Has any active paid plan (or is an admin). */
        isPremium: boolean;
        /** Has an active waves4u club plan (or is an admin). */
        isClub: boolean;
        /** Trade-with-us segments the user is subscribed to. */
        segments: string[];
        /** Logged in with a 2FA code in this session. */
        mfa: boolean;
      };
    }
  }
}
