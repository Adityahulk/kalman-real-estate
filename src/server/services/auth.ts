import bcrypt from "bcryptjs";
import { prisma } from "../db";
import { createSessionToken } from "../session";

export async function login(identifier: string, password: string) {
  const trimmed = identifier.trim();
  // A user can sign in with their email (case-insensitive) or their login ID. Login IDs
  // are matched case-insensitively too so "Dakshdod" and "dakshdod" both work.
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: trimmed.toLowerCase() },
        { loginId: { equals: trimmed, mode: "insensitive" } },
      ],
    },
    include: { tenant: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throwInvalidLogin();
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throwInvalidLogin();
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

function throwInvalidLogin(): never {
  const error = new Error("Invalid credentials");
  error.name = "UnauthorizedError";
  throw error;
}
