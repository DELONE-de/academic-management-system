// prisma/seed.ts

import { PrismaClient, UserRole, Level, Semester } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.result.deleteMany();
  await prisma.semesterGPA.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.faculty.deleteMany();


const facultybms = await prisma.faculty.create({
    data: {
      name: 'Basic Medical Sciences',
      code: 'BMS',
      description: 'Faculty of Basic Medical Sciences',
    },
  });

const departmentHealthInformatioManagement = await prisma.department.create({
  data: {
    name: 'Health Information Management',
    code: 'HIM',
    description: 'Department of Health Information Management',
    passMark: 40,
    facultyId: facultybms.id,
    },
  });

  const departmentInformationThecnologyHealthInformatics = await prisma.department.create({
    data: {
      name: 'Information Technology and Health Informatics',
      code: 'ITH',
      description: 'Department of Information Technology and Health Informatics',
      passMark: 40,
      facultyId: facultybms.id,
    },
  });

  console.log('✅ Created departments and falculty');

 // Create Users (HOD and DEAN)
 const hashedPassword = await bcrypt.hash('password123', 10);

  // Dean for BMS Faculty
  await prisma.user.create({
    data: {
      email: 'dean.science@university.edu.ng',
      password: hashedPassword,
      firstName: 'Adebayo',
      lastName: 'Ogundimu',
      role: UserRole.DEAN,
      facultyId: facultybms.id,
    },
  });

   // HOD for  Health Information Management
  await prisma.user.create({
    data: {
      email: 'hod.him@university.edu.ng',
      password: hashedPassword,
      firstName: 'Chidinma',
      lastName: 'Okafor',
      role: UserRole.HOD,
      departmentId: departmentHealthInformatioManagement.id,
    },
  });

  // Same HOD for Information Technology and Health Informatics (different login)
  await prisma.user.create({
    data: {
      email: 'hod.ith@university.edu.ng',
      password: hashedPassword,
      firstName: 'Chidinma',
      lastName: 'Okafor',
      role: UserRole.HOD,
      departmentId: departmentInformationThecnologyHealthInformatics.id,
    },
  });

  console.log('✅ Created users');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
