import { findUserByEmail, addNewUser } from "./auth.database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import { logger } from "../../common/config/logger.js";

const createToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: "15m" });
};

export const loginUser = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ success: false });
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (isMatch) {
      const token = createToken(user.id);
      console.log(token + user);
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } else {
      res.json({ success: false, message: "Invalid Credentials" });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const registerUser = async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;
    //checking user already exists or not
    const exists = await findUserByEmail(email);
    if (exists) {
      return res.json({ success: false, message: "User Already Exists" });
    }
    //validate email forward and strong password
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email.",
      });
    }
    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      return res.json({
        success: false,
        message:
          "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }
    //Hashing User Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await addNewUser(email, hashedPassword, name);
    const token = createToken(user.id);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(error);
  }
};
