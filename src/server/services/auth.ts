import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { createSessionToken } from "../session";

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

  const token = await createSessionToken({
    id: user.id,
    tenantId: user.tenantId ?? "__unselected__",
    role: user.role,
    email: user.email,
  });

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
