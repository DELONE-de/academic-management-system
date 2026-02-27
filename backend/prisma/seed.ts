// prisma/seed.ts

import { PrismaClient, UserRole } from '@prisma/client';
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

  const departmentOptometry = await prisma.department.create({
    data: {
      name: 'Optometry',
      code: 'OPT',
      description: 'Department of Optometry',
      passMark: 50,
      facultyId: facultybms.id,
    },
  });

  const departmentAnatomy = await prisma.department.create({
    data: {
      name: 'Anatomy',
      code: 'ANA',
      description: 'Department of Anatomy',
      passMark:40,
      facultyId: facultybms.id,
    },
  });

  const departmentPhysiology = await prisma.department.create({
    data: {
      name: 'Physiology',
      code: 'PHY',
      description: 'Department of Physiology',
      passMark:40,
      facultyId: facultybms.id,
    },
  });

  const departmentPhysiotherapy = await prisma.department.create({
    data: {
      name: 'Physiotherapy',
      code: 'PHT',
      description: 'Department of Physiotherapy',
      passMark: 50,
      facultyId: facultybms.id,
    },
  });

  const departmentDentalTherapy = await prisma.department.create({
    data: {
      name: 'Dental Therapy',
      code: 'DEN',
      description: 'Department of Dental Therapy',
      passMark: 40,
      facultyId: facultybms.id,
    },
  });

  const departmentDentalTechnology = await prisma.department.create({
    data: {
      name: 'Dental Technology',
      code: 'DET',
      description: 'Department of Dental Technology',
      passMark:40,
      facultyId: facultybms.id,
    },
  });

  const departmentRadiography = await prisma.department.create({
    data: {
      name: 'Radiography',
      code: 'RAD',
      description: 'Department of Radiography',
      passMark:40,
      facultyId: facultybms.id,
    },
  });

  const departmentNutritionDietary = await prisma.department.create({
    data: {
      name: 'Nutrition and Dietary',
      code: 'NUD',
      description: 'Department of Nutrition and Dietary',
      passMark:40,
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
