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

  console.log('✅ Cleared existing data');

  // Create Faculties
  const facultyScience = await prisma.faculty.create({
    data: {
      name: 'Faculty of Science',
      code: 'SCI',
      description: 'Faculty of Natural and Applied Sciences',
    },
  });

  const facultyEngineering = await prisma.faculty.create({
    data: {
      name: 'Faculty of Engineering',
      code: 'ENG',
      description: 'Faculty of Engineering and Technology',
    },
  });

  console.log('✅ Created faculties');

  // Create Departments
  const deptComputerScience = await prisma.department.create({
    data: {
      name: 'Computer Science',
      code: 'CSC',
      description: 'Department of Computer Science',
      passMark: 40,
      facultyId: facultyScience.id,
    },
  });

  const deptMathematics = await prisma.department.create({
    data: {
      name: 'Mathematics',
      code: 'MTH',
      description: 'Department of Mathematics',
      passMark: 45,
      facultyId: facultyScience.id,
    },
  });

  const deptCivilEng = await prisma.department.create({
    data: {
      name: 'Civil Engineering',
      code: 'CVE',
      description: 'Department of Civil Engineering',
      passMark: 40,
      facultyId: facultyEngineering.id,
    },
  });

  console.log('✅ Created departments');

  // Create Users (HOD and DEAN)
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Dean for Science Faculty
  await prisma.user.create({
    data: {
      email: 'dean.science@university.edu.ng',
      password: hashedPassword,
      firstName: 'Adebayo',
      lastName: 'Ogundimu',
      role: UserRole.DEAN,
      facultyId: facultyScience.id,
    },
  });

  // Dean for Engineering Faculty
  await prisma.user.create({
    data: {
      email: 'dean.engineering@university.edu.ng',
      password: hashedPassword,
      firstName: 'Emeka',
      lastName: 'Nwosu',
      role: UserRole.DEAN,
      facultyId: facultyEngineering.id,
    },
  });

  // HOD for Computer Science
  await prisma.user.create({
    data: {
      email: 'hod.csc@university.edu.ng',
      password: hashedPassword,
      firstName: 'Chidinma',
      lastName: 'Okafor',
      role: UserRole.HOD,
      departmentId: deptComputerScience.id,
    },
  });

  // HOD for Mathematics
  await prisma.user.create({
    data: {
      email: 'hod.mth@university.edu.ng',
      password: hashedPassword,
      firstName: 'Ibrahim',
      lastName: 'Musa',
      role: UserRole.HOD,
      departmentId: deptMathematics.id,
    },
  });

  // HOD for Civil Engineering
  await prisma.user.create({
    data: {
      email: 'hod.cve@university.edu.ng',
      password: hashedPassword,
      firstName: 'Ngozi',
      lastName: 'Eze',
      role: UserRole.HOD,
      departmentId: deptCivilEng.id,
    },
  });

  console.log('✅ Created users');

  // Create Courses for Computer Science
  const cscCourses = [
    // 100 Level First Semester
    { code: 'CSC101', title: 'Introduction to Computer Science', unit: 3, level: Level.LEVEL_100, semester: Semester.FIRST },
    { code: 'CSC103', title: 'Introduction to Programming', unit: 3, level: Level.LEVEL_100, semester: Semester.FIRST },
    { code: 'MTH101', title: 'Elementary Mathematics I', unit: 3, level: Level.LEVEL_100, semester: Semester.FIRST },
    { code: 'PHY101', title: 'General Physics I', unit: 3, level: Level.LEVEL_100, semester: Semester.FIRST },
    { code: 'GST101', title: 'Use of English I', unit: 2, level: Level.LEVEL_100, semester: Semester.FIRST },
    
    // 100 Level Second Semester
    { code: 'CSC102', title: 'Introduction to Problem Solving', unit: 3, level: Level.LEVEL_100, semester: Semester.SECOND },
    { code: 'CSC104', title: 'Programming Fundamentals', unit: 3, level: Level.LEVEL_100, semester: Semester.SECOND },
    { code: 'MTH102', title: 'Elementary Mathematics II', unit: 3, level: Level.LEVEL_100, semester: Semester.SECOND },
    { code: 'PHY102', title: 'General Physics II', unit: 3, level: Level.LEVEL_100, semester: Semester.SECOND },
    { code: 'GST102', title: 'Use of English II', unit: 2, level: Level.LEVEL_100, semester: Semester.SECOND },

    // 200 Level First Semester
    { code: 'CSC201', title: 'Computer Programming I', unit: 3, level: Level.LEVEL_200, semester: Semester.FIRST },
    { code: 'CSC203', title: 'Discrete Structures', unit: 3, level: Level.LEVEL_200, semester: Semester.FIRST },
    { code: 'CSC205', title: 'Operating Systems I', unit: 3, level: Level.LEVEL_200, semester: Semester.FIRST },
    { code: 'MTH201', title: 'Mathematical Methods I', unit: 3, level: Level.LEVEL_200, semester: Semester.FIRST },
    { code: 'STA201', title: 'Statistics for Scientists', unit: 3, level: Level.LEVEL_200, semester: Semester.FIRST },

    // 200 Level Second Semester
    { code: 'CSC202', title: 'Computer Programming II', unit: 3, level: Level.LEVEL_200, semester: Semester.SECOND },
    { code: 'CSC204', title: 'Data Structures', unit: 3, level: Level.LEVEL_200, semester: Semester.SECOND },
    { code: 'CSC206', title: 'Operating Systems II', unit: 3, level: Level.LEVEL_200, semester: Semester.SECOND },
    { code: 'CSC208', title: 'Database Management Systems', unit: 3, level: Level.LEVEL_200, semester: Semester.SECOND },
    { code: 'MTH202', title: 'Mathematical Methods II', unit: 3, level: Level.LEVEL_200, semester: Semester.SECOND },

    // 300 Level First Semester
    { code: 'CSC301', title: 'Software Engineering I', unit: 3, level: Level.LEVEL_300, semester: Semester.FIRST },
    { code: 'CSC303', title: 'Computer Architecture', unit: 3, level: Level.LEVEL_300, semester: Semester.FIRST },
    { code: 'CSC305', title: 'Algorithms and Complexity', unit: 3, level: Level.LEVEL_300, semester: Semester.FIRST },
    { code: 'CSC307', title: 'Web Development', unit: 3, level: Level.LEVEL_300, semester: Semester.FIRST },
    { code: 'CSC309', title: 'Computer Networks I', unit: 3, level: Level.LEVEL_300, semester: Semester.FIRST },

    // 300 Level Second Semester
    { code: 'CSC302', title: 'Software Engineering II', unit: 3, level: Level.LEVEL_300, semester: Semester.SECOND },
    { code: 'CSC304', title: 'Artificial Intelligence', unit: 3, level: Level.LEVEL_300, semester: Semester.SECOND },
    { code: 'CSC306', title: 'Theory of Computing', unit: 3, level: Level.LEVEL_300, semester: Semester.SECOND },
    { code: 'CSC308', title: 'Computer Networks II', unit: 3, level: Level.LEVEL_300, semester: Semester.SECOND },
    { code: 'CSC310', title: 'Information Security', unit: 3, level: Level.LEVEL_300, semester: Semester.SECOND },

    // 400 Level First Semester
    { code: 'CSC401', title: 'Computer Graphics', unit: 3, level: Level.LEVEL_400, semester: Semester.FIRST },
    { code: 'CSC403', title: 'Compiler Construction', unit: 3, level: Level.LEVEL_400, semester: Semester.FIRST },
    { code: 'CSC405', title: 'Machine Learning', unit: 3, level: Level.LEVEL_400, semester: Semester.FIRST },
    { code: 'CSC407', title: 'Research Methodology', unit: 2, level: Level.LEVEL_400, semester: Semester.FIRST },
    { code: 'CSC499', title: 'Final Year Project I', unit: 3, level: Level.LEVEL_400, semester: Semester.FIRST },

    // 400 Level Second Semester
    { code: 'CSC402', title: 'Human Computer Interaction', unit: 3, level: Level.LEVEL_400, semester: Semester.SECOND },
    { code: 'CSC404', title: 'Distributed Systems', unit: 3, level: Level.LEVEL_400, semester: Semester.SECOND },
    { code: 'CSC406', title: 'Cloud Computing', unit: 3, level: Level.LEVEL_400, semester: Semester.SECOND },
    { code: 'CSC498', title: 'Final Year Project II', unit: 6, level: Level.LEVEL_400, semester: Semester.SECOND },
  ];

  for (const course of cscCourses) {
    await prisma.course.create({
      data: {
        ...course,
        departmentId: deptComputerScience.id,
      },
    });
  }

  console.log('✅ Created courses');

  // Create Sample Students
  const students = [
    { matricNumber: 'CSC/2020/001', firstName: 'Oluwaseun', lastName: 'Adeyemi', middleName: 'David', currentLevel: Level.LEVEL_400 },
    { matricNumber: 'CSC/2020/002', firstName: 'Chioma', lastName: 'Okwu', middleName: 'Grace', currentLevel: Level.LEVEL_400 },
    { matricNumber: 'CSC/2020/003', firstName: 'Abdullahi', lastName: 'Mohammed', middleName: null, currentLevel: Level.LEVEL_400 },
    { matricNumber: 'CSC/2021/001', firstName: 'Blessing', lastName: 'Okonkwo', middleName: 'Ada', currentLevel: Level.LEVEL_300 },
    { matricNumber: 'CSC/2021/002', firstName: 'Yusuf', lastName: 'Bello', middleName: 'Isa', currentLevel: Level.LEVEL_300 },
    { matricNumber: 'CSC/2022/001', firstName: 'Temitope', lastName: 'Johnson', middleName: null, currentLevel: Level.LEVEL_200 },
    { matricNumber: 'CSC/2022/002', firstName: 'Amara', lastName: 'Nnamdi', middleName: 'Joy', currentLevel: Level.LEVEL_200 },
    { matricNumber: 'CSC/2023/001', firstName: 'Samuel', lastName: 'Obi', middleName: 'Chukwuma', currentLevel: Level.LEVEL_100 },
    { matricNumber: 'CSC/2023/002', firstName: 'Fatima', lastName: 'Abubakar', middleName: null, currentLevel: Level.LEVEL_100 },
    { matricNumber: 'CSC/2023/003', firstName: 'Emmanuel', lastName: 'Oladipo', middleName: 'Kehinde', currentLevel: Level.LEVEL_100 },
  ];

  for (const student of students) {
    const admissionYear = parseInt(student.matricNumber.split('/')[1]);
    await prisma.student.create({
      data: {
        ...student,
        email: `${student.matricNumber.replace(/\//g, '.').toLowerCase()}@student.university.edu.ng`,
        admissionYear,
        departmentId: deptComputerScience.id,
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