import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

/**
 * Signs and generates a JSON Web Token.
 */
export const generateToken = (
  payload: object,
  secret: string,
  expiresIn: string | number
): string => {
  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };
  return jwt.sign(payload, secret, options);
};

/**
 * Cryptographically verifies and unpacks a JSON Web Token.
 */
export const verifyToken = <T extends JwtPayload = JwtPayload>(
  token: string,
  secret: string
): T => {
  return jwt.verify(token, secret) as T;
};

export default {
  generateToken,
  verifyToken,
};
