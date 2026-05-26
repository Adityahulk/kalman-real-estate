import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "../db";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "development-secret-change-me");

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("Invalid login");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid login");
  }

  const token = await new SignJWT({
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    token,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
