import request from "supertest";
import app from "../../src/app";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const TEST_PASSWORD = "TestPass123!";

export async function createTestUser(email: string, role: Role = Role.REQUESTER) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, mustChangePassword: false, isActive: true, role },
    create: {
      name: email.split("@")[0],
      email,
      passwordHash,
      role,
      mustChangePassword: false,
      isActive: true,
    },
  });
  return user;
}

export async function loginAgent(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: TEST_PASSWORD });
  return agent;
}