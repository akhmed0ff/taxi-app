import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [totalUsers, bcryptUsers, legacyPbkdf2Users, missingPasswordUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { passwordHash: { startsWith: '$2' } },
      }),
      prisma.user.count({
        where: { passwordHash: { startsWith: 'pbkdf2$' } },
      }),
      prisma.user.count({
        where: { passwordHash: null },
      }),
    ]);

  console.log(
    JSON.stringify(
      {
        totalUsers,
        bcryptUsers,
        legacyPbkdf2Users,
        missingPasswordUsers,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
