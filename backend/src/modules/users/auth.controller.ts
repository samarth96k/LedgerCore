import { findUserByEmail, addNewUser } from "./auth.database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import { logger } from "../../common/config/logger.js";
import type { AddUserResult } from "./auth.types.js";
import type { Request, Response } from "express";

const createToken = (id: string, accountId: string,role:string) => {
  return jwt.sign({ id, accountId ,role}, process.env.JWT_SECRET!, {
    expiresIn: "15m",
  });
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.accounts.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No account is linked to this user. Please contact customer support.",
      });
    }

    // Currently every user has exactly one account
    const account = user.accounts.at(0);

    if (!account) {
      return res.status(400).json({
        success: false,
        message: "No account linked to this user.",
      });
    }

    const accountId = account.id;

    const token = createToken(user.id, accountId,user.role);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountId,
      },
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, accountId } = req.body;

    // Check existing email
    const exists = await findUserByEmail(email);

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "User already exists.",
      });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email.",
      });
    }

    // Validate password
    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, one number and one special character.",
      });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Database Operation
    const result: AddUserResult = await addNewUser(
      email,
      hashedPassword,
      name,
      accountId,
    );

    if (!result.success) {
      return res.status(409).json(result);
    }

    const token = createToken(result.user.id, accountId, result.user.role);

    return res.json({
      success: true,
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        accountId
      },
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};
