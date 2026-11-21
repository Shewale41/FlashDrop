type AuthenticatedUser = {
  userId: string;
  email: string;
  role: "member" | "admin";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
