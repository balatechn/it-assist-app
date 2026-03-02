import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        select: { name: true, email: true, role: true }
    })
    users.forEach(u => console.log(`${u.role.padEnd(14)} ${u.name} (${u.email})`))
}

main().then(() => process.exit(0))
