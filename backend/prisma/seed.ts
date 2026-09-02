// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data in dependency order
  await prisma.auditLog.deleteMany();
  await prisma.batchApproval.deleteMany();
  await prisma.resultBatch.deleteMany();
  await prisma.reviewItem.deleteMany();
  await prisma.uploadJob.deleteMany();
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

  // ============================================================
  // SYNTHETIC DEMO STUDENTS — all names are fictional
  // ============================================================
  const syntheticStudents = [
    { matricNumber: '2024/1001', firstName: 'Ade', lastName: 'Demo One' },
    { matricNumber: '2024/1002', firstName: 'Bisi', lastName: 'Demo Two' },
    { matricNumber: '2024/1003', firstName: 'Chidi', lastName: 'Demo Three' },
    { matricNumber: '2024/1004', firstName: 'Damilola', lastName: 'Demo Four' },
    { matricNumber: '2024/1005', firstName: 'Emeka', lastName: 'Demo Five' },
    { matricNumber: '2024/1006', firstName: 'Fatima', lastName: 'Demo Six' },
    { matricNumber: '2024/1007', firstName: 'Grace', lastName: 'Demo Seven' },
    { matricNumber: '2024/1008', firstName: 'Ibrahim', lastName: 'Demo Eight' },
    { matricNumber: '2024/1009', firstName: 'Jumoke', lastName: 'Demo Nine' },
    { matricNumber: '2024/1010', firstName: 'Kelechi', lastName: 'Demo Ten' },
    { matricNumber: '2024/1011', firstName: 'Latifat', lastName: 'Demo Eleven' },
    { matricNumber: '2024/1012', firstName: 'Musa', lastName: 'Demo Twelve' },
    { matricNumber: '2024/1013', firstName: 'Ngozi', lastName: 'Demo Thirteen' },
    { matricNumber: '2024/1014', firstName: 'Obinna', lastName: 'Demo Fourteen' },
    { matricNumber: '2024/1015', firstName: 'Peace', lastName: 'Demo Fifteen' },
    { matricNumber: '2024/1016', firstName: 'Rahman', lastName: 'Demo Sixteen' },
    { matricNumber: '2024/1017', firstName: 'Sade', lastName: 'Demo Seventeen' },
    { matricNumber: '2024/1018', firstName: 'Tunde', lastName: 'Demo Eighteen' },
    { matricNumber: '2024/1019', firstName: 'Uche', lastName: 'Demo Nineteen' },
  ];

  for (const student of syntheticStudents) {
    await prisma.student.create({
      data: {
        matricNumber: student.matricNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        currentLevel: 'LEVEL_100',
        admissionYear: 2024,
        isActive: true,
        departmentId: departmentHealthInformationManagement.id,
      },
    });
  }

  console.log('✅ Created students');
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
