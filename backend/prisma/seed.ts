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

  const departmentHealthInformationManagement = await prisma.department.create({
    data: {
      name: 'Health Information Management',
      code: 'HIM',
      description: 'Department of Health Information Management',
      passMark: 40,
      facultyId: facultybms.id,
    },
  });

  const departmentInformationTechnologyHealthInformatics = await prisma.department.create({
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
      passMark: 40,
      facultyId: facultybms.id,
    },
  });

  const departmentPhysiology = await prisma.department.create({
    data: {
      name: 'Physiology',
      code: 'PHY',
      description: 'Department of Physiology',
      passMark: 40,
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
      passMark: 40,
      facultyId: facultybms.id,
    },
  });

  const departmentRadiography = await prisma.department.create({
    data: {
      name: 'Radiography',
      code: 'RAD',
      description: 'Department of Radiography',
      passMark: 40,
      facultyId: facultybms.id,
    },
  });

  const departmentNutritionDietary = await prisma.department.create({
    data: {
      name: 'Nutrition and Dietary',
      code: 'NUD',
      description: 'Department of Nutrition and Dietary',
      passMark: 40,
      facultyId: facultybms.id,
    },
  });

  console.log('✅ Created departments and faculty');

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

  console.log('🌱 Creating courses...');

  // Health Information Management Department Courses - LEVEL 100 FIRST SEMESTER
  await prisma.course.create({
    data: {
      code: 'BIO 101',
      title: 'Biology',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'BIO 107',
      title: 'Biology Practical',
      unit: 1,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'CHM 101',
      title: 'Chemistry',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'CHM 107',
      title: 'Chemistry Practical',
      unit: 1,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'COS 101',
      title: 'Computer in Society',
      unit: 3,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'FRE 199',
      title: 'Introduction to French',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'GST 111',
      title: 'Use of English',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'LIS 199',
      title: 'Use of Library',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'MTH 101',
      title: 'Mathematics',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'PHY 101',
      title: 'Physics',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'PHY 107',
      title: 'Physics Practical',
      unit: 1,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'STA 111',
      title: 'Introduction to Statistics',
      unit: 3,
      level: 'LEVEL_100',
      semester: 'FIRST',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  // LEVEL 100 SECOND SEMESTER
  await prisma.course.create({
    data: {
      code: 'BIO 102',
      title: 'Biology',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'SECOND',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'BIO 108',
      title: 'Biology Practical',
      unit: 1,
      level: 'LEVEL_100',
      semester: 'SECOND',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'CHM 102',
      title: 'Chemistry',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'SECOND',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'CHM 108',
      title: 'Chemistry Practical',
      unit: 1,
      level: 'LEVEL_100',
      semester: 'SECOND',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'GST 112',
      title: 'Nigerian Peoples and Culture',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'SECOND',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'MTH 102',
      title: 'Mathematics',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'SECOND',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'PHY 102',
      title: 'Physics',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'SECOND',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'PHY 108',
      title: 'Physics Practical',
      unit: 1,
      level: 'LEVEL_100',
      semester: 'SECOND',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.course.create({
    data: {
      code: 'COS 194',
      title: 'Introduction to Computer',
      unit: 2,
      level: 'LEVEL_100',
      semester: 'SECOND',
      isElective: false,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  console.log('✅ Created courses');

  // Health Information Management Students - LEVEL 100, Admission Year 2024
  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/1813',
      firstName: 'Alawode',
      lastName: 'Adebusola Peace',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/3272',
      firstName: 'Nurudeen',
      lastName: 'Aishat Olanike',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/1842',
      firstName: 'Abdulazeez',
      lastName: 'Aishat Wuraola',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/0715',
      firstName: 'Uwedone',
      lastName: 'Bose Gloria',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/1916',
      firstName: 'Igbelleh',
      lastName: 'Daniella',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/0276',
      firstName: 'Akinlade',
      lastName: 'Dolapo Anointed',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/3426',
      firstName: 'Adekanmi',
      lastName: 'Folasade Oluwadarasimi',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/2231',
      firstName: 'Aderinto',
      lastName: 'hikmoh Adekemi',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/1473',
      firstName: 'Alimi',
      lastName: 'Isiamiat Omolara',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/0321',
      firstName: 'Sunday',
      lastName: 'Mary Funmilayo',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/1850',
      firstName: 'Iehunwa',
      lastName: 'Mercy Olayemi',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/2170',
      firstName: 'Olanite',
      lastName: 'Nafisat Eniola',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/2943',
      firstName: 'Ayetimiyi',
      lastName: 'Oladuni Esther',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/3036',
      firstName: 'Dada',
      lastName: 'Oluwanifemi Oluwabukunmi',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/1474',
      firstName: 'Oyewole',
      lastName: 'Opeyemi Elizabeth',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/1862',
      firstName: 'Adetula',
      lastName: 'Praises Adewura',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/1295',
      firstName: 'Adebiyi',
      lastName: 'PraiseGod Ibukunoluwa',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/3268',
      firstName: 'Oyeleye',
      lastName: 'Tobiloba Olamide',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  await prisma.student.create({
    data: {
      matricNumber: 'HIM/2024/0859',
      firstName: 'Akinmoladun',
      lastName: 'Yosola Precoius',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      isActive: true,
      departmentId: departmentHealthInformationManagement.id,
    },
  });

  console.log('✅ Created students');
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
