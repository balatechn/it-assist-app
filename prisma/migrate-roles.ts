/**
 * One-time migration script: Migrate old role enum to new role system
 * Old: ADMIN, PROJECT_MANAGER, TEAM_MEMBER, VIEWER
 * New: EMPLOYEE, MANAGER, MANAGEMENT, ADMIN, SUPER_ADMIN
 * 
 * Mapping:
 *   ADMIN -> SUPER_ADMIN
 *   PROJECT_MANAGER -> MANAGER
 *   TEAM_MEMBER -> EMPLOYEE
 *   VIEWER -> EMPLOYEE
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🔄 Starting role migration...")

    // Step 1: Add new enum values
    console.log("  Adding new enum values...")
    await prisma.$executeRawUnsafe(`
        ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EMPLOYEE';
    `)
    await prisma.$executeRawUnsafe(`
        ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
    `)
    await prisma.$executeRawUnsafe(`
        ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGEMENT';
    `)
    await prisma.$executeRawUnsafe(`
        ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
    `)

    // Step 2: Migrate existing data
    console.log("  Migrating user roles...")
    
    // ADMIN -> SUPER_ADMIN
    const adminCount = await prisma.$executeRawUnsafe(`
        UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';
    `)
    console.log(`    ADMIN -> SUPER_ADMIN: ${adminCount} users`)

    // PROJECT_MANAGER -> MANAGER
    const pmCount = await prisma.$executeRawUnsafe(`
        UPDATE "User" SET role = 'MANAGER' WHERE role = 'PROJECT_MANAGER';
    `)
    console.log(`    PROJECT_MANAGER -> MANAGER: ${pmCount} users`)

    // TEAM_MEMBER -> EMPLOYEE
    const tmCount = await prisma.$executeRawUnsafe(`
        UPDATE "User" SET role = 'EMPLOYEE' WHERE role = 'TEAM_MEMBER';
    `)
    console.log(`    TEAM_MEMBER -> EMPLOYEE: ${tmCount} users`)

    // VIEWER -> EMPLOYEE
    const viewerCount = await prisma.$executeRawUnsafe(`
        UPDATE "User" SET role = 'EMPLOYEE' WHERE role = 'VIEWER';
    `)
    console.log(`    VIEWER -> EMPLOYEE: ${viewerCount} users`)

    // Step 3: Change default
    console.log("  Updating default value...")
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'EMPLOYEE';
    `)

    // Step 4: Remove old enum values by recreating the enum
    // PostgreSQL doesn't support DROP VALUE, so we recreate the enum
    console.log("  Removing old enum values...")
    
    // Create new enum type
    await prisma.$executeRawUnsafe(`CREATE TYPE "Role_new" AS ENUM ('EMPLOYEE', 'MANAGER', 'MANAGEMENT', 'ADMIN', 'SUPER_ADMIN');`)
    
    // Remove default temporarily
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;`)
    
    // Change column type
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN role TYPE "Role_new" USING role::text::"Role_new";`)
    
    // Drop old enum and rename
    await prisma.$executeRawUnsafe(`DROP TYPE "Role";`)
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role_new" RENAME TO "Role";`)
    
    // Re-add default
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'EMPLOYEE';`)

    console.log("✅ Role migration complete!")
    
    // Print current role distribution
    const users = await prisma.user.findMany({
        select: { name: true, email: true, role: true },
        orderBy: { role: "asc" }
    })
    console.log("\nCurrent users and roles:")
    users.forEach(u => console.log(`  ${u.role.padEnd(12)} ${u.name} (${u.email})`))
}

main()
    .catch(e => {
        console.error("❌ Migration failed:", e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
