import UserModel, { UserDocument } from "../models/User";
import type { CreateUserDto } from "../types";

export async function createUser(userData: CreateUserDto): Promise<UserDocument> {
  return UserModel.create(userData);
}

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  return UserModel.findOne({ email: email.trim().toLowerCase() });
}
