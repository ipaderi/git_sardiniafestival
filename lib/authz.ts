import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** The database is authoritative for active status and role; JWT data can be stale. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true, isActive: true, sessionVersion: true },
  });
  if (!currentUser?.isActive || currentUser.sessionVersion !== (session.user.sessionVersion ?? 0)) return null;

  return {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    image: currentUser.image,
    role: currentUser.role,
  };
}

export async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") return null;
  return currentUser;
}
