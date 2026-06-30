import UserModel, { UserDocument } from "../models/User";
import type { CreateUserDto } from "../types";

export async function createUser(userData: CreateUserDto): Promise<UserDocument> {
  return UserModel.create(userData);
}

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  return UserModel.findOne({ email: email.trim().toLowerCase() });
}

export async function findUserByGoogleId(googleId: string): Promise<UserDocument | null> {
  return UserModel.findOne({ googleId: googleId.trim() });
}

export async function findUserById(userId: string): Promise<UserDocument | null> {
  return UserModel.findById(userId.trim());
}
