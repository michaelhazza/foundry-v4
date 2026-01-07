import bcrypt from 'bcrypt';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, organizations, organizationMemberships } from './schema';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';

const SALT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Starting database seed...');

  const sql = neon(env.DATABASE_URL);
  const db = drizzle(sql);

  try {
    // Check if admin user already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@foundry.app'))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists, skipping seed');
      return;
    }

    // Create admin user
    const passwordHash = await bcrypt.hash('admin123!', SALT_ROUNDS);
    const [adminUser] = await db
      .insert(users)
      .values({
        email: 'admin@foundry.app',
        name: 'Platform Admin',
        passwordHash,
        isPlatformAdmin: true,
      })
      .returning();

    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Create demo organization
    const [demoOrg] = await db
      .insert(organizations)
      .values({
        name: 'Demo Organization',
      })
      .returning();

    console.log(`✅ Created demo organization: ${demoOrg.name}`);

    // Add admin to demo organization
    await db.insert(organizationMemberships).values({
      userId: adminUser.id,
      organizationId: demoOrg.id,
      role: 'admin',
    });

    console.log(`✅ Added admin to demo organization`);

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log(`   Email: admin@foundry.app`);
    console.log(`   Password: admin123!`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
