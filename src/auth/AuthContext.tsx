import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CognitoUser,
  CognitoUserPool,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";
import { AWS_CONFIG } from "../config";

const userPool = new CognitoUserPool({
  UserPoolId: AWS_CONFIG.userPoolId,
  ClientId: AWS_CONFIG.userPoolClientId,
});

type AuthState = {
  isLoading: boolean;
  isSignedIn: boolean;
  idToken: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (details: SignUpDetails) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => void;
};

export type SignUpDetails = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  password: string;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pendingSignUp = useRef<{ email: string; password: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const applySession = (session: CognitoUserSession, username: string) => {
    const payload = session.getIdToken().payload;
    setIdToken(session.getIdToken().getJwtToken());
    setEmail(username);
    setFirstName(typeof payload.given_name === "string" ? payload.given_name : null);
    setLastName(typeof payload.family_name === "string" ? payload.family_name : null);
    setPhoneNumber(typeof payload.phone_number === "string" ? payload.phone_number : null);
  };

  const clearSession = () => {
    setIdToken(null);
    setEmail(null);
    setFirstName(null);
    setLastName(null);
    setPhoneNumber(null);
  };

  useEffect(() => {
    const syncSession = () => {
      const currentUser = userPool.getCurrentUser();
      if (!currentUser) {
        clearSession();
        setIsLoading(false);
        return;
      }

      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (!err && session?.isValid()) {
          applySession(session, currentUser.getUsername());
        } else {
          clearSession();
        }
        setIsLoading(false);
      });
    };

    syncSession();
    const sessionCheck = setInterval(syncSession, 5 * 60 * 1000);
    return () => clearInterval(sessionCheck);
  }, []);

  const signIn = (emailInput: string, password: string) =>
    new Promise<void>((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: emailInput, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: emailInput, Password: password });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          applySession(session, emailInput);
          resolve();
        },
        onFailure: (err) => reject(err),
      });
    });

  const signUp = ({ firstName: givenName, lastName: familyName, phoneNumber: phone, email: emailInput, password }: SignUpDetails) =>
    new Promise<void>((resolve, reject) => {
      const attributes = [
        new CognitoUserAttribute({ Name: "email", Value: emailInput }),
        new CognitoUserAttribute({ Name: "given_name", Value: givenName }),
        new CognitoUserAttribute({ Name: "family_name", Value: familyName }),
        new CognitoUserAttribute({ Name: "phone_number", Value: phone }),
      ];
      userPool.signUp(emailInput, password, attributes, [], (err) => {
        if (err) reject(err);
        else {
          pendingSignUp.current = { email: emailInput, password };
          resolve();
        }
      });
    });

  const confirmSignUp = (emailInput: string, code: string) =>
    new Promise<void>((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: emailInput, Pool: userPool });
      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(err);
          return;
        }

        const credentials = pendingSignUp.current;
        if (!credentials || credentials.email !== emailInput) {
          reject(new Error("Your account was verified, but the temporary sign-in session expired. Please sign in."));
          return;
        }

        signIn(emailInput, credentials.password)
          .then(() => {
            pendingSignUp.current = null;
            resolve();
          })
          .catch(reject);
      });
    });

  const signOut = () => {
    const currentUser = userPool.getCurrentUser();
    currentUser?.signOut();
    pendingSignUp.current = null;
    clearSession();
  };

  const value = useMemo(
    () => ({ isLoading, isSignedIn: !!idToken, idToken, email, firstName, lastName, phoneNumber, signIn, signUp, confirmSignUp, signOut }),
    [isLoading, idToken, email, firstName, lastName, phoneNumber]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
