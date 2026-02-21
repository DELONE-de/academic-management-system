// src/services/student.service.ts

import { Level } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import { CreateStudentInput, UpdateStudentInput } from '../validators/student.validator.js';

export class StudentService {
  /**
   * Creates a new student
   */
  async create(input: CreateStudentInput): Promise<any> {
    // Check if matric number already exists
    const existing = await prisma.student.findUnique({
      where: { matricNumber: input.matricNumber },
    });

    if (existing) {
      throw new AppError('Matriculation number already exists', 400);
    }

    const student = await prisma.student.create({
      data: input,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return student;
  }

  /**
   * Gets all students with filtering and pagination
   */
  async findAll(params: {
    departmentId?: string;
    level?: Level;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ students: any[]; total: number }> {
    const { departmentId, level, page = 1, limit = 50, search } = params;

    const where: any = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (level) {
      where.currentLevel = level;
    }

    if (search) {
      where.OR = [
        { matricNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { matricNumber: 'asc' },
      }),
      prisma.student.count({ where }),
    ]);

    return { students, total };
  }

  /**
   * Gets a student by ID with all details
   */
  async findById(id: string): Promise<any> {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        department: {
          include: {
            faculty: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        results: {
          include: {
            course: true,
          },
          orderBy: [{ level: 'asc' }, { semester: 'asc' }],
        },
        semesterGpas: {
          orderBy: [{ level: 'asc' }, { semester: 'asc' }],
        },
      },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    return student;
  }

  /**
   * Updates a student
   */
  async update(id: string, input: UpdateStudentInput): Promise<any> {
    const existing = await prisma.student.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Student not found', 404);
    }

    // Check for duplicate matric number
    if (input.matricNumber && input.matricNumber !== existing.matricNumber) {
      const duplicate = await prisma.student.findUnique({
        where: { matricNumber: input.matricNumber },
      });

      if (duplicate) {
        throw new AppError('Matriculation number already exists', 400);
      }
    }

    const student = await prisma.student.update({
      where: { id },
      data: input,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return student;
  }

  /**
   * Deletes a student and all related records
   */
  async delete(id: string): Promise<void> {
    const existing = await prisma.student.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Student not found', 404);
    }

    await prisma.student.delete({
      where: { id },
    });
  }

  /**
   * Gets students by department, level, and semester
   */
  async getByDepartmentLevelSemester(
    departmentId: string,
    level: Level
  ): Promise<any[]> {
    const students = await prisma.student.findMany({
      where: {
        departmentId,
        currentLevel: level,
        isActive: true,
      },
      orderBy: { matricNumber: 'asc' },
    });

    return students;
  }
}

export const studentService = new StudentService();