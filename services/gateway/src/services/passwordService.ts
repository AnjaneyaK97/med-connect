import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export class PasswordService {
  public static async hash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  public static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
